// Reading statistics and a vocabulary loop for busahin.com/reading, at
// https://busahin.com/api/reading. The e-reader syncs only to CrossPoint Sync,
// which stays the system of record; every thirty minutes a cron pulls what it
// knows into D1 and derives the rest. Nothing here depends on the reader's
// plugin events. Workers free plan, D1 and Workers AI: running out of the daily
// allowance ends in an error, never a charge.
//
// Public:  GET  /api/reading/summary   streak, activity, books in progress and finished
//          GET  /api/reading/today     the day and the streak (with the token: word of the day too)
// Private (Authorization: Bearer READING_TOKEN), the vocabulary side:
//          GET  /api/reading/cards.csv Anki import of the vocabulary
//          GET  /api/reading/sentences clipped sentences with translations
//          POST /api/reading/review    {"term", "grade": "good" | "again"}
//          POST /api/reading/sync      pull from CrossPoint Sync now
//          GET  /api/reading/books     every book and the title the public page shows for it, if any
//          POST /api/reading/books     {"document", "hidden"?: bool, "title"?: string | null}
const SITE = "https://busahin.com";
const ORIGINS = new Set([SITE, "http://localhost:4321"]);
const TZ = "Europe/Istanbul";
// Date#getTimezoneOffset() for Istanbul, which the Sync API takes as `tz`.
// Turkey has stayed on UTC+3 all year since 2016.
const TZ_OFFSET = -180;
const MORNING = "0 5 * * *"; // 08:00 in Istanbul; the other cron is the pull.

// Leitner: a card in box n comes back after INTERVALS[n - 1] days. A right
// answer moves it up a box, a wrong one sends it back to box 1. A word is
// "learned" once it reaches the last box.
const INTERVALS = [1, 2, 4, 8, 16];
const LEARNED = INTERVALS.length;

const PACE_WINDOW = 14; // days of reading a book's pace is measured over
const TRANSLATE_PER_RUN = 10;
const TRANSLATE_PER_DAY = 40;
const MODEL = "@cf/meta/m2m100-1.2b";
const CLIPPINGS_MAX = 5000; // GET /api/v1/clippings returns at most this many
const KEEP_RAW = 900_000; // characters of an answer worth keeping; D1 rows stop at 2 MB

const DOC = /^[A-Za-z0-9._-]{1,64}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["reading", "paused", "finished", "dnf"]);

// ---------------------------------------------------------------- dates

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
/** The Istanbul calendar day of a moment, as YYYY-MM-DD. */
const dayOf = (ms) => dayFormat.format(ms);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const between = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

// ---------------------------------------------------------------- derivations

