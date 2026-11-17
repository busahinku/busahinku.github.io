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
//          GET  /api/reading/cards     every card with meaning, examples, audio
//          POST /api/reading/words     add a word by hand ({term, note?, sentence?}); /edit and /delete
//          POST /api/reading/audio     find and keep a human recording for {term}
//          GET  /api/reading/app       the private words page (sign in with the token at POST /login)
import { appPage, loginPage } from "./page.js";

const SITE = "https://busahin.com";
const ORIGINS = new Set([SITE, "http://localhost:4321"]);
const TZ = "Europe/Istanbul";
// Date#getTimezoneOffset() for Istanbul, which the Sync API takes as `tz`.
// Turkey has stayed on UTC+3 all year since 2016.
const TZ_OFFSET = -180;
// One cron, every thirty minutes: the pull, and on the hour the notifications
// whose hour (Istanbul time, set on the private page) has come.

// Leitner: a card in box n comes back after INTERVALS[n - 1] days. A right
// answer moves it up a box, a wrong one sends it back to box 1. A word is
// "learned" once it reaches the last box.
const INTERVALS = [1, 2, 4, 8, 16];
const LEARNED = INTERVALS.length;

const PACE_WINDOW = 14; // days of reading a book's pace is measured over
const TRANSLATE_PER_RUN = 10;
const TRANSLATE_PER_DAY = 40;
const MODEL = "@cf/meta/m2m100-1.2b"; // open-source (MIT) translation model, checked in the Workers AI catalogue 2026-11-18
// Recordings: each lookup is three small requests to Wikimedia and at most one
// R2 write, so this caps both per day; 30 days before a word with no recording
// is asked about again.
const AUDIO_PER_DAY = 100;
const AUDIO_PER_RUN = 5;
const AUDIO_RETRY = 30 * 86_400;
const AUDIO_MAX_BYTES = 1_000_000;
const WIKI_HEADERS = { accept: "application/json", "user-agent": "busahin-reading/1 (https://busahin.com/)" };
const COOKIE = "reading_session";
const SESSION_DAYS = 60;
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
  // New words get their recording ahead of time, so the play button is instant.
  const { results: fresh } = await db
    .prepare(`SELECT term FROM cards WHERE ${LIVE_TERM} AND term NOT IN (SELECT term FROM audio) ORDER BY added_at DESC LIMIT ?1`)
    .bind(AUDIO_PER_RUN)
    .all();
  let recorded = 0;
  for (const { term } of fresh) {
    try {
      if ((await ensureAudio(env, term, now))?.r2_key) recorded++;
    } catch (error) {
      console.error(error);
    }
  }
  // The public answer is rebuilt every pull (the day may have turned) and read back as one row.
  await storeSummary(env, now);
  return { changed, ...counts, translated, recorded };
}

/** Reserves one translation from today's cap; false when it is spent. */
async function takeTranslation(db, today) {
  const row = await db
    .prepare(
      `INSERT INTO daily (day, translations) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET translations = translations + 1
       WHERE daily.translations < ?2 RETURNING translations`,
    )
    .bind(today, TRANSLATE_PER_DAY)
    .first();
  return Boolean(row);
}

