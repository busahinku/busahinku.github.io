// Reading statistics and a vocabulary loop for busahin.com/reading, at
// https://busahin.com/api/reading. The e-reader syncs only to CrossPoint Sync,
// which stays the system of record; every thirty minutes a cron pulls what it
// knows into D1 and derives the rest. Nothing here depends on the reader's
// plugin events. Workers free plan, D1 and Workers AI: running out of the daily
// allowance ends in an error, never a charge.
//
// Public:  GET  /api/reading/summary   streak, activity, books, word counts
//          GET  /api/reading/today     word of the day and the streak
// Private (Authorization: Bearer READING_TOKEN):
//          GET  /api/reading/cards.csv Anki import of the vocabulary
//          GET  /api/reading/sentences clipped sentences with translations
//          POST /api/reading/review    {"term", "grade": "good" | "again"}
//          POST /api/reading/sync      pull from CrossPoint Sync now
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
/** A clipping of three words or fewer is vocabulary; anything longer is a sentence. */
function classify(text) {
  const clean = String(text ?? "").replace(/\s+/g, " ").replace(EDGES, "");
  if (!clean) return null;
  if (clean.split(" ").length <= 3 && clean.length <= 60) return { kind: "word", term: clean.toLowerCase().replace(/[‘’]/g, "'") };
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
const int = (v) => (Number.isFinite(v) ? Math.round(v) : null);
const num = (v) => (Number.isFinite(v) ? v : null);

/** Rows for D1 from the Sync answers. Pure, so check.mjs can run it on the fixtures. */
function derive({ progress, activity, clippings }) {
  const act = new Map((activity.books ?? []).map((b) => [b.document, b]));
  const books = (progress.items ?? [])
    .filter((i) => DOC.test(i.document ?? ""))
    .map((i) => {
      const a = act.get(i.document) ?? {};
      return {
        document: i.document,
        title: text(i.title, 200) ?? text((i.filename ?? "").replace(/\.[a-z0-9]+$/i, ""), 200) ?? "Untitled",
        author: text(i.author, 200),
        percentage: num(i.percentage ?? a.percentage),
        status: STATUSES.has(i.status) ? i.status : null,
        page_count: int(i.page_count ?? a.page_count),
        started_at: int(a.started_at),
        last_at: int(a.last_at ?? i.timestamp),
        finished_at: int(a.finished_at),
        days_to_finish: int(a.days_to_finish),
      };
    });
  const days = [];
  const bookDays = [];
  for (const d of activity.days ?? []) {
    if (!DAY.test(d.day ?? "")) continue;
    days.push({ day: d.day, pages: int(d.pages) ?? 0, syncs: int(d.syncs) ?? 0 });
    for (const b of d.books ?? [])
      if (DOC.test(b.document ?? ""))
        bookDays.push({ day: d.day, document: b.document, pages: int(b.pages) ?? 0, syncs: int(b.syncs) ?? 0, from_pct: num(b.from), to_pct: num(b.to) });
  }
  const items = clippings.items ?? [];
  const clips = [];
  for (const c of items) {
    if (typeof c.id !== "string" || !DOC.test(c.id) || !DOC.test(c.document ?? "") || typeof c.text !== "string") continue;
    const kind = classify(c.text);
    if (kind) clips.push({ id: c.id, document: c.document, text: c.text.slice(0, 4096), chapter: text(c.chapter, 64), created_at: int(c.created_at), ...kind });
  }
  // A missing book or clipping only means "deleted" when the answer was the whole list.
  return { books, days, bookDays, clippings: clips, allBooks: !progress.next, allClippings: items.length < CLIPPINGS_MAX };
}

// ---------------------------------------------------------------- pulling from CrossPoint Sync

async function get(env, path, auth = true) {
  const headers = { accept: "application/json", "user-agent": "reading-worker" };
  if (auth) Object.assign(headers, { "x-auth-user": env.SYNC_USER, "x-auth-key": env.SYNC_KEY });
  const res = await fetch(new URL(path, env.SYNC_URL), { headers, signal: AbortSignal.timeout(20_000) });
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
 * Reads every endpoint first and writes nothing unless all of them answered,
 * then writes in one batch (a transaction). Re-running it on the same answers
 * changes nothing: every write is an upsert that skips identical rows.
 */
async function ingest(env, now = Date.now()) {
  if (!env.SYNC_USER || !env.SYNC_KEY) throw new Error("SYNC_USER and SYNC_KEY are not set");
  const tz = `tz=${TZ_OFFSET}`;
  // ponytail: one page of 500 books; derive() keeps books it did not see when there is a next page.
  const [health, progress, activity, overview, clippings] = await Promise.all([
    get(env, "/healthz", false).catch(() => "{}"),
    get(env, "/api/v1/progress?include_history=1&limit=500"),
    get(env, `/api/v1/stats/activity?${tz}`),
    get(env, `/api/v1/stats/overview?${tz}&days=365`),
    get(env, "/api/v1/clippings"),
  ]);
  const bodies = { progress, activity, overview, clippings };
  const parsed = Object.fromEntries(Object.entries(bodies).map(([k, v]) => [k, JSON.parse(v)]));
  const version = text(JSON.parse(health).version, 40);

  const db = env.DB;
  const stored = new Map((await db.prepare("SELECT endpoint, hash FROM raw").all()).results.map((r) => [r.endpoint, r.hash]));
  const hashes = Object.fromEntries(await Promise.all(Object.entries(bodies).map(async ([k, v]) => [k, await sha256(v)])));
  const changed = Object.keys(bodies).filter((k) => stored.get(k) !== hashes[k]);
  const rows = derive(parsed);
  const today = dayOf(now);
  const seconds = Math.floor(now / 1000);
  const statements = [];

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

  if (changed.includes("progress") || changed.includes("activity")) {
    statements.push(
      db
        .prepare(
          `INSERT INTO books (document, title, author, percentage, status, page_count, started_at, last_at, finished_at, days_to_finish)
           SELECT value->>'document', value->>'title', value->>'author', value->>'percentage', value->>'status', value->>'page_count',
                  value->>'started_at', value->>'last_at', value->>'finished_at', value->>'days_to_finish'
           FROM json_each(?1) WHERE true
           ON CONFLICT (document) DO UPDATE SET title = excluded.title, author = excluded.author, percentage = excluded.percentage,
             status = excluded.status, page_count = excluded.page_count, started_at = excluded.started_at, last_at = excluded.last_at,
             finished_at = excluded.finished_at, days_to_finish = excluded.days_to_finish
           WHERE (books.title, books.author, books.percentage, books.status, books.page_count, books.started_at, books.last_at, books.finished_at, books.days_to_finish)
             IS NOT (excluded.title, excluded.author, excluded.percentage, excluded.status, excluded.page_count, excluded.started_at, excluded.last_at, excluded.finished_at, excluded.days_to_finish)`,
        )
        .bind(J(rows.books)),
    );
    if (rows.allBooks)
      statements.push(db.prepare("DELETE FROM books WHERE document NOT IN (SELECT value->>'document' FROM json_each(?1))").bind(J(rows.books)));
  }

  if (changed.includes("activity")) {
    statements.push(
      db
        .prepare(
          `INSERT INTO days (day, pages, syncs) SELECT value->>'day', value->>'pages', value->>'syncs' FROM json_each(?1) WHERE true
           ON CONFLICT (day) DO UPDATE SET pages = excluded.pages, syncs = excluded.syncs
           WHERE (days.pages, days.syncs) IS NOT (excluded.pages, excluded.syncs)`,
        )
        .bind(J(rows.days)),
      db.prepare("DELETE FROM days WHERE day NOT IN (SELECT value->>'day' FROM json_each(?1))").bind(J(rows.days)),
      db
        .prepare(
          `INSERT INTO book_days (day, document, pages, syncs, from_pct, to_pct)
           SELECT value->>'day', value->>'document', value->>'pages', value->>'syncs', value->>'from_pct', value->>'to_pct' FROM json_each(?1) WHERE true
           ON CONFLICT (day, document) DO UPDATE SET pages = excluded.pages, syncs = excluded.syncs, from_pct = excluded.from_pct, to_pct = excluded.to_pct
           WHERE (book_days.pages, book_days.syncs, book_days.from_pct, book_days.to_pct) IS NOT (excluded.pages, excluded.syncs, excluded.from_pct, excluded.to_pct)`,
        )
        .bind(J(rows.bookDays)),
      db
        .prepare("DELETE FROM book_days WHERE (day, document) NOT IN (SELECT value->>'day', value->>'document' FROM json_each(?1))")
        .bind(J(rows.bookDays.map(({ day, document }) => ({ day, document })))),
    );
  }

  if (changed.includes("clippings")) {
    for (const part of chunks(rows.clippings, 500))
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
    if (rows.allClippings)
      statements.push(
        db
          .prepare("UPDATE clippings SET deleted = 1 WHERE deleted = 0 AND id NOT IN (SELECT value FROM json_each(?1))")
          .bind(J(rows.clippings.map((c) => c.id))),
      );
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO cards (term, due, added_at) SELECT DISTINCT term, ?1, ?2 FROM clippings WHERE kind = 'word' AND deleted = 0 AND term IS NOT NULL")
        .bind(today, seconds),
    );
  }

  await db.batch(statements);
  const translated = await translate(env, today, seconds);
  return { changed, books: rows.books.length, days: rows.days.length, clippings: rows.clippings.length, translated };
}

/** Translates the newest untranslated sentences, within the daily cap. Attempts count, so a failing model cannot eat the allowance. */
async function translate(env, today, seconds) {
  if (!env.AI) return 0;
  const db = env.DB;
  const used = (await db.prepare("SELECT translations FROM daily WHERE day = ?1").bind(today).first("translations")) ?? 0;
  const room = Math.min(TRANSLATE_PER_RUN, TRANSLATE_PER_DAY - used);
  if (room <= 0) return 0;
  const { results } = await db
    .prepare("SELECT id, text FROM clippings WHERE kind = 'sentence' AND deleted = 0 AND translation IS NULL ORDER BY created_at DESC LIMIT ?1")
    .bind(room)
    .all();
  const done = [];
  let tried = 0;
  for (const row of results) {
    tried++;
    try {
      const out = await env.AI.run(MODEL, { text: row.text, source_lang: "en", target_lang: "tr" });
      const tr = text(out?.translated_text, 8000);
      if (tr) done.push({ id: row.id, tr });
    } catch (error) {
      console.error(error); // most likely today's free allowance is spent; the next run tries again
      break;
    }
  }
  if (!tried) return 0;
  await db.batch([
    db
      .prepare(
        `UPDATE clippings SET translation = (SELECT value->>'tr' FROM json_each(?1) WHERE value->>'id' = clippings.id), translated_at = ?2
         WHERE id IN (SELECT value->>'id' FROM json_each(?1))`,
      )
      .bind(J(done), seconds),
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

async function summary(env, now) {
  const db = env.DB;
  const today = dayOf(now);
  const since = addDays(today, -370);
  const [books, days, recent, words, meta] = (
    await db.batch([
      db.prepare("SELECT * FROM books"),
      db.prepare("SELECT day, pages, syncs FROM days WHERE day >= ?1 AND (syncs > 0 OR pages > 0) ORDER BY day").bind(since),
      db.prepare("SELECT day, document, from_pct, to_pct FROM book_days WHERE day >= ?1").bind(addDays(today, 1 - PACE_WINDOW)),
      db.prepare(`SELECT COUNT(*) AS collected, COALESCE(SUM(box >= ${LEARNED}), 0) AS learned FROM cards WHERE ${LIVE_TERM}`),
      db.prepare("SELECT MAX(fetched_at) AS updated, (SELECT body FROM raw WHERE endpoint = 'overview') AS overview FROM raw"),
    ])
  ).map((r) => r.results);
  let overview = {};
  try {
    overview = JSON.parse(meta[0]?.overview ?? "{}");
  } catch {}
  const word = await wordOfDay(db, today);
  const day = (s) => (s ? dayOf(s * 1000) : null);

  const reading = books
    .filter((b) => b.status === "reading" && b.percentage != null && b.percentage < 1)
    .sort((a, b) => (b.last_at ?? 0) - (a.last_at ?? 0))
    .map((b) => {
      const perDay = pace(recent.filter((r) => r.document === b.document), day(b.started_at), today);
      return {
        title: b.title,
        author: b.author,
        percent: Math.round(b.percentage * 1000) / 10,
        page_count: b.page_count,
        started: day(b.started_at),
        last_read: day(b.last_at),
        percent_per_day: Math.round(perDay * 1000) / 10,
        pages_per_day: b.page_count && perDay ? Math.round(perDay * b.page_count * 10) / 10 : null,
        forecast: forecast(b.percentage, perDay, today),
      };
    });
  const finished = books
    .filter((b) => b.status === "finished")
    .sort((a, b) => (b.finished_at ?? 0) - (a.finished_at ?? 0))
    .map((b) => ({ title: b.title, author: b.author, started: day(b.started_at), finished: day(b.finished_at), days: b.days_to_finish }));

  return {
    today,
    updated_at: meta[0]?.updated ?? null,
    streak: streak(await readingDays(db), today),
    days: days.map((d) => [d.day, d.pages]),
    reading,
    finished,
    words: { collected: words[0].collected, learned: words[0].learned },
    word: word && { term: word.term, ipa: word.ipa, tr: word.tr },
    // Reading time exists only when some device uploads stats; CrossPoint 2.0.0 does not.
    time: overview.seconds > 0 ? { seconds: overview.seconds, week_seconds: overview.week_seconds ?? 0 } : null,
  };
}

async function todayCard(env, now) {
  const today = dayOf(now);
  const [word, days] = await Promise.all([wordOfDay(env.DB, today), readingDays(env.DB)]);
  return { day: today, streak: streak(days, today).current, word: word && { term: word.term, ipa: word.ipa, tr: word.tr, def: word.def } };
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

async function review(env, input, now) {
  const term = typeof input?.term === "string" ? input.term.trim().toLowerCase() : "";
  if (!term || term.length > 60 || !["good", "again"].includes(input.grade)) return null;
  const db = env.DB;
  const card = await db.prepare("SELECT box FROM cards WHERE term = ?1").bind(term).first();
  if (!card) return undefined;
  const box = nextBox(card.box, input.grade);
  return db
    .prepare("UPDATE cards SET box = ?1, due = ?2, reviews = reviews + 1, lapses = lapses + ?3 WHERE term = ?4 RETURNING term, box, due, reviews, lapses")
    .bind(box, addDays(dayOf(now), INTERVALS[box - 1]), input.grade === "again" ? 1 : 0, term)
    .first();
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

      const routes = ["/api/reading/cards.csv", "/api/reading/sentences", "/api/reading/review", "/api/reading/sync"];
      if (!routes.includes(path)) return new Response(null, { status: 404 });
      if (!(await authorized(request, env))) return respond({ error: "auth" }, 401);
      const now = Date.now();
      if (request.method === "GET" && path === "/api/reading/cards.csv")
        return respond(await cardsCsv(env), 200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="reading-cards.csv"' });
      if (request.method === "GET" && path === "/api/reading/sentences") return respond(await sentences(env), 200);
      if (request.method !== "POST") return new Response(null, { status: 405 });
      if (path === "/api/reading/sync") return respond(await ingest(env, now), 200);
      if (Number(request.headers.get("content-length") ?? 0) > 2000) return respond({ error: "length" }, 413);
      let input;
      try {
        input = await request.json();
      } catch {
        return respond({ error: "bad" }, 400);
      }
      const card = await review(env, input, now);
      if (card === null) return respond({ error: "bad" }, 400);
      if (card === undefined) return respond({ error: "unknown term" }, 404);
      return respond(card, 200);
    } catch (error) {
      // Most likely a free daily allowance is spent, or CrossPoint Sync is down.
      console.error(error);
      return respond({ error: "unavailable" }, 503, cors);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(event.cron === MORNING ? notify(env, Date.now()) : ingest(env, Date.now()));
  },
};

// For check.mjs.
export { addDays, authorized, candidates, cardsCsv, classify, dayOf, derive, forecast, ingest, nextBox, notification, notify, pace, review, sentences, streak, summary, todayCard };