/** Current and longest run of reading days. Today may still be unread without breaking the run. */
function streak(days, today) {
  const set = new Set(days);
  let current = 0;
  for (let d = set.has(today) ? today : addDays(today, -1); set.has(d); d = addDays(d, -1)) current++;
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of [...set].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

/** Share of a book read per calendar day over the last PACE_WINDOW days, or since it was started if that is sooner. */
function pace(rows, started, today) {
  const span = Math.max(1, Math.min(PACE_WINDOW, started ? between(started, today) + 1 : PACE_WINDOW));
  const from = addDays(today, 1 - span);
  let gained = 0;
  for (const r of rows) if (r.day >= from && r.day <= today) gained += Math.max(0, (r.to_pct ?? 0) - (r.from_pct ?? 0));
  return gained / span;
}

/** The day a book ends at this pace, or null when there is no pace or it is over ten years away. */
function forecast(percentage, perDay, today) {
  if (!(perDay > 0) || percentage == null) return null;
  const days = Math.max(0, Math.ceil((1 - percentage) / perDay - 1e-9));
  return days <= 3650 ? addDays(today, days) : null;
}

const EDGES = /^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu;
// Soft hyphens and zero-width characters vanish; every apostrophe becomes '.
const INVISIBLE = /[­​-‏⁠﻿]/g;
const APOSTROPHES = /[‘’ʼ`´]/g;
const tidy = (v) => String(v ?? "").normalize("NFC").replace(INVISIBLE, "").replace(APOSTROPHES, "'").replace(/\s+/g, " ").replace(EDGES, "");
/** The one spelling of a term, shared by clippings and reviews, so the same word never makes two cards. */
const termOf = (v) => tidy(v).toLowerCase();

/** A clipping of three words or fewer is vocabulary; anything longer is a sentence. */
function classify(text) {
  const clean = tidy(text);
  if (!clean) return null;
  if (clean.split(" ").length <= 3 && clean.length <= 60) return { kind: "word", term: clean.toLowerCase() };
  return { kind: "sentence", term: null };
}

/** Forms to look a term up under: itself, then plain guesses at its headword (ponytail: suffix rules, not a lemmatiser). */
function candidates(term) {
  const out = [term];
  if (term.includes(" ")) return out;
  const add = (w) => w.length > 2 && !out.includes(w) && out.push(w);
  for (const [end, to] of [["ies", "y"], ["ied", "y"], ["ves", "f"], ["es", ""], ["s", ""], ["ed", ""], ["ed", "e"], ["d", ""], ["ing", ""], ["ing", "e"], ["ly", ""], ["er", ""], ["est", ""]])
    if (term.endsWith(end)) add(term.slice(0, -end.length) + to);
  for (const end of ["ed", "ing"]) if (term.endsWith(end) && /(.)\1$/.test(term.slice(0, -end.length))) add(term.slice(0, -end.length - 1));
  return out;
}

const nextBox = (box, grade) => (grade === "good" ? Math.min(LEARNED, box + 1) : 1);

const text = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v, min = 0, max = 1e9) => (Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null);
const num = (v, min = 0, max = 1) => (Number.isFinite(v) && v >= min && v <= max ? v : null);
// Unix seconds between 2000 and 2100; anything else is a broken record, not a date.
const ts = (v) => int(v, 946_684_800, 4_102_444_800);
const isRecord = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v.filter(isRecord) : []);

/** Throws unless the answer has the documented shape, so a maintenance page or a renamed field can never empty the tables. */
function shape(name, body, keys) {
  if (!isRecord(body) || keys.some((k) => !Array.isArray(body[k]))) throw new Error(`${name}: unexpected answer shape`);
  return body;
}

/**
 * Books from /progress joined with /stats/activity. `title` is the book's own
 * metadata title or null: the file name is kept apart and never published.
 */
function deriveBooks(progress, activity) {
  const act = new Map(list(activity.books).map((b) => [b.document, b]));
  return list(progress.items)
    .filter((i) => DOC.test(typeof i.document === "string" ? i.document : ""))
    .map((i) => {
      const a = act.get(i.document) ?? {};
      return {
        document: i.document,
        title: text(i.title, 200),
        filename: text(i.filename, 200),
        author: text(i.author, 200),
        percentage: num(i.percentage ?? a.percentage),
        status: STATUSES.has(i.status) ? i.status : null,
        page_count: int(i.page_count ?? a.page_count, 1, 100_000),
        started_at: ts(a.started_at),
        last_at: ts(a.last_at ?? i.timestamp),
        finished_at: ts(a.finished_at),
        days_to_finish: int(a.days_to_finish, 1, 100_000),
      };
    });
}

function deriveDays(activity) {
  const days = [];
  const bookDays = [];
  for (const d of list(activity.days)) {
    if (typeof d.day !== "string" || !DAY.test(d.day)) continue;
    days.push({ day: d.day, pages: int(d.pages) ?? 0, syncs: int(d.syncs) ?? 0 });
    for (const b of list(d.books))
      if (typeof b.document === "string" && DOC.test(b.document))
        bookDays.push({ day: d.day, document: b.document, pages: int(b.pages) ?? 0, syncs: int(b.syncs) ?? 0, from_pct: num(b.from), to_pct: num(b.to) });
  }
  return { days, bookDays };
}

function deriveClippings(clippings) {
  const clips = [];
  for (const c of list(clippings.items)) {
    if (typeof c.id !== "string" || !DOC.test(c.id) || typeof c.document !== "string" || !DOC.test(c.document) || typeof c.text !== "string") continue;
    const kind = classify(c.text);
    if (kind) clips.push({ id: c.id, document: c.document, text: c.text.slice(0, 4096), chapter: text(c.chapter, 64), created_at: ts(c.created_at), ...kind });
  }
  return clips;
}

/** Rows for D1 from the Sync answers. Pure, so check.mjs can run it on the fixtures and on the stored raw answers. */
function derive({ progress, activity, clippings }) {
  return {
    books: deriveBooks(progress, activity),
    ...deriveDays(activity),
    clippings: deriveClippings(clippings),
    // A missing book or clipping only means "deleted" when the answer was the whole list.
    allBooks: !progress.next,
    allClippings: clippings.items.length < CLIPPINGS_MAX,
  };
}

// ---------------------------------------------------------------- pulling from CrossPoint Sync

async function get(env, path, auth = true) {
  const headers = { accept: "application/json", "user-agent": "reading-worker" };
  if (auth) Object.assign(headers, { "x-auth-user": env.SYNC_USER, "x-auth-key": env.SYNC_KEY });
  // A redirect is refused, so the credentials never follow one to another host.
  // (Workers only accept "follow" or "manual"; "manual" hands back the 3xx.)
  const res = await fetch(new URL(path, env.SYNC_URL), { headers, redirect: "manual", signal: AbortSignal.timeout(20_000) });
  if (res.status >= 300 && res.status < 400) throw new Error(`${path}: refused a redirect (HTTP ${res.status})`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

async function sha256(s) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const chunks = (rows, size) => Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));
const J = JSON.stringify;

/**
 * Reads every endpoint first and writes nothing unless all of them answered
 * with the documented shape, then writes in one batch (a transaction).
 * Answers are hashed before anything is parsed: an unchanged answer costs a
 * hash and its fetch time, nothing else. Re-running on the same answers
 * changes nothing; every write is an upsert that skips identical rows.
 */
async function ingest(env, now = Date.now()) {
  if (!env.SYNC_USER || !env.SYNC_KEY) throw new Error("SYNC_USER and SYNC_KEY are not set");
  const tz = `tz=${TZ_OFFSET}`;
  // ponytail: one page of 500 books; books not on it are kept (allBooks is false) when there is a next page.
  const [health, progress, activity, overview, clippings] = await Promise.all([
    get(env, "/healthz", false).catch(() => "{}"),
    get(env, "/api/v1/progress?include_history=1&limit=500"),
    get(env, `/api/v1/stats/activity?${tz}`),
    get(env, `/api/v1/stats/overview?${tz}&days=365`),
    get(env, "/api/v1/clippings"),
  ]);
  const bodies = { progress, activity, overview, clippings };
  let version = null;
  try {
    version = text(JSON.parse(health)?.version, 40); // only a label; a strange health answer never stops a pull
  } catch {}

  const db = env.DB;
  const stored = new Map((await db.prepare("SELECT endpoint, hash FROM raw").all()).results.map((r) => [r.endpoint, r.hash]));
  const hashes = Object.fromEntries(await Promise.all(Object.entries(bodies).map(async ([k, v]) => [k, await sha256(v)])));
  const changed = Object.keys(bodies).filter((k) => stored.get(k) !== hashes[k]);
  const booksChanged = changed.includes("progress") || changed.includes("activity");
  // Errors name the endpoint and what was wrong, never the answer's contents.
  const parse = (k, keys) => {
    let body;
    try {
      body = JSON.parse(bodies[k]);
    } catch {
      throw new Error(`${k}: not JSON`);
    }
    return shape(k, body, keys);
  };
  const parsed = {
    progress: booksChanged ? parse("progress", ["items"]) : null,
    activity: booksChanged ? parse("activity", ["books", "days"]) : null,
    clippings: changed.includes("clippings") ? parse("clippings", ["items"]) : null,
  };
  if (changed.includes("overview")) parse("overview", []);

  const today = dayOf(now);
  const seconds = Math.floor(now / 1000);
  const statements = [];
  const counts = {};

  for (const k of Object.keys(bodies))
    statements.push(
      db
        .prepare(
          `INSERT INTO raw (endpoint, hash, body, server_version, fetched_at) VALUES (?1, ?2, ?3, ?4, ?5)
           ON CONFLICT (endpoint) DO UPDATE SET hash = excluded.hash, body = CASE WHEN raw.hash = excluded.hash THEN raw.body ELSE excluded.body END,
             server_version = excluded.server_version, fetched_at = excluded.fetched_at`,
        )
        .bind(k, hashes[k], bodies[k].length <= KEEP_RAW ? bodies[k] : null, version, seconds),
    );

  // A delete only ever runs against a non-empty answer: an empty list is far
  // more often a fresh server or an outage than a reader with nothing on it.
  // ponytail: deleting the very last book or clipping on the reader is kept here until something replaces it.
  const NONEMPTY = "json_array_length(?1) > 0";

  if (booksChanged) {
    const books = deriveBooks(parsed.progress, parsed.activity);
    counts.books = books.length;
    statements.push(
      db
        .prepare(
          `INSERT INTO books (document, title, filename, author, percentage, status, page_count, started_at, last_at, finished_at, days_to_finish)
           SELECT value->>'document', value->>'title', value->>'filename', value->>'author', value->>'percentage', value->>'status', value->>'page_count',
                  value->>'started_at', value->>'last_at', value->>'finished_at', value->>'days_to_finish'
           FROM json_each(?1) WHERE true
           ON CONFLICT (document) DO UPDATE SET title = excluded.title, filename = excluded.filename, author = excluded.author, percentage = excluded.percentage,
             status = excluded.status, page_count = excluded.page_count, started_at = excluded.started_at, last_at = excluded.last_at,
             finished_at = excluded.finished_at, days_to_finish = excluded.days_to_finish
           WHERE (books.title, books.filename, books.author, books.percentage, books.status, books.page_count, books.started_at, books.last_at, books.finished_at, books.days_to_finish)
             IS NOT (excluded.title, excluded.filename, excluded.author, excluded.percentage, excluded.status, excluded.page_count, excluded.started_at, excluded.last_at, excluded.finished_at, excluded.days_to_finish)`,
        )
        .bind(J(books)),
    );
    if (!parsed.progress.next)
      statements.push(db.prepare(`DELETE FROM books WHERE ${NONEMPTY} AND document NOT IN (SELECT value->>'document' FROM json_each(?1))`).bind(J(books)));

    const { days, bookDays } = deriveDays(parsed.activity);
    counts.days = days.length;
    statements.push(
      db
        .prepare(
          `INSERT INTO days (day, pages, syncs) SELECT value->>'day', value->>'pages', value->>'syncs' FROM json_each(?1) WHERE true
           ON CONFLICT (day) DO UPDATE SET pages = excluded.pages, syncs = excluded.syncs
           WHERE (days.pages, days.syncs) IS NOT (excluded.pages, excluded.syncs)`,
        )
        .bind(J(days)),
      db.prepare(`DELETE FROM days WHERE ${NONEMPTY} AND day NOT IN (SELECT value->>'day' FROM json_each(?1))`).bind(J(days)),
      db
        .prepare(
          `INSERT INTO book_days (day, document, pages, syncs, from_pct, to_pct)
           SELECT value->>'day', value->>'document', value->>'pages', value->>'syncs', value->>'from_pct', value->>'to_pct' FROM json_each(?1) WHERE true
           ON CONFLICT (day, document) DO UPDATE SET pages = excluded.pages, syncs = excluded.syncs, from_pct = excluded.from_pct, to_pct = excluded.to_pct
           WHERE (book_days.pages, book_days.syncs, book_days.from_pct, book_days.to_pct) IS NOT (excluded.pages, excluded.syncs, excluded.from_pct, excluded.to_pct)`,
        )
        .bind(J(bookDays)),
      db
        .prepare(`DELETE FROM book_days WHERE ${NONEMPTY} AND (day, document) NOT IN (SELECT value->>'day', value->>'document' FROM json_each(?1))`)
        .bind(J(bookDays.map(({ day, document }) => ({ day, document })))),
    );
  }

  if (parsed.clippings) {
    const clips = deriveClippings(parsed.clippings);
    counts.clippings = clips.length;
    for (const part of chunks(clips, 500))
      statements.push(
        db
          .prepare(
            `INSERT INTO clippings (id, document, text, chapter, created_at, kind, term)
             SELECT value->>'id', value->>'document', value->>'text', value->>'chapter', value->>'created_at', value->>'kind', value->>'term'
             FROM json_each(?1) WHERE true
             ON CONFLICT (id) DO UPDATE SET document = excluded.document, chapter = excluded.chapter, kind = excluded.kind, term = excluded.term, deleted = 0
             WHERE (clippings.document, clippings.chapter, clippings.kind, clippings.term, clippings.deleted)
               IS NOT (excluded.document, excluded.chapter, excluded.kind, excluded.term, 0)`,
          )
          .bind(J(part)),
      );
    if (parsed.clippings.items.length < CLIPPINGS_MAX)
      statements.push(
        db.prepare(`UPDATE clippings SET deleted = 1 WHERE ${NONEMPTY} AND deleted = 0 AND id NOT IN (SELECT value FROM json_each(?1))`).bind(J(clips.map((c) => c.id))),
      );
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO cards (term, due, added_at) SELECT DISTINCT term, ?1, ?2 FROM clippings WHERE kind = 'word' AND deleted = 0 AND term IS NOT NULL")
        .bind(today, seconds),
    );
  }

  await db.batch(statements);
  const translated = await translate(env, today, seconds);
  // The public answer is rebuilt every pull (the day may have turned) and read back as one row.
  await storeSummary(env, now);
  return { changed, ...counts, translated };
}

/** A pull with its outcome kept in meta ('last_pull'), for the private routes. */
async function pull(env, now) {
  let outcome;
  try {
    outcome = { ok: true, result: await ingest(env, now) };
  } catch (error) {
    outcome = { ok: false, error: String(error?.message ?? error).slice(0, 300) };
  }
  await env.DB.prepare("INSERT INTO meta (key, value, updated_at) VALUES ('last_pull', ?1, ?2) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(J({ at: Math.floor(now / 1000), ...outcome }), Math.floor(now / 1000))
    .run()
    .catch(() => {});
  if (!outcome.ok) console.error(outcome.error);
  return outcome;
}

const TRANSLATE_TRIES = 5;

/**
 * Translates untranslated sentences within the daily cap, fewest tries first,
 * newest first. A sentence the model fails on gets a try counted against it and
 * goes to the back, so one bad row can never hold up the rest; after
 * TRANSLATE_TRIES it is left alone. Two failures in a row end the run (most
 * likely the free allowance is spent). Attempts count against the cap.
 */
async function translate(env, today, seconds) {
  if (!env.AI) return 0;
  const db = env.DB;
  const used = (await db.prepare("SELECT translations FROM daily WHERE day = ?1").bind(today).first("translations")) ?? 0;
  const room = Math.min(TRANSLATE_PER_RUN, TRANSLATE_PER_DAY - used);
  if (room <= 0) return 0;
  const { results } = await db
    .prepare(
      `SELECT id, text FROM clippings WHERE kind = 'sentence' AND deleted = 0 AND translation IS NULL AND translate_tries < ?2
       ORDER BY translate_tries, created_at DESC LIMIT ?1`,
    )
    .bind(room, TRANSLATE_TRIES)
    .all();
  const done = [];
  const failed = [];
  let streakOfFailures = 0;
  for (const row of results) {
    let tr = null;
    try {
      tr = text((await env.AI.run(MODEL, { text: row.text, source_lang: "en", target_lang: "tr" }))?.translated_text, 8000);
    } catch (error) {
      console.error(error);
    }
    if (tr) {
      done.push({ id: row.id, tr });
      streakOfFailures = 0;
    } else {
      failed.push(row.id);
      if (++streakOfFailures >= 2) break;
    }
  }
  const tried = done.length + failed.length;
  if (!tried) return 0;
  await db.batch([
    db
      .prepare(
        `UPDATE clippings SET translation = (SELECT value->>'tr' FROM json_each(?1) WHERE value->>'id' = clippings.id), translated_at = ?2
         WHERE id IN (SELECT value->>'id' FROM json_each(?1))`,
      )
      .bind(J(done), seconds),
    db.prepare("UPDATE clippings SET translate_tries = translate_tries + 1 WHERE id IN (SELECT value FROM json_each(?1))").bind(J(failed)),
    db
      .prepare("INSERT INTO daily (day, translations) VALUES (?1, ?2) ON CONFLICT (day) DO UPDATE SET translations = translations + excluded.translations")
      .bind(today, tried),
  ]);
  return done.length;
}

// ---------------------------------------------------------------- reading back

const LIVE_TERM = "EXISTS (SELECT 1 FROM clippings w WHERE w.kind = 'word' AND w.deleted = 0 AND w.term = cards.term)";

async function readingDays(db) {
  return (await db.prepare("SELECT day FROM days WHERE syncs > 0 OR pages > 0 ORDER BY day").all()).results.map((r) => r.day);
}

/** Dictionary entries for many terms in one query: Map term -> {lemma, ipa, def, tr}. */
async function lookup(db, terms) {
  const forms = terms.map((t) => [t, candidates(t)]);
  const all = [...new Set(forms.flatMap(([, c]) => c))];
  if (!all.length) return new Map();
  const { results } = await db.prepare("SELECT word, ipa, def, tr FROM dict WHERE word IN (SELECT value FROM json_each(?1))").bind(J(all)).all();
  const found = new Map(results.map((r) => [r.word, r]));
  return new Map(
    forms.map(([t, c]) => {
      const hit = c.map((w) => found.get(w)).find(Boolean);
      return [t, { lemma: hit?.word ?? null, ipa: hit?.ipa ?? null, def: hit?.def ?? null, tr: hit?.tr ?? null }];
    }),
  );
}

/**
 * The day's word: chosen once and kept, so the page, the API and the
 * notification agree. Due cards first, then the one shown longest ago.
 */
async function wordOfDay(db, today) {
  let term = await db.prepare("SELECT term FROM daily WHERE day = ?1").bind(today).first("term");
  if (!term) {
    const pick = await db
      .prepare(`SELECT term FROM cards WHERE ${LIVE_TERM} ORDER BY due <= ?1 DESC, shown IS NOT NULL, shown, box, term LIMIT 1`)
      .bind(today)
      .first("term");
    if (!pick) return null;
    await db.batch([
      db.prepare("INSERT INTO daily (day, term) VALUES (?1, ?2) ON CONFLICT (day) DO UPDATE SET term = excluded.term WHERE daily.term IS NULL").bind(today, pick),
      db.prepare("UPDATE cards SET shown = ?1 WHERE term = (SELECT term FROM daily WHERE day = ?1)").bind(today),
    ]);
    term = await db.prepare("SELECT term FROM daily WHERE day = ?1").bind(today).first("term"); // a concurrent request may have won
  }
  return { term, ...(await lookup(db, [term])).get(term) };
}

// Two significant figures under 10, one decimal above: slow progress stays visible instead of rounding to 0.
const sig = (x) => (x > 0 ? (x >= 10 ? Math.round(x * 10) / 10 : Number(x.toPrecision(2))) : 0);

/**
 * The title a book may show in public, or null to leave it off the page: hidden
 * from the private side, no title of its own (a file name is never published),
 * or a title matching one of HIDE_TITLES (a secret: comma-separated words, any
 * case). The owner can set a title instead.
 */
function publicTitle(book, env) {
  const title = book.public_title ?? book.title;
  if (book.hidden || !title) return null;
  const patterns = String(env.HIDE_TITLES ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const lower = title.toLowerCase();
  return patterns.some((p) => lower.includes(p)) ? null : title;
}

/** Everything the public page shows, computed from the tables. */
async function buildSummary(env, now) {
  const db = env.DB;
  const today = dayOf(now);
  const since = addDays(today, -370);
  const [books, days, recent, firsts, meta] = (
    await db.batch([
      db.prepare("SELECT * FROM books"),
      db.prepare("SELECT day, pages, syncs FROM days WHERE day >= ?1 AND (syncs > 0 OR pages > 0) ORDER BY day").bind(since),
      db.prepare("SELECT day, document, from_pct, to_pct FROM book_days WHERE day >= ?1").bind(addDays(today, 1 - PACE_WINDOW)),
      db.prepare("SELECT document, MIN(day) AS first FROM book_days GROUP BY document"),
      db.prepare("SELECT MAX(fetched_at) AS updated, (SELECT body FROM raw WHERE endpoint = 'overview') AS overview FROM raw"),
    ])
  ).map((r) => r.results);
  let overview = {};
  try {
    overview = JSON.parse(meta[0]?.overview ?? "{}") ?? {};
  } catch {}
  const day = (s) => (s ? dayOf(s * 1000) : null);
  const first = new Map(firsts.map((f) => [f.document, f.first]));

  const reading = books
    .filter((b) => b.status === "reading" && b.percentage != null && b.percentage < 1)
    .map((b) => ({ b, title: publicTitle(b, env) }))
    .filter(({ title }) => title)
    .sort((x, y) => (y.b.last_at ?? 0) - (x.b.last_at ?? 0))
    .map(({ b, title }) => {
      // The first logged day is where the book was when it was first synced, not reading done that day.
      const rows = recent.filter((r) => r.document === b.document && r.day !== first.get(b.document));
      const perDay = pace(rows, day(b.started_at), today);
      return {
        title,
        author: b.author,
        percent: Math.round(b.percentage * 1000) / 10,
        page_count: b.page_count,
        started: day(b.started_at),
        last_read: day(b.last_at),
        percent_per_day: sig(perDay * 100),
        pages_per_day: b.page_count && perDay ? sig(perDay * b.page_count) : null,
        forecast: forecast(b.percentage, perDay, today),
      };
    });
  const finished = books
    .filter((b) => b.status === "finished")
    .map((b) => ({ b, title: publicTitle(b, env) }))
    .filter(({ title }) => title)
    .sort((x, y) => (y.b.finished_at ?? 0) - (x.b.finished_at ?? 0))
    .map(({ b, title }) => ({ title, author: b.author, started: day(b.started_at), finished: day(b.finished_at), days: b.days_to_finish }));

  return {
    today,
    updated_at: meta[0]?.updated ?? null,
    streak: streak(await readingDays(db), today),
    days: days.map((d) => [d.day, d.pages]),
    reading,
    finished,
    // Reading time exists only when some device uploads stats; CrossPoint 2.0.0 does not.
    time: overview.seconds > 0 ? { seconds: overview.seconds, week_seconds: overview.week_seconds ?? 0 } : null,
  };
}

/** Rebuilt by every pull and by every change to a book's visibility. */
async function storeSummary(env, now) {
  const body = await buildSummary(env, now);
  await env.DB.prepare("INSERT INTO meta (key, value, updated_at) VALUES ('summary', ?1, ?2) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(J(body), Math.floor(now / 1000))
    .run();
  return body;
}

/** One row read when the stored summary is today's; built from the tables only between midnight and the next pull. */
async function summary(env, now) {
  const row = await env.DB.prepare("SELECT value FROM meta WHERE key = 'summary'").first("value");
  if (row) {
    const stored = JSON.parse(row);
    if (stored.today === dayOf(now)) return stored;
  }
  return buildSummary(env, now);
}

/** The private list of books with what the public page shows for each. */
async function booksList(env) {
  const { results } = await env.DB.prepare(
    "SELECT document, title, filename, public_title, hidden, author, status, percentage FROM books ORDER BY last_at DESC",
  ).all();
  return { books: results.map((b) => ({ ...b, hidden: Boolean(b.hidden), shown_as: publicTitle(b, env) })) };
}

/** Hide or show a book publicly, or give it the title it should show ("" or null goes back to its own). */
async function setBook(env, input, now) {
  if (!isRecord(input) || typeof input.document !== "string" || !DOC.test(input.document)) return null;
  if (input.hidden !== undefined && typeof input.hidden !== "boolean") return null;
  if (input.title !== undefined && input.title !== null && typeof input.title !== "string") return null;
  const db = env.DB;
  const found = await db.prepare("SELECT 1 FROM books WHERE document = ?1").bind(input.document).first();
  if (!found) return undefined;
  await db
    .prepare("UPDATE books SET hidden = CASE WHEN ?2 IS NULL THEN hidden ELSE ?2 END, public_title = CASE WHEN ?3 THEN ?4 ELSE public_title END WHERE document = ?1")
    .bind(input.document, input.hidden === undefined ? null : input.hidden ? 1 : 0, input.title === undefined ? 0 : 1, text(input.title, 200))
    .run();
  await storeSummary(env, now);
  return (await booksList(env)).books.find((b) => b.document === input.document);
}

/**
 * The day and the streak, small enough for a widget. With the token it also
 * carries the word of the day and the card counts: the vocabulary side of this
 * Worker stays private, and nothing public mentions it.
 */
async function todayCard(env, now, mine = false) {
  const db = env.DB;
  const today = dayOf(now);
  const card = { day: today, streak: streak(await readingDays(db), today).current };
  if (!mine) return card;
  const [word, counts] = await Promise.all([
    wordOfDay(db, today),
    db.prepare(`SELECT COUNT(*) AS collected, COALESCE(SUM(box >= ${LEARNED}), 0) AS learned FROM cards WHERE ${LIVE_TERM}`).first(),
  ]);
  const last = await db.prepare("SELECT value FROM meta WHERE key = 'last_pull'").first("value");
  return {
    ...card,
    word: word && { term: word.term, ipa: word.ipa, tr: word.tr, def: word.def },
    words: { collected: counts.collected, learned: counts.learned },
    last_pull: last ? JSON.parse(last) : null,
  };
}

// ---------------------------------------------------------------- private

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

async function cardsCsv(env) {
  const db = env.DB;
  const { results } = await db
    .prepare(
      `SELECT c.term, b.title AS book,
         (SELECT s.text FROM clippings s WHERE s.kind = 'sentence' AND s.deleted = 0 AND s.document = w.document AND instr(lower(s.text), c.term) > 0
            ORDER BY abs(s.created_at - w.created_at) LIMIT 1) AS sentence,
         (SELECT s.translation FROM clippings s WHERE s.kind = 'sentence' AND s.deleted = 0 AND s.document = w.document AND instr(lower(s.text), c.term) > 0
            ORDER BY abs(s.created_at - w.created_at) LIMIT 1) AS sentence_tr
       FROM cards c
       JOIN clippings w ON w.id = (SELECT id FROM clippings WHERE kind = 'word' AND deleted = 0 AND term = c.term ORDER BY created_at LIMIT 1)
       LEFT JOIN books b ON b.document = w.document
       ORDER BY c.added_at, c.term`,
    )
    .all();
  const dict = await lookup(db, results.map((r) => r.term));
  // Anki reads these header lines; the first column is the note's key, so a re-import updates instead of duplicating.
  const lines = ["#separator:Comma", "#html:false", "#columns:Word,IPA,Turkish,Definition,Sentence,Sentence (TR),Book"];
  for (const r of results) {
    const d = dict.get(r.term);
    lines.push([r.term, d.ipa && `/${d.ipa}/`, d.tr, d.def, r.sentence, r.sentence_tr, r.book].map(csvCell).join(","));
  }
  return lines.join("\n") + "\n";
}

async function sentences(env) {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.text, s.translation AS tr, b.title AS book, s.chapter, s.created_at
     FROM clippings s LEFT JOIN books b ON b.document = s.document
     WHERE s.kind = 'sentence' AND s.deleted = 0 ORDER BY s.created_at DESC LIMIT 500`,
  ).all();
  return { items: results };
}