/** One sentence into Turkish with M2M100, or null (no binding, cap spent, model error). */
async function translateOne(env, sentence, today) {
  if (!env.AI || !(await takeTranslation(env.DB, today))) return null;
  try {
    return text((await env.AI.run(MODEL, { text: sentence, source_lang: "en", target_lang: "tr" }))?.translated_text, 8000);
  } catch (error) {
    console.error(error);
    return null;
  }
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

// A card counts while its clipping is on the reader, or always when it was added by hand.
const LIVE_TERM = "(cards.source = 'manual' OR EXISTS (SELECT 1 FROM clippings w WHERE w.kind = 'word' AND w.deleted = 0 AND w.term = cards.term))";

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
 * Records one answer and logs it. A card that is not due is refused, so a
 * retried request or a double tap never moves a card twice. `id` is the app's
 * own id for the answer: an answer sent again after a dropped connection is
 * recognised and not counted twice. `at` is when it was given (up to a week
 * ago), so grades kept offline count on the day they were given.
 */
async function review(env, input, now) {
  const term = isRecord(input) && typeof input.term === "string" ? termOf(input.term) : "";
  if (!term || term.length > 60 || !["good", "again"].includes(input.grade)) return null;
  const id = typeof input.id === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(input.id) ? input.id : null;
  if (input.id !== undefined && !id) return null;
  const at = Number.isFinite(input.at) && input.at <= now + 60_000 && input.at >= now - 7 * 86_400_000 ? input.at : now;
  const db = env.DB;
  const today = dayOf(at);
  const read = () => db.prepare("SELECT term, box, due, reviews, lapses FROM cards WHERE term = ?1").bind(term).first();
  if (id && (await db.prepare("SELECT 1 FROM reviews WHERE client_id = ?1").bind(id).first())) return { duplicate: true, ...(await read()) };
  const card = await read();
  if (!card) return undefined;
  if (card.due > today) return { error: "not due", card: { ...card } };
  const box = nextBox(card.box, input.grade);
  const seconds = Math.floor(at / 1000);
  const [updated] = await db.batch([
    db
      .prepare(
        `UPDATE cards SET box = ?1, due = ?2, reviews = reviews + 1, lapses = lapses + ?3,
           first_reviewed_at = COALESCE(first_reviewed_at, ?5), matured_at = COALESCE(matured_at, CASE WHEN ?1 >= ${LEARNED} THEN ?5 END)
         WHERE term = ?4 AND due <= ?6 RETURNING term, box, due, reviews, lapses`,
      )
      .bind(box, addDays(today, INTERVALS[box - 1]), input.grade === "again" ? 1 : 0, term, seconds, today),
    // Logged only when the update above went through (changes() is that statement's count).
    db
      .prepare("INSERT INTO reviews (term, grade, box_before, box_after, day, reviewed_at, client_id) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE changes() > 0")
      .bind(term, input.grade, card.box, box, today, seconds, id),
  ]);
  return updated.results[0] ?? { error: "not due", card: { ...card } }; // a concurrent answer got there first
}

function givenToken(request) {
  const bearer = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return { token: bearer, cookie: false };
  const cookie = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f.]{1,200})(?:;|$)`))?.[1];
  return { token: cookie ?? "", cookie: Boolean(cookie) };
}

/** The secret sessions are signed with: a rotated token's hash, else READING_TOKEN. */
async function masterKey(env) {
  const rotated = env.DB ? await env.DB.prepare("SELECT value FROM settings WHERE key = 'token_hash'").first("value") : null;
  return { rotated, key: rotated ?? (env.READING_TOKEN?.length >= 32 ? env.READING_TOKEN : null) };
}

async function hmac(key, message) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

const epochOf = async (env) => Number((await env.DB?.prepare("SELECT value FROM settings WHERE key = 'session_epoch'").first("value")) ?? 0);

/**
 * A session for the sign-in cookie: "<expiry>.<HMAC of the expiry and the
 * current epoch>". It expires after SESSION_DAYS, cannot be turned back into
 * the token or used as one, and every session ends when sign-out raises the
 * epoch or the token is rotated (which changes the signing key).
 */
async function newSession(env, now = Date.now()) {
  const { key } = await masterKey(env);
  const exp = Math.floor(now / 1000) + SESSION_DAYS * 86_400;
  return `${exp}.${await hmac(key, `session.${exp}.${await epochOf(env)}`)}`;
}

const sessionCookie = (value, request) => {
  const local = new URL(request.url).hostname === "localhost";
  return `${COOKIE}=${value}; Path=/api/reading; Max-Age=${value ? SESSION_DAYS * 86_400 : 0}; HttpOnly; SameSite=Strict${local ? "" : "; Secure"}`;
};

/**
 * The one check every private route and page goes through: the token as a
 * bearer header (scripts, a widget), or a session cookie from the sign-in form
 * (the private page). A cookie on a POST from another origin never counts, on
 * top of SameSite=Strict.
 */
async function authorized(request, env, given = givenToken(request)) {
  const { rotated, key } = await masterKey(env);
  if (!key) return false;
  if (given.cookie) {
    if (request.method === "POST") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) return false;
    }
    const [exp, sig] = given.token.split(".");
    if (!/^\d{10}$/.test(exp ?? "") || Number(exp) * 1000 < Date.now()) return false;
    return sameToken(sig ?? "", await hmac(key, `session.${exp}.${await epochOf(env)}`));
  }
  // After a rotation from the admin page the new token's hash lives in D1 and
  // READING_TOKEN stops working; deleting that row brings the secret back.
  return rotated ? sameToken(await sha256(given.token), rotated) : sameToken(given.token, key);
}

/** A new random token: its hash replaces the old one (ending every session), this browser gets a new session, and it is shown once. */
async function rotateToken(env, request) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('token_hash', ?1) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(await sha256(token)).run();
  return respond({ token }, 200, { "set-cookie": sessionCookie(await newSession(env), request) });
}

/** Same work as a hashed compare: neither the length nor the first wrong byte shows in the timing. */
async function sameToken(given, token) {
  const [a, b] = await Promise.all([given, token].map((s) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// ---------------------------------------------------------------- words by hand, cards, audio

/** A word or phrase typed by hand: the clipping rules, plus up to six words for phrases. */
function handTerm(v) {
  const clean = termOf(v);
  return clean && clean.length <= 60 && clean.split(" ").length <= 6 && /\p{L}/u.test(clean) ? clean : null;
}
const optional = (v, max) => (v === undefined ? undefined : text(v, max)); // undefined: leave alone; null: clear

async function addWord(env, input, now) {
  const term = handTerm(input?.term);
  if (!term) return null;
  const note = optional(input.note, 500) ?? null;
  const sentence = optional(input.sentence, 1000) ?? null;
  const today = dayOf(now);
  const seconds = Math.floor(now / 1000);
  // A word that is already a card (from a clipping) keeps its schedule and source; the note and sentence are added to it.
  await env.DB.prepare(
    `INSERT INTO cards (term, due, added_at, source, note, sentence, updated_at) VALUES (?1, ?2, ?3, 'manual', ?4, ?5, ?3)
     ON CONFLICT (term) DO UPDATE SET note = COALESCE(excluded.note, cards.note),
       sentence = COALESCE(excluded.sentence, cards.sentence),
       sentence_tr = CASE WHEN excluded.sentence IS NULL OR excluded.sentence = cards.sentence THEN cards.sentence_tr END,
       updated_at = excluded.updated_at`,
  )
    .bind(term, today, seconds, note, sentence)
    .run();
  await translateCardSentence(env, term, today);
  return (await cardsJson(env, now, term)).cards[0];
}

async function editWord(env, input, now) {
  const term = handTerm(input?.term);
  if (!term) return null;
  const db = env.DB;
  const card = await db.prepare("SELECT source, sentence FROM cards WHERE term = ?1").bind(term).first();
  if (!card) return undefined;
  let name = term;
  if (input.new_term !== undefined && input.new_term !== null && input.new_term !== "") {
    name = handTerm(input.new_term);
    if (!name) return null;
    // Only a word added by hand can be renamed: a clipped word is named by the reader.
    if (name !== term && card.source !== "manual") return { error: "clipped" };
    if (name !== term && (await db.prepare("SELECT 1 FROM cards WHERE term = ?1").bind(name).first())) return { error: "exists" };
  }
  const note = optional(input.note, 500);
  const sentence = optional(input.sentence, 1000);
  await db
    .prepare(
      `UPDATE cards SET term = ?2,
         note = CASE WHEN ?3 THEN ?4 ELSE note END,
         sentence = CASE WHEN ?5 THEN ?6 ELSE sentence END,
         sentence_tr = CASE WHEN ?5 AND ?6 IS NOT sentence THEN NULL ELSE sentence_tr END,
         updated_at = ?7
       WHERE term = ?1`,
    )
    .bind(term, name, note !== undefined ? 1 : 0, note ?? null, sentence !== undefined ? 1 : 0, sentence ?? null, Math.floor(now / 1000))
    .run();
  if (name !== term)
    // ponytail: the old recording's R2 object stays behind (a few KB); sweep reading/audio/ if renames ever pile up.
    await db.batch([db.prepare("UPDATE daily SET term = ?2 WHERE term = ?1").bind(term, name), db.prepare("DELETE FROM audio WHERE term = ?1").bind(term)]);
  await translateCardSentence(env, name, dayOf(now));
  return (await cardsJson(env, now, name)).cards[0];
}

async function deleteWord(env, input) {
  const term = handTerm(input?.term);
  if (!term) return null;
  const card = await env.DB.prepare("SELECT source FROM cards WHERE term = ?1").bind(term).first();
  if (!card) return undefined;
  // A clipped word goes when its clipping is deleted on the reader, not here.
  if (card.source !== "manual") return { error: "clipped" };
  await env.DB.prepare("DELETE FROM cards WHERE term = ?1 AND source = 'manual'").bind(term).run();
  return { term, deleted: true };
}

async function translateCardSentence(env, term, today) {
  const row = await env.DB.prepare("SELECT sentence FROM cards WHERE term = ?1 AND sentence IS NOT NULL AND sentence_tr IS NULL").bind(term).first();
  if (!row) return;
  const tr = await translateOne(env, row.sentence, today);
  if (tr) await env.DB.prepare("UPDATE cards SET sentence_tr = ?2 WHERE term = ?1").bind(term, tr).run();
}

/** Every live card, due first, with meaning, IPA, examples, its clipped sentence and its recording. */
async function cardsJson(env, now, only = null) {
  const db = env.DB;
  const today = dayOf(now);
  const { results } = await db
    .prepare(
      `SELECT c.term, c.source, c.box, c.due, c.reviews, c.note, c.sentence, c.sentence_tr, c.added_at,
         b.title AS book, s.text AS clipped, s.translation AS clipped_tr,
         a.r2_key, a.file, a.author, a.license, a.license_url
       FROM cards c
       LEFT JOIN clippings w ON w.id = (SELECT id FROM clippings WHERE kind = 'word' AND deleted = 0 AND term = c.term ORDER BY created_at LIMIT 1)
       LEFT JOIN books b ON b.document = w.document
       LEFT JOIN clippings s ON s.id = (SELECT s2.id FROM clippings s2 WHERE s2.kind = 'sentence' AND s2.deleted = 0 AND s2.document = w.document
                                          AND instr(lower(s2.text), c.term) > 0 ORDER BY abs(s2.created_at - w.created_at) LIMIT 1)
       LEFT JOIN audio a ON a.term = c.term
       WHERE (c.source = 'manual' OR w.id IS NOT NULL) AND (?2 IS NULL OR c.term = ?2)
       ORDER BY c.due <= ?1 DESC, c.due, c.added_at DESC, c.term
       LIMIT 2000`,
    )
    .bind(today, only)
    .all();
  const { dict, facts } = await wordFacts(db, results.map((r) => r.term));
  const keys = [...new Set(results.flatMap((r) => [r.term, dict.get(r.term).lemma].filter(Boolean)))];
  const { results: ex } = keys.length
    ? await db.prepare("SELECT word, id, en, tr FROM examples WHERE word IN (SELECT value FROM json_each(?1)) ORDER BY word, id").bind(J(keys)).all()
    : { results: [] };
  const examples = Map.groupBy(ex, (e) => e.word);
  const files = (env.FILES_URL ?? "https://files.busahin.com").replace(/\/$/, "");
  return {
    today,
    cards: results.map((r) => {
      const d = dict.get(r.term);
      const f = facts.get(r.term);
      const pre = f.pre ?? {};
      const own = examples.get(r.term) ?? [];
      return {
        term: r.term,
        source: r.source,
        added_at: r.added_at,
        box: r.box,
        due: r.due,
        reviews: r.reviews,
        // A book list's entry (made for that book) wins over the general dictionary.
        ipa: d.ipa ?? (pre.ipa ? pre.ipa.replace(/^\/|\/$/g, "") : null),
        tr: pre.tr || d.tr,
        def: d.def ?? pre.def ?? null,
        rank: f.rank,
        band: band(f.rank),
        awl: f.awl,
        lists: pre.books ? [...new Set(pre.books.split("\n"))] : [],
        note: r.note,
        sentence: r.sentence,
        sentence_tr: r.sentence_tr,
        book: r.book,
        clipped: r.clipped,
        clipped_tr: r.clipped_tr,
        // The word as written first, then its headword's.
        examples: [...own, ...(d.lemma && d.lemma !== r.term ? (examples.get(d.lemma) ?? []) : [])].slice(0, 3).map(({ id, en, tr }) => ({ id, en, tr })),
        audio: r.r2_key ? { url: `${files}/${r.r2_key}`, file: r.file, author: r.author, license: r.license, license_url: r.license_url } : null,
      };
    }),
  };
}

const stripTags = (html) => text(String(html ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"'), 200);

/** English recordings, best first: American, British, Australian, then Lingua Libre and any other English file. */
function pickRecording(files) {
  const rank = (f) =>
    /^File:En-us-/i.test(f) ? 0 : /^File:En-(uk|gb)-/i.test(f) ? 1 : /^File:En-au-/i.test(f) ? 2 : /^File:LL-Q1860 \(eng\)-/i.test(f) ? 3 : /^File:En-[a-z]{2}-/i.test(f) ? 4 : 9;
  return files.filter((f) => /\.(ogg|oga|opus|wav|mp3|flac)$/i.test(f) && rank(f) < 9).sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/** A human recording of the term from the English Wiktionary page's audio on Wikimedia Commons, or null. */
async function commonsAudio(term) {
  const get = async (url) => {
    const res = await fetch(url, { headers: WIKI_HEADERS, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`${new URL(url).host}: HTTP ${res.status}`);
    return res.json();
  };
  const page = (await get(`https://en.wiktionary.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=images&imlimit=100&titles=${encodeURIComponent(term)}`))
    .query?.pages?.[0];
  const file = pickRecording((page?.images ?? []).map((i) => i.title));
  if (!file) return null;
  const info = (
    await get(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo|videoinfo&iiprop=url|extmetadata&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl&viprop=derivatives&titles=${encodeURIComponent(file)}`,
    )
  ).query?.pages?.[0];
  const meta = info?.imageinfo?.[0];
  const mp3 = info?.videoinfo?.[0]?.derivatives?.find((d) => d.type === "audio/mpeg")?.src ?? (/\.mp3(\?|$)/i.test(meta?.url ?? "") ? meta.url : null);
  if (!mp3 || !/^https:\/\/upload\.wikimedia\.org\//.test(mp3)) return null;
  return {
    mp3,
    file: file.replace(/^File:/, ""),
    author: stripTags(meta.extmetadata?.Artist?.value),
    license: text(meta.extmetadata?.LicenseShortName?.value, 60),
    license_url: text(meta.extmetadata?.LicenseUrl?.value, 200),
  };
}

/**
 * The term's recording: kept in R2 once found, so it is fetched from Wikimedia
 * once ever. A term with none is asked about again after AUDIO_RETRY.
 */
async function ensureAudio(env, term, now) {
  const db = env.DB;
  const seconds = Math.floor(now / 1000);
  const row = await db.prepare("SELECT * FROM audio WHERE term = ?1").bind(term).first();
  if (row && (row.r2_key || seconds - row.checked_at < AUDIO_RETRY)) return row;
  if (!env.FILES) return row;
  const today = dayOf(now);
  const room = await db
    .prepare("INSERT INTO daily (day, audio) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET audio = audio + 1 WHERE daily.audio < ?2 RETURNING audio")
    .bind(today, AUDIO_PER_DAY)
    .first();
  if (!room) return row;
  const found = await commonsAudio(term);
  let key = null;
  if (found) {
    const res = await fetch(found.mp3, { headers: { "user-agent": WIKI_HEADERS["user-agent"] }, signal: AbortSignal.timeout(15_000) });
    const bytes = res.ok ? await res.arrayBuffer() : null;
    if (bytes && bytes.byteLength > 0 && bytes.byteLength <= AUDIO_MAX_BYTES) {
      // A random name: the files Worker serves anything in the bucket, and this way no URL names the word.
      key = `reading/audio/${crypto.randomUUID()}.mp3`;
      await env.FILES.put(key, bytes, { httpMetadata: { contentType: "audio/mpeg", cacheControl: "public, max-age=31536000, immutable" } });
    }
  }
  const kept = key ? found : {};
  await db
    .prepare(
      `INSERT INTO audio (term, r2_key, file, author, license, license_url, checked_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT (term) DO UPDATE SET r2_key = excluded.r2_key, file = excluded.file, author = excluded.author,
         license = excluded.license, license_url = excluded.license_url, checked_at = excluded.checked_at`,
    )
    .bind(term, key, kept.file ?? null, kept.author ?? null, kept.license ?? null, kept.license_url ?? null, seconds)
    .run();
  return db.prepare("SELECT * FROM audio WHERE term = ?1").bind(term).first();
}

async function audioFor(env, input, now) {
  const term = handTerm(input?.term);
  if (!term) return null;
  if (!(await env.DB.prepare("SELECT 1 FROM cards WHERE term = ?1").bind(term).first())) return undefined;
  await ensureAudio(env, term, now);
  return { audio: (await cardsJson(env, now, term)).cards[0]?.audio ?? null };
}

// ---------------------------------------------------------------- notifications and settings

const SETTINGS = {
  morning: { on: true, hour: 8 }, // the word of the day, the streak, and a word if syncing has stopped
  evening: { on: true, hour: 21 }, // only when the streak would break tonight
  weekly: { on: true, hour: 10 }, // Sundays: the week in numbers
};

async function getSettings(db) {
  const rows = (await db.prepare("SELECT key, value FROM settings WHERE key IN ('morning', 'evening', 'weekly')").all()).results;
  const saved = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, { ...v, ...saved[k] }]));
}

async function setSettings(env, input) {
  if (!isRecord(input)) return null;
  const db = env.DB;
  const statements = [];
  for (const [key, value] of Object.entries(input)) {
    if (!(key in SETTINGS) || !isRecord(value)) return null;
    const clean = {};
    if (value.on !== undefined) {
      if (typeof value.on !== "boolean") return null;
      clean.on = value.on;
    }
    if (value.hour !== undefined) {
      if (!Number.isInteger(value.hour) || value.hour < 0 || value.hour > 23) return null;
      clean.hour = value.hour;
    }
    statements.push(
      db
        .prepare("INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET value = json_patch(settings.value, excluded.value)")
        .bind(key, J(clean)),
    );
  }
  if (statements.length) await db.batch(statements);
  return getSettings(db);
}

const hourFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" });
const weekdayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The morning push, in English: the point is reading English. */
function notification(word, current, health = []) {
  const line = current > 0 ? `Streak: ${plural(current, "day", "days")}.` : "No streak right now. A page today starts one.";
  if (!word) return { title: "Reading", message: [`No words clipped yet.`, line, ...health].join("\n") };
  const head = [word.ipa && `/${word.ipa}/`, word.tr].filter(Boolean).join("  ·  ");
  return { title: word.term, message: [head, word.def, line, ...health].filter(Boolean).join("\n") };
}

/** JSON publishing, so Turkish letters and IPA survive (ntfy headers are ASCII). */
async function push(env, title, message) {
  const res = await fetch(env.NTFY_URL || "https://ntfy.sh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: J({ topic: env.NTFY_TOPIC, title, message, tags: ["books"], click: `${SITE}/reading/` }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`ntfy: HTTP ${res.status}`);
}

/** Once a day: sets the flag and reports whether this call was the one that set it. */
async function once(db, today, flag) {
  const row = await db
    .prepare(`INSERT INTO daily (day, ${flag}) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET ${flag} = 1 WHERE daily.${flag} = 0 RETURNING day`)
    .bind(today)
    .first();
  return Boolean(row);
}

/** Lines the morning push adds when the reader or the pull has gone quiet. */
async function healthLines(db, now) {
  const today = dayOf(now);
  const [lastRead, lastOk] = await Promise.all([
    db.prepare("SELECT MAX(day) AS day FROM days WHERE syncs > 0").first("day"),
    db.prepare("SELECT MAX(at) AS at FROM sync_log WHERE ok = 1").first("at"),
  ]);
  const lines = [];
  if (lastRead && between(lastRead, today) >= 3) lines.push(`Nothing synced from the reader for ${plural(between(lastRead, today), "day", "days")}.`);
  if (lastOk && now / 1000 - lastOk > 86_400) lines.push("The pull from CrossPoint Sync has been failing for over a day.");
  return lines;
}

async function notify(env, now) {
  if (!env.NTFY_TOPIC) return false;
  const db = env.DB;
  const today = dayOf(now);
  if (await db.prepare("SELECT notified FROM daily WHERE day = ?1").bind(today).first("notified")) return false;
  const [word, days, health] = await Promise.all([wordOfDay(db, today), readingDays(db), healthLines(db, now)]);
  const { title, message } = notification(word, streak(days, today).current, health);
  await push(env, title, message);
  await db.prepare("INSERT INTO daily (day, notified) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET notified = 1").bind(today).run();
  return true;
}

/** The evening push, only when there is a streak and nothing has been read today. */
async function eveningPush(env, now) {
  const db = env.DB;
  const today = dayOf(now);
  const days = await readingDays(db);
  const current = streak(days, today).current;
  if (!current || days.includes(today) || !(await once(db, today, "evening"))) return false;
  await push(env, "Streak at risk", `${plural(current, "day", "days")} in a row. A page before midnight keeps it.`);
  return true;
}

/** Sunday's push: the last seven days in numbers. */
async function weeklyPush(env, now) {
  const db = env.DB;
  const today = dayOf(now);
  const from = addDays(today, -6);
  const since = Math.floor(Date.parse(`${from}T00:00:00+03:00`) / 1000);
  const [read, added, reviewed, matured] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS days, COALESCE(SUM(pages), 0) AS pages FROM days WHERE day >= ?1 AND (syncs > 0 OR pages > 0)").bind(from).first(),
    db.prepare("SELECT COUNT(*) AS n FROM cards WHERE added_at >= ?1").bind(since).first("n"),
    db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(grade = 'good'), 0) AS good FROM reviews WHERE day >= ?1").bind(from).first(),
    db.prepare("SELECT COUNT(*) AS n FROM cards WHERE matured_at >= ?1").bind(since).first("n"),
  ]);
  if (!(await once(db, today, "weekly"))) return false;
  const accuracy = reviewed.n ? `, ${Math.round((reviewed.good / reviewed.n) * 100)}% right` : "";
  await push(
    env,
    "The week",
    [
      `${plural(read.days, "day", "days")} read, ${plural(read.pages, "page", "pages")}.`,
      `${plural(added, "word", "words")} added, ${plural(reviewed.n, "review", "reviews")}${accuracy}.`,
      `${plural(matured, "word", "words")} learned.`,
    ].join("\n"),
  );
  return true;
}

/** On the hour: whichever pushes are switched on for this hour. */
async function notifications(env, now) {
  if (!env.NTFY_TOPIC) return [];
  const settings = await getSettings(env.DB);
  const hour = Number(hourFormat.format(now));
  const sent = [];
  if (settings.morning.on && hour === settings.morning.hour && (await notify(env, now))) sent.push("morning");
  if (settings.evening.on && hour === settings.evening.hour && (await eveningPush(env, now))) sent.push("evening");
  if (settings.weekly.on && hour === settings.weekly.hour && weekdayFormat.format(now) === "Sun" && (await weeklyPush(env, now))) sent.push("weekly");
  return sent;
}

/**
 * The pull, with its outcome logged (sync_log keeps the last 200 rows) and the
 * latest kept in meta ('last_pull'). Never throws: the outcome says why it
 * failed (endpoint, status or shape; never credentials or answer data).
 */
async function pull(env, now, trigger = "manual") {
  const started = Date.now();
  let outcome;
  try {
    outcome = { ok: true, result: await ingest(env, now) };
  } catch (error) {
    outcome = { ok: false, error: String(error?.message ?? error).slice(0, 300) };
    console.error(outcome.error);
  }
  const at = Math.floor(now / 1000);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO sync_log (at, trigger, ok, result, error, ms) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(
      at,
      trigger,
      outcome.ok ? 1 : 0,
      outcome.ok ? J(outcome.result) : null,
      outcome.ok ? null : outcome.error,
      Date.now() - started,
    ),
    env.DB.prepare("DELETE FROM sync_log WHERE id <= (SELECT MAX(id) - 200 FROM sync_log)"),
    env.DB.prepare("INSERT INTO meta (key, value, updated_at) VALUES ('last_pull', ?1, ?2) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(
      J({ at, ...outcome }),
      at,
    ),
  ]).catch((error) => console.error(error));
  return outcome;
}

// ---------------------------------------------------------------- the private app's data

/** Rank and Academic Word List membership for terms: the book lists first, then Tatoeba's frequencies. */
async function wordFacts(db, terms) {
  const dict = await lookup(db, terms);
  // Every form a word might be ranked or listed under: itself, its dictionary entry, its plain stems.
  const forms = new Map(terms.map((t) => [t, [...new Set([t, dict.get(t)?.lemma, ...candidates(t)].filter(Boolean))]]));
  const keys = [...new Set([...forms.values()].flat())];
  if (!keys.length) return { dict, facts: new Map() };
  const [pre, ranks] = await db.batch([
    db
      .prepare(
        `SELECT term, lemma, MIN(rank) AS rank, MAX(awl) AS awl, MAX(awl_headword) AS awl_headword, MAX(ipa) AS ipa, MAX(NULLIF(tr, '')) AS tr, MAX(def) AS def,
                GROUP_CONCAT(book, char(10)) AS books
         FROM prestudy WHERE term IN (SELECT value FROM json_each(?1)) OR lemma IN (SELECT value FROM json_each(?1)) GROUP BY term`,
      )
      .bind(J(keys)),
    db.prepare("SELECT word, rank FROM ranks WHERE word IN (SELECT value FROM json_each(?1))").bind(J(keys)),
  ]);
  const byKey = new Map();
  for (const r of pre.results) for (const k of [r.term, r.lemma]) if (k && !byKey.has(k)) byKey.set(k, r);
  const rank = new Map(ranks.results.map((r) => [r.word, r.rank]));
  const facts = new Map(
    terms.map((t) => {
      const lemma = dict.get(t)?.lemma;
      const p = forms.get(t).map((f) => byKey.get(f)).find(Boolean);
      // A word is as common as its commonest form: "boats" ranks with "boat".
      const found = forms.get(t).map((f) => rank.get(f)).filter(Boolean);
      const r = found.length ? Math.min(...found) : null;
      return [t, { rank: p?.rank ?? r ?? null, awl: p?.awl ? p.awl_headword || lemma || t : null, pre: p ?? null }];
    }),
  );
  return { dict, facts };
}

const BANDS = [
  [1000, "1-1000"],
  [2000, "1001-2000"],
  [5000, "2001-5000"],
  [10000, "5001-10000"],
  [Infinity, "10000+"],
];
const band = (rank) => (rank ? BANDS.find(([max]) => rank <= max)[1] : "unranked");
const RARE = 3000; // a word past the 3000 commonest is worth proposing from a sentence

/** Clipped sentences with their translation and the rare words in each, rarest first (sentence mining). */
async function sentencesMined(env) {
  const db = env.DB;
  const { results } = await db
    .prepare(
      `SELECT s.id, s.text, s.translation AS tr, b.title AS book, s.chapter, s.created_at
       FROM clippings s LEFT JOIN books b ON b.document = s.document
       WHERE s.kind = 'sentence' AND s.deleted = 0 ORDER BY s.created_at DESC LIMIT 200`,
    )
    .all();
  const tokens = (t) => [...new Set((tidy(t).toLowerCase().match(/\p{L}+(?:['-]\p{L}+)*/gu) ?? []).filter((w) => w.length > 2))];
  const all = [...new Set(results.flatMap((r) => tokens(r.text)))];
  const { dict, facts } = await wordFacts(db, all);
  const cards = new Set(
    (await db.prepare("SELECT term FROM cards WHERE term IN (SELECT value FROM json_each(?1))").bind(J([...all, ...[...dict.values()].map((d) => d.lemma).filter(Boolean)])).all()).results.map(
      (r) => r.term,
    ),
  );
  return {
    items: results.map((r) => ({
      ...r,
      words: tokens(r.text)
        .map((w) => ({ w, d: dict.get(w), f: facts.get(w) }))
        // A word worth a card: the dictionary knows it, it is rare (or unranked), and it is not a card yet.
        .filter(({ w, d, f }) => d?.lemma && (!f.rank || f.rank > RARE) && !cards.has(w) && !cards.has(d.lemma))
        .sort((a, b) => (b.f.rank ?? 1e9) - (a.f.rank ?? 1e9))
        .slice(0, 5)
        .map(({ w, d, f }) => ({ word: w, lemma: d.lemma, rank: f.rank, ipa: d.ipa, tr: d.tr })),
    })),
  };
}

/** What the public page cannot show: states over time, accuracy, words added, coverage, books. */
async function progress(env, now) {
  const db = env.DB;
  const today = dayOf(now);
  const [cardRows, reviewRows, bookRows, preBooks] = (
    await db.batch([
      db.prepare(`SELECT term, box, reviews, added_at, source FROM cards WHERE ${LIVE_TERM}`),
      db.prepare("SELECT term, grade, box_after, day, reviewed_at FROM reviews ORDER BY reviewed_at"),
      db.prepare(
        `SELECT COALESCE(b.public_title, b.title, b.filename, w.document) AS book, COUNT(DISTINCT c.term) AS cards, COALESCE(SUM(c.box >= ${LEARNED}), 0) AS learned
         FROM clippings w JOIN cards c ON c.term = w.term LEFT JOIN books b ON b.document = w.document
         WHERE w.kind = 'word' AND w.deleted = 0 GROUP BY w.document ORDER BY cards DESC`,
      ),
      db.prepare(
        `SELECT p.book, COUNT(*) AS words, COUNT(c.term) AS cards, COALESCE(SUM(c.box >= ${LEARNED}), 0) AS learned
         FROM prestudy p LEFT JOIN cards c ON c.term = p.term OR c.term = p.lemma GROUP BY p.book ORDER BY p.book`,
      ),
    ])
  ).map((r) => r.results);

  // Twelve weeks, Monday to Sunday, each counted as it stood at the week's end.
  const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(monday, -7 * (11 - i)));
  const byTerm = Map.groupBy(reviewRows, (r) => r.term);
  const series = weeks.map((start) => {
    const end = addDays(start, 6);
    const endAt = Date.parse(`${end}T23:59:59+03:00`) / 1000;
    const startAt = Date.parse(`${start}T00:00:00+03:00`) / 1000;
    const counts = { week: start, new: 0, learning: 0, review: 0, learned: 0, added: 0, reviews: 0, good: 0 };
    for (const c of cardRows) {
      if (c.added_at > endAt) continue;
      if (c.added_at >= startAt) counts.added++;
      const last = (byTerm.get(c.term) ?? []).filter((r) => r.day <= end).at(-1);
      const box = last?.box_after;
      counts[!last ? "new" : box >= LEARNED ? "learned" : box >= 3 ? "review" : "learning"]++;
    }
    for (const r of reviewRows) if (r.day >= start && r.day <= end) (counts.reviews++, r.grade === "good" && counts.good++);
    return counts;
  });
  const since30 = addDays(today, -29);
  const recent = reviewRows.filter((r) => r.day >= since30);
  const rate = (rows) => (rows.length ? Math.round((rows.filter((r) => r.grade === "good").length / rows.length) * 100) : null);

  const { facts } = await wordFacts(db, cardRows.map((c) => c.term));
  const bands = Object.fromEntries([...BANDS.map(([, b]) => [b, 0]), ["unranked", 0]]);
  const awlMet = new Set();
  const awlLearned = new Set();
  for (const c of cardRows) {
    const f = facts.get(c.term);
    bands[band(f.rank)]++;
    if (f.awl) (awlMet.add(f.awl), c.box >= LEARNED && awlLearned.add(f.awl));
  }
  const listed = await db.prepare("SELECT COUNT(DISTINCT awl_headword) AS n FROM prestudy WHERE awl = 1").first("n");
  return {
    today,
    weeks: series,
    accuracy: { all: rate(reviewRows), last30: rate(recent), reviews: reviewRows.length },
    bands,
    // The Academic Word List has 570 headword families (Coxhead, 2000).
    awl: { met: awlMet.size, learned: awlLearned.size, in_lists: listed, families: 570 },
    books: bookRows,
    lists: preBooks,
  };
}

/** The admin panel: recent pulls, today's quotas, settings. */
async function adminData(env, now) {
  const db = env.DB;
  const today = dayOf(now);
  const [log, daily, rotated] = await db.batch([
    db.prepare("SELECT at, trigger, ok, result, error, ms FROM sync_log ORDER BY id DESC LIMIT 20"),
    db.prepare("SELECT translations, audio FROM daily WHERE day = ?1").bind(today),
    db.prepare("SELECT 1 FROM settings WHERE key = 'token_hash'"),
  ]);
  return {
    sync: log.results.map((r) => ({ ...r, ok: Boolean(r.ok), result: r.result ? JSON.parse(r.result) : null })),
    quota: {
      translations: { used: daily.results[0]?.translations ?? 0, of: TRANSLATE_PER_DAY },
      audio: { used: daily.results[0]?.audio ?? 0, of: AUDIO_PER_DAY },
    },
    settings: await getSettings(db),
    notifications: Boolean(env.NTFY_TOPIC),
    token_rotated: rotated.results.length > 0,
  };
}

/** Every table that is his: cards, reviews, clippings, books, word lists, settings (never the token hash). */
async function exportAll(env) {
  const db = env.DB;
  const names = ["cards", "reviews", "clippings", "books", "days", "book_days", "prestudy", "audio", "sync_log"];
  const out = await db.batch([...names.map((n) => db.prepare(`SELECT * FROM ${n}`)), db.prepare("SELECT key, value FROM settings WHERE key <> 'token_hash'")]);
  return Object.fromEntries([...names, "settings"].map((n, i) => [n, out[i].results]));
}

/** Replaces one book's pre-study list with the words from its companion file. */
async function importList(env, input) {
  if (!isRecord(input) || !text(input.book, 200) || !Array.isArray(input.words) || input.words.length > 5000) return null;
  const book = text(input.book, 200);
  const words = [];
  for (const w of input.words) {
    if (!isRecord(w)) continue;
    const term = typeof w.word === "string" ? termOf(w.word) : "";
    if (!term || term.length > 60 || !/\p{L}/u.test(term)) continue;
    words.push({
      term,
      lemma: termOf(w.lemma) || null,
      chapter: int(w.chapter, 0, 10_000),
      chapter_title: text(w.chapter_title, 200),
      rank: int(w.rank, 1, 10_000_000),
      ipa: text(w.ipa, 80),
      tr: text(w.turkish, 300),
      def: text(w.definition, 500),
      awl: w.awl === true ? 1 : 0,
      awl_headword: termOf(w.awl_headword) || null,
      count: int(w.count, 0, 1_000_000),
    });
  }
  const db = env.DB;
  await db.batch([
    db.prepare("DELETE FROM prestudy WHERE book = ?1").bind(book),
    ...chunks(words, 500).map((part) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO prestudy (book, term, lemma, chapter, chapter_title, rank, ipa, tr, def, awl, awl_headword, count)
           SELECT ?1, value->>'term', value->>'lemma', value->>'chapter', value->>'chapter_title', value->>'rank', value->>'ipa', value->>'tr',
                  value->>'def', value->>'awl', value->>'awl_headword', value->>'count' FROM json_each(?2)`,
        )
        .bind(book, J(part)),
    ),
  ]);
  return { book, words: words.length, skipped: input.words.length - words.length };
}