/**
 * Records one answer. A card that is not due is refused, so a retried request
 * (or a double tap) can never move a card twice; the answer carries the card as
 * it stands so a client can treat the refusal as "already saved".
 */
async function review(env, input, now) {
  const term = isRecord(input) && typeof input.term === "string" ? termOf(input.term) : "";
  if (!term || term.length > 60 || !["good", "again"].includes(input.grade)) return null;
  const db = env.DB;
  const today = dayOf(now);
  const card = await db.prepare("SELECT term, box, due, reviews, lapses FROM cards WHERE term = ?1").bind(term).first();
  if (!card) return undefined;
  if (card.due > today) return { error: "not due", card: { ...card } };
  const box = nextBox(card.box, input.grade);
  const updated = await db
    .prepare(
      `UPDATE cards SET box = ?1, due = ?2, reviews = reviews + 1, lapses = lapses + ?3,
         first_reviewed_at = COALESCE(first_reviewed_at, ?5), matured_at = COALESCE(matured_at, CASE WHEN ?1 >= ${LEARNED} THEN ?5 END)
       WHERE term = ?4 AND due <= ?6 RETURNING term, box, due, reviews, lapses`,
    )
    .bind(box, addDays(today, INTERVALS[box - 1]), input.grade === "again" ? 1 : 0, term, Math.floor(now / 1000), today)
    .first();
  return updated ?? { error: "not due", card: { ...card } }; // a concurrent answer got there first
}

/** Same work as a hashed compare: neither the length nor the first wrong byte shows in the timing. */
async function authorized(request, env) {
  const token = env.READING_TOKEN;
  if (!token || token.length < 32) return false;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const [a, b] = await Promise.all([given, token].map((s) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// ---------------------------------------------------------------- notification

/** The morning push, in English: the point is reading English. */
function notification(word, current) {
  const days = current === 1 ? "1 day" : `${current} days`;
  const line = current > 0 ? `Streak: ${days}.` : "No streak right now. A page today starts one.";
  if (!word) return { title: "Reading", message: `No words clipped yet.\n${line}` };
  const head = [word.ipa && `/${word.ipa}/`, word.tr].filter(Boolean).join("  ·  ");
  return { title: word.term, message: [head, word.def, line].filter(Boolean).join("\n") };
}

async function notify(env, now) {
  if (!env.NTFY_TOPIC) return false;
  const db = env.DB;
  const today = dayOf(now);
  if (await db.prepare("SELECT notified FROM daily WHERE day = ?1").bind(today).first("notified")) return false;
  const [word, days] = await Promise.all([wordOfDay(db, today), readingDays(db)]);
  const { title, message } = notification(word, streak(days, today).current);
  // JSON publishing, so Turkish letters and IPA survive (ntfy headers are ASCII).
  const res = await fetch(env.NTFY_URL || "https://ntfy.sh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: J({ topic: env.NTFY_TOPIC, title, message, tags: ["books"], click: `${SITE}/reading/` }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`ntfy: HTTP ${res.status}`);
  await db.prepare("INSERT INTO daily (day, notified) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET notified = 1").bind(today).run();
  return true;
}

// ---------------------------------------------------------------- HTTP

const respond = (body, status, headers = {}) =>
  new Response(typeof body === "string" ? body : J(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const PUBLIC = { "/api/reading/summary": summary, "/api/reading/today": todayCard };

const readJson = async (request) => {
  if (Number(request.headers.get("content-length") ?? 0) > 2000) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
};

// null: the input was bad; undefined: no such record; {error}: refused as it stands.
const answer = (out) =>
  out === null ? respond({ error: "bad" }, 400) : out === undefined ? respond({ error: "unknown" }, 404) : out.error ? respond(out, 409) : out;

// Every private route, keyed "METHOD path". They all pass the one token check
// in fetch() below, so a later private page only adds a line here.
const PRIVATE = {
  "GET /api/reading/today": (env, request, now) => todayCard(env, now, true),
  "GET /api/reading/cards.csv": async (env) =>
    respond(await cardsCsv(env), 200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="reading-cards.csv"' }),
  "GET /api/reading/sentences": (env) => sentences(env),
  // The reason a pull failed goes back to the owner (endpoint, status or shape;
  // never credentials or answer data), so production is diagnosable without logs.
  "POST /api/reading/sync": async (env, request, now) => {
    const out = await pull(env, now);
    return out.ok ? out.result : respond({ error: "pull failed", reason: out.error }, 502);
  },
  "POST /api/reading/review": async (env, request, now) => answer(await review(env, await readJson(request), now)),
  "GET /api/reading/books": (env) => booksList(env),
  "POST /api/reading/books": async (env, request, now) => answer(await setBook(env, await readJson(request), now)),
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "");
    const origin = request.headers.get("origin") ?? "";
    const cors = ORIGINS.has(origin) && origin !== SITE ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
    if (request.method === "OPTIONS" && PUBLIC[path])
      return new Response(null, { status: 204, headers: { ...cors, "access-control-allow-methods": "GET", "access-control-max-age": "86400" } });
    if (request.method !== "GET" && request.method !== "POST") return new Response(null, { status: 405 });

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    try {
      const [mine, all] = await Promise.all([env.PER_VISITOR.limit({ key: ip }), env.SITE_WIDE.limit({ key: "site" })]);
      if (!mine.success || !all.success) return respond({ error: "rate" }, 429, cors);

      const route = PRIVATE[`${request.method} ${path}`];
      // A private route that is also public (today) is private only with a token.
      if (route && (!PUBLIC[path] || request.headers.has("authorization"))) {
        if (!(await authorized(request, env))) return respond({ error: "auth" }, 401);
        const out = await route(env, request, Date.now());
        return out instanceof Response ? out : respond(out, 200);
      }

      if (PUBLIC[path]) {
        if (request.method !== "GET") return new Response(null, { status: 405 });
        // Five minutes at the edge: the data changes at most every thirty.
        const cache = globalThis.caches?.default;
        const key = new Request(url.origin + path);
        const hit = await cache?.match(key);
        if (hit) return new Response(hit.body, { headers: { ...Object.fromEntries(hit.headers), ...cors } });
        const res = respond(await PUBLIC[path](env, Date.now()), 200, { "cache-control": "public, max-age=300" });
        if (cache) ctx.waitUntil(cache.put(key, res.clone()));
        return new Response(res.body, { headers: { ...Object.fromEntries(res.headers), ...cors } });
      }
      return new Response(null, { status: Object.keys(PRIVATE).some((k) => k.endsWith(` ${path}`)) ? 405 : 404 });
    } catch (error) {
      // Most likely a free daily allowance is spent, or CrossPoint Sync is down.
      console.error(error);
      return respond({ error: "unavailable" }, 503, cors);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(event.cron === MORNING ? notify(env, Date.now()) : pull(env, Date.now()));
  },
};

// For check.mjs.
export { addDays, authorized, booksList, buildSummary, candidates, cardsCsv, classify, dayOf, derive, forecast, ingest, nextBox, notification, notify, pace, publicTitle, pull, review, sentences, setBook, streak, summary, termOf, todayCard };