// ---------------------------------------------------------------- HTTP

const respond = (body, status, headers = {}) =>
  new Response(typeof body === "string" ? body : J(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

// Installs the private page to the phone's home screen. Neutral words only:
// the manifest is fetched without the cookie, so anyone can read it.
const MANIFEST = {
  name: "Reading",
  short_name: "Reading",
  start_url: "/api/reading/app#today",
  scope: "/api/reading/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#ffffff",
  icons: [
    { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
  ],
};

const PUBLIC = { "/api/reading/summary": summary, "/api/reading/today": todayCard };

const readJson = async (request, max = 2000) => {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
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
  "GET /api/reading/cards": (env, request, now) => cardsJson(env, now),
  "POST /api/reading/words": async (env, request, now) => answer(await addWord(env, await readJson(request), now)),
  "POST /api/reading/words/edit": async (env, request, now) => answer(await editWord(env, await readJson(request), now)),
  "POST /api/reading/words/delete": async (env, request) => answer(await deleteWord(env, await readJson(request))),
  "POST /api/reading/audio": async (env, request, now) => answer(await audioFor(env, await readJson(request), now)),
  "GET /api/reading/today": (env, request, now) => todayCard(env, now, true),
  "GET /api/reading/cards.csv": async (env) =>
    respond(await cardsCsv(env), 200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="reading-cards.csv"' }),
  "GET /api/reading/sentences": (env) => sentences(env),
  // The reason a pull failed goes back to the owner (endpoint, status or shape;
  // never credentials or answer data), so production is diagnosable without logs.
  "POST /api/reading/sync": async (env, request, now) => {
    const out = await pull(env, now, "manual");
    return out.ok ? out.result : respond({ error: "pull failed", reason: out.error }, 502);
  },
  "POST /api/reading/review": async (env, request, now) => answer(await review(env, await readJson(request), now)),
  "GET /api/reading/sentences/mined": (env) => sentencesMined(env),
  "GET /api/reading/progress": (env, request, now) => progress(env, now),
  "GET /api/reading/admin": (env, request, now) => adminData(env, now),
  "POST /api/reading/admin/settings": async (env, request) => answer(await setSettings(env, await readJson(request))),
  "POST /api/reading/admin/token": (env, request) => rotateToken(env, request),
  "GET /api/reading/export.json": async (env) =>
    respond(await exportAll(env), 200, { "content-disposition": 'attachment; filename="reading-export.json"' }),
  "POST /api/reading/prestudy": async (env, request) => answer(await importList(env, await readJson(request, 2_000_000))),
  "GET /api/reading/books": (env) => booksList(env),
  "POST /api/reading/books": async (env, request, now) => answer(await setBook(env, await readJson(request), now)),
};

// The private page and its sign-in. Strict headers: no framing, no indexing,
// scripts and styles only with this response's nonce.
function html(body, status, nonce, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "same-origin",
      "x-frame-options": "DENY",
      "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; font-src 'self'; connect-src 'self'; media-src https://files.busahin.com; img-src 'self' data:; manifest-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
      ...extra,
    },
  });
}

async function pageRoute(request, env, path) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const url = new URL(request.url);
  // Never over plain http (outside local development): a cookie or a token must not cross the wire in clear.
  if (url.protocol !== "https:" && url.hostname !== "localhost") return new Response(null, { status: 403 });
  const origin = request.headers.get("origin");
  if (request.method === "POST" && origin && origin !== url.origin) return new Response(null, { status: 403 });
  if (path === "/api/reading/app" && request.method === "GET")
    return (await authorized(request, env)) ? html(appPage(nonce), 200, nonce) : html(loginPage(nonce), 401, nonce);
  if (path === "/api/reading/login" && request.method === "POST") {
    // Five tries a minute per visitor on top of the general limit; the token is 64 hex characters anyway.
    if (env.LOGIN && !(await env.LOGIN.limit({ key: request.headers.get("cf-connecting-ip") ?? "unknown" })).success)
      return html(loginPage(nonce, true), 429, nonce);
    const length = request.headers.get("content-length");
    if (length === null) return new Response(null, { status: 411 });
    if (Number(length) > 2000) return new Response(null, { status: 413 });
    const token = String((await request.formData().catch(() => null))?.get("token") ?? "");
    if (!(await authorized(request, env, { token, cookie: false }))) return html(loginPage(nonce, true), 401, nonce);
    return new Response(null, {
      status: 303,
      headers: { location: "/api/reading/app", "cache-control": "no-store", "set-cookie": sessionCookie(await newSession(env), request) },
    });
  }
  if (path === "/api/reading/logout" && request.method === "POST") {
    // Signing out ends every session (the epoch moves on), but only when it is the owner asking.
    if (await authorized(request, env))
      await env.DB.prepare(
        "INSERT INTO settings (key, value) VALUES ('session_epoch', '1') ON CONFLICT (key) DO UPDATE SET value = CAST(settings.value AS INTEGER) + 1",
      ).run();
    return new Response(null, { status: 303, headers: { location: "/api/reading/app", "cache-control": "no-store", "set-cookie": sessionCookie("", request) } });
  }
  return null;
}

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

      if (path === "/api/reading/app.webmanifest" && request.method === "GET")
        return new Response(J(MANIFEST), { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=86400", "x-robots-tag": "noindex" } });
      if (["/api/reading/app", "/api/reading/login", "/api/reading/logout"].includes(path))
        return (await pageRoute(request, env, path)) ?? new Response(null, { status: 405 });

      const route = PRIVATE[`${request.method} ${path}`];
      const given = givenToken(request);
      // today is public, and private only with a bearer token or a session that is still good.
      const asOwner = route && PUBLIC[path] ? (given.cookie ? await authorized(request, env, given) : Boolean(given.token)) : true;
      const privatePath = !PUBLIC[path] && Object.keys(PRIVATE).some((k) => k.endsWith(` ${path}`));
      if ((route && asOwner) || privatePath) {
        // Without the token a private route answers exactly like a path that does not exist.
        if (!(await authorized(request, env, given))) return new Response(null, { status: 404 });
        if (!route) return new Response(null, { status: 405 });
        const out = await route(env, request, Date.now(), ctx);
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
      return new Response(null, { status: 404 });
    } catch (error) {
      // Most likely a free daily allowance is spent, or CrossPoint Sync is down.
      console.error(error);
      return respond({ error: "unavailable" }, 503, cors);
    }
  },

  async scheduled(event, env, ctx) {
    const now = event.scheduledTime ?? Date.now();
    // On the hour the notifications go first, so a slow pull never delays the morning word.
    const onTheHour = new Date(now).getUTCMinutes() < 30;
    ctx.waitUntil((async () => {
      if (onTheHour) await notifications(env, now).catch((error) => console.error(error));
      await pull(env, now, "cron");
    })());
  },
};

// For check.mjs.
export { addDays, addWord, adminData, audioFor, authorized, band, booksList, buildSummary, candidates, cardsCsv, cardsJson, classify, commonsAudio, dayOf, deleteWord, derive, editWord, ensureAudio, eveningPush, exportAll, forecast, getSettings, handTerm, healthLines, importList, ingest, nextBox, notification, notifications, notify, pace, pickRecording, progress, publicTitle, pull, review, rotateToken, sentences, sentencesMined, setBook, setSettings, streak, summary, termOf, todayCard, weeklyPush, wordFacts };
