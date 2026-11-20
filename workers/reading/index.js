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
//          POST /api/reading/books/cover?document=  a cover image (JPEG, PNG, WebP or AVIF) for a book on the public page
//          GET  /api/reading/note?document=          the book's notes (English and Turkish drafts)
//          POST /api/reading/note                    save a draft; /publish and /unpublish commit to the site's repository
//          GET  /api/reading/cards     every card with meaning, examples, audio
//          POST /api/reading/words     add a word by hand ({term, note?, sentence?}); /edit and /delete
//          POST /api/reading/audio     find and keep a human recording for {term}
//          GET  /api/reading/app       the private words page (sign in with the token at POST /login)
import { appPage, loginPage } from "./page.js";
import { titleKey } from "../../src/lib/title-key.mjs";

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
const AUDIO_MAX_BYTES = 200_000; // a spoken word is 10 to 40 KB
// R2 bills past its free 10 GB; this many recordings at most (under 1 GB at the size cap), then no more copies.
const AUDIO_MAX_OBJECTS = 5000;
const AUDIO_ERROR_RETRY = 86_400; // a lookup that failed is tried again after a day, not every pull
const WIKI_HEADERS = { accept: "application/json", "user-agent": "busahin-reading/1 (https://busahin.com/)" };
// Covers: copied from the Sync answer's cover_url into R2, only for books the
// public page shows, and served by the files Worker. The same guards as the
// recordings: allowed https hosts only, no redirect, an image judged by its
// headers before a byte is read and by its first bytes after, a size cap, an
// object cap, a daily cap, and a failure waits a day.
// Hardcover's covers, and the hosts Sync's cover candidates come from (src/models/cover.ts there):
// Apple Books artwork on is1-ssl to is5-ssl.mzstatic.com, and Open Library, whose covers are
// handed on to archive.org and then one of its ia*.us.archive.org mirrors. A leading dot allows
// any subdomain. env.COVER_HOSTS replaces the list.
const COVER_HOSTS =
  "assets.hardcover.app,is1-ssl.mzstatic.com,is2-ssl.mzstatic.com,is3-ssl.mzstatic.com,is4-ssl.mzstatic.com,is5-ssl.mzstatic.com,covers.openlibrary.org,archive.org,.us.archive.org";
const COVER_HOPS = 2; // redirects followed by hand, each to an allowed host
const COVERS_PER_RUN = 5;
const COVERS_PER_DAY = 50;
const COVER_MAX_BYTES = 1_000_000; // a Hardcover cover is about 36 KB; the app shrinks an upload before sending it
const COVER_MAX_OBJECTS = 2000;
const COVER_ERROR_RETRY = 86_400;
const COOKIE = "reading_session";
const SESSION_DAYS = 60;
const CLIPPINGS_MAX = 5000; // GET /api/v1/clippings returns at most this many
const KEEP_RAW = 900_000; // characters of an answer worth keeping; D1 rows stop at 2 MB
// Raise when the derivation changes (a new column, a new field read from an answer): the
// next pull ignores the stored hashes once and re-derives every table from the answers,
// so rows written by older code are filled in even when Sync's answers have not changed.
// 2: covers and Hardcover's metadata on books. 3: the device of each book's newest position.
const DERIVE_VERSION = 3;
const ABOUT_PER_RUN = 3;
const ABOUT_REFRESH = 30 * 86_400; // a book's description is asked for again after a month

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
        // Hardcover's metadata, as Sync passes it on. Only plain strings are kept from lists.
        cover_url: text(i.cover_url, 500),
        release_year: int(i.release_year, 1, 3000),
        genres: Array.isArray(i.genres) && i.genres.some((g) => typeof g === "string") ? J(i.genres.filter((g) => typeof g === "string").map((g) => g.slice(0, 60)).slice(0, 12)) : null,
        series: text(i.series, 200),
        series_position: num(i.series_position, 0, 100_000),
        rating: num(i.rating, 0, 5),
        hardcover_slug: text(i.hardcover_slug, 200),
        // The device behind the newest position: the reader, or Readest on the phone once it is linked in Sync.
        device: text(i.device, 60),
        device_id: text(i.device_id, 64),
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
  if (res.status >= 300 && res.status < 400) throw Object.assign(new Error(`${path}: refused a redirect (HTTP ${res.status})`), { sync: true });
  if (!res.ok) throw Object.assign(new Error(`${path}: HTTP ${res.status}`), { sync: true, status: res.status });
  return res.text();
}

/** A Sync answer as JSON, for the private routes that read it live. */
async function syncJson(env, path) {
  const body = await get(env, path);
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error(`${path}: not JSON`), { sync: true });
  }
}

/** A write to Sync (a book's status or dates), with the same headers and the same refusal of redirects. */
async function put(env, path, body) {
  if (!env.SYNC_USER || !env.SYNC_KEY) throw Object.assign(new Error("SYNC_USER and SYNC_KEY are not set"), { sync: true });
  const res = await fetch(new URL(path, env.SYNC_URL), {
    method: "PUT",
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": "reading-worker", "x-auth-user": env.SYNC_USER, "x-auth-key": env.SYNC_KEY },
    body: J(body),
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw Object.assign(new Error(`${path}: HTTP ${res.status}`), { sync: true, status: res.status });
  return res.json().catch(() => ({}));
}

async function sha256(s) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", typeof s === "string" ? new TextEncoder().encode(s) : s));
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
  const [rawRows, derivedBy] = await db.batch([db.prepare("SELECT endpoint, hash FROM raw"), db.prepare("SELECT value FROM meta WHERE key = 'derive_version'")]);
  const current = Number(derivedBy.results[0]?.value) === DERIVE_VERSION;
  // An older derivation: every answer counts as changed for this pull.
  const stored = new Map(current ? rawRows.results.map((r) => [r.endpoint, r.hash]) : []);
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
  const goneCovers = [];

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
    // Which device read on which day, kept from here on (Sync keeps no per-day device): a book whose
    // newest position moved since the last pull counts that day for the device that moved it.
    const before = new Map((await db.prepare("SELECT document, last_at FROM books").all()).results.map((r) => [r.document, r.last_at]));
    const moved = books.filter((b) => b.last_at && b.device && before.get(b.document) !== b.last_at).map((b) => ({ day: dayOf(b.last_at * 1000), device: b.device }));
    if (moved.length)
      statements.push(db.prepare("INSERT OR IGNORE INTO day_devices (day, device) SELECT value->>'day', value->>'device' FROM json_each(?1)").bind(J(moved)));
    statements.push(
      db
        .prepare(
          `INSERT INTO books (document, title, filename, author, percentage, status, page_count, started_at, last_at, finished_at, days_to_finish,
                             cover_url, release_year, genres, series, series_position, rating, hardcover_slug, device, device_id)
           SELECT value->>'document', value->>'title', value->>'filename', value->>'author', value->>'percentage', value->>'status', value->>'page_count',
                  value->>'started_at', value->>'last_at', value->>'finished_at', value->>'days_to_finish',
                  value->>'cover_url', value->>'release_year', value->>'genres', value->>'series', value->>'series_position', value->>'rating', value->>'hardcover_slug',
                  value->>'device', value->>'device_id'
           FROM json_each(?1) WHERE true
           ON CONFLICT (document) DO UPDATE SET title = excluded.title, filename = excluded.filename, author = excluded.author, percentage = excluded.percentage,
             status = excluded.status, page_count = excluded.page_count, started_at = excluded.started_at, last_at = excluded.last_at,
             finished_at = excluded.finished_at, days_to_finish = excluded.days_to_finish, cover_url = excluded.cover_url, release_year = excluded.release_year,
             genres = excluded.genres, series = excluded.series, series_position = excluded.series_position, rating = excluded.rating, hardcover_slug = excluded.hardcover_slug,
             device = excluded.device, device_id = excluded.device_id
           WHERE (books.title, books.filename, books.author, books.percentage, books.status, books.page_count, books.started_at, books.last_at, books.finished_at, books.days_to_finish,
                  books.cover_url, books.release_year, books.genres, books.series, books.series_position, books.rating, books.hardcover_slug, books.device, books.device_id)
             IS NOT (excluded.title, excluded.filename, excluded.author, excluded.percentage, excluded.status, excluded.page_count, excluded.started_at, excluded.last_at, excluded.finished_at, excluded.days_to_finish,
                     excluded.cover_url, excluded.release_year, excluded.genres, excluded.series, excluded.series_position, excluded.rating, excluded.hardcover_slug, excluded.device, excluded.device_id)`,
        )
        .bind(J(books)),
    );
    if (!parsed.progress.next) {
      // A book gone from the reader takes its cover copy with it (removed from R2 once the batch is written).
      if (books.length) {
        const kept = new Set(books.map((b) => b.document));
        const { results } = await db.prepare("SELECT document, cover_key FROM books WHERE cover_v IS NOT NULL").all();
        goneCovers.push(...results.filter((r) => !kept.has(r.document)).map((r) => r.cover_key));
      }
      statements.push(db.prepare(`DELETE FROM books WHERE ${NONEMPTY} AND document NOT IN (SELECT value->>'document' FROM json_each(?1))`).bind(J(books)));
    }

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

  // Written with the rows (and only when it moves), so a failed pull leaves the old version and is tried again in full.
  if (!current)
    statements.push(
    db
      .prepare("INSERT INTO meta (key, value, updated_at) VALUES ('derive_version', ?1, ?2) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind(String(DERIVE_VERSION), seconds),
  );
  await db.batch(statements);
  for (const key of goneCovers) await env.FILES?.delete(key).catch((error) => console.error(error));
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
  const covers = await syncCovers(env, now);
  const about = await refreshAbout(env, now).catch((error) => (console.error(error), 0));
  // The public answer is rebuilt every pull (the day may have turned) and read back as one row.
  await storeSummary(env, now);
  return { changed, ...counts, translated, recorded, covers, about };
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

// The two lists the public page has: books open on the reader, and books finished.
const isReading = (b) => b.status === "reading" && b.percentage != null && b.percentage < 1;
const onPage = (b, env) => (isReading(b) || b.status === "finished") && publicTitle(b, env) !== null;
const filesBase = (env) => (env.FILES_URL ?? "https://files.busahin.com").replace(/\/$/, "");
/** Where a book's cover copy is served; ?v= changes with the picture, so a replaced cover is never stale. */
const coverOf = (b, env) => (b.cover_v ? `${filesBase(env)}/${b.cover_key}?v=${b.cover_v}` : null);

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
    .filter(isReading)
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
        cover: coverOf(b, env),
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
    .map(({ b, title }) => ({ title, author: b.author, cover: coverOf(b, env), started: day(b.started_at), finished: day(b.finished_at), days: b.days_to_finish }));

  const allDays = await readingDays(db);
  return {
    today,
    updated_at: meta[0]?.updated ?? null,
    // The first day there is data for: TRACKING_SINCE (a var) when set, else the earliest day synced.
    // The page draws the days before it as "no data", not as days without reading.
    since: isDay(env.TRACKING_SINCE) ? env.TRACKING_SINCE : (allDays[0] ?? null),
    streak: streak(allDays, today),
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

/** The private list of books: what the public page shows for each, Hardcover's metadata, the cover, and the notes. */
async function booksList(env) {
  const [books, notes] = await env.DB.batch([
    env.DB.prepare(
      `SELECT b.document, b.title, b.filename, b.public_title, b.hidden, b.author, b.status, b.percentage, b.page_count, b.release_year, b.genres, b.series,
              b.series_position, b.cover_url, b.cover_key, b.cover_v, b.device, b.started_at, b.finished_at, a.description, a.manual AS description_manual
       FROM books b LEFT JOIN about a USING (document) ORDER BY b.last_at DESC`,
    ),
    env.DB.prepare("SELECT document, lang, published_path IS NOT NULL AS published FROM notes"),
  ]);
  const byBook = Map.groupBy(notes.results, (n) => n.document);
  return {
    books: books.results.map(({ cover_url, cover_key, cover_v, genres, ...b }) => ({
      ...b,
      hidden: Boolean(b.hidden),
      shown_as: publicTitle(b, env),
      on_page: onPage(b, env),
      genres: genres ? JSON.parse(genres) : [],
      description_manual: Boolean(b.description_manual),
      started: b.started_at ? dayOf(b.started_at * 1000) : null,
      finished: b.finished_at ? dayOf(b.finished_at * 1000) : null,
      cover: coverOf({ cover_key, cover_v }, env),
      cover_waiting: !cover_v && Boolean(cover_url), // Hardcover has one; the next pull copies it if the book is on the page
      notes: Object.fromEntries((byBook.get(b.document) ?? []).map((n) => [n.lang, n.published ? "published" : "draft"])),
    })),
  };
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
  await syncCovers(env, now); // a hidden book's cover goes now; a shown one's is copied
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
    notes_to_write: await notesToWrite(db, now),
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
  if (name !== term) {
    const old = await db.prepare("SELECT r2_key FROM audio WHERE term = ?1").bind(term).first("r2_key");
    await db.batch([db.prepare("UPDATE daily SET term = ?2 WHERE term = ?1").bind(term, name), db.prepare("DELETE FROM audio WHERE term = ?1").bind(term)]);
    if (old && env.FILES) await env.FILES.delete(old).catch(() => {}); // the recording was of the old word
  }
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
    // redirect "manual" (Workers have no "error"): a 3xx is not ok, so nothing is followed off the pinned hosts.
    const res = await fetch(url, { headers: WIKI_HEADERS, redirect: "manual", signal: AbortSignal.timeout(10_000) });
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
    license_url: /^https?:\/\/creativecommons\.org\/|^https:\/\//.test(meta.extmetadata?.LicenseUrl?.value ?? "")
      ? text(meta.extmetadata.LicenseUrl.value.replace(/^http:/, "https:"), 200)
      : null,
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
  const stored = await db.prepare("SELECT COUNT(*) AS n FROM audio WHERE r2_key IS NOT NULL").first("n");
  if (stored >= AUDIO_MAX_OBJECTS) return row;
  const room = await db
    .prepare("INSERT INTO daily (day, audio) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET audio = audio + 1 WHERE daily.audio < ?2 RETURNING audio")
    .bind(today, AUDIO_PER_DAY)
    .first();
  if (!room) return row;
  let found = null;
  let key = null;
  let failed = false;
  try {
    found = await commonsAudio(term);
    if (found) {
      const res = await fetch(found.mp3, { headers: { "user-agent": WIKI_HEADERS["user-agent"] }, redirect: "manual", signal: AbortSignal.timeout(15_000) });
      // Judged before reading: an answer that is not audio, has no size, or is too big is never read.
      const size = Number(res.headers.get("content-length"));
      if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio/") || !(size > 0) || size > AUDIO_MAX_BYTES)
        throw new Error(`recording: HTTP ${res.status}, ${res.headers.get("content-type")}, ${size} bytes`);
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength > AUDIO_MAX_BYTES) throw new Error("recording: larger than it said");
      // A random name: the files Worker serves anything in the bucket, and this way no URL names the word.
      key = `reading/audio/${crypto.randomUUID()}.mp3`;
      await env.FILES.put(key, bytes, { httpMetadata: { contentType: "audio/mpeg", cacheControl: "public, max-age=31536000, immutable" } });
    }
  } catch (error) {
    console.error(error);
    failed = true;
  } finally {
    // Always a row, so a failing word waits (a day after an error, AUDIO_RETRY with no recording)
    // instead of spending the daily lookups again on every pull.
    const kept = key ? found : {};
    const saved = await db
      .prepare(
        `INSERT INTO audio (term, r2_key, file, author, license, license_url, checked_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT (term) DO UPDATE SET r2_key = excluded.r2_key, file = excluded.file, author = excluded.author,
           license = excluded.license, license_url = excluded.license_url, checked_at = excluded.checked_at
         WHERE audio.r2_key IS NULL
         RETURNING term`,
      )
      .bind(term, key, kept.file ?? null, kept.author ?? null, kept.license ?? null, kept.license_url ?? null, failed ? seconds - AUDIO_RETRY + AUDIO_ERROR_RETRY : seconds)
      .first();
    // A concurrent lookup stored its recording first: ours is an orphan, so it goes.
    if (key && !saved) await env.FILES.delete(key).catch(() => {});
  }
  return db.prepare("SELECT * FROM audio WHERE term = ?1").bind(term).first();
}

async function audioFor(env, input, now) {
  const term = handTerm(input?.term);
  if (!term) return null;
  if (!(await env.DB.prepare("SELECT 1 FROM cards WHERE term = ?1").bind(term).first())) return undefined;
  await ensureAudio(env, term, now);
  return { audio: (await cardsJson(env, now, term)).cards[0]?.audio ?? null };
}


// ---------------------------------------------------------------- covers

/** The image type from its first bytes: JPEG, PNG, WebP or AVIF, else null. Never SVG, which can carry script. */
function imageType(buffer) {
  const b = new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength));
  const ascii = (from, to) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12))) return "image/avif";
  return null;
}

/** The cover address to fetch, or null: https, on an allowed host, no credentials, the default port. */
function coverSource(value, env) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname;
  const allowed = coverHosts(env).some((h) => (h.startsWith(".") ? host.endsWith(h) && host.length > h.length : host === h));
  return url.protocol === "https:" && !url.username && !url.password && !url.port && allowed ? url : null;
}
const coverHosts = (env) => String(env.COVER_HOSTS ?? COVER_HOSTS).split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);

/** Reads a body up to `max` bytes and refuses anything longer, for an answer that does not say its size. */
async function readCapped(res, max) {
  if (!res.body) return res.arrayBuffer();
  const reader = res.body.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new Error("cover: larger than the cap");
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) (out.set(p, at), (at += p.byteLength));
  return out.buffer;
}

/**
 * A cover's bytes, from an allowed https host only. Redirects are never
 * followed by fetch: a 3xx is followed by hand at most COVER_HOPS times, and
 * only to another allowed host (Open Library's covers live on archive.org).
 * Judged by its headers before a byte is read: an image, and under the cap
 * when it says its size; an answer with no size is read only up to the cap.
 */
async function fetchCover(env, value) {
  let url = coverSource(value, env);
  if (!url) throw new Error(`cover: ${value} is not on an allowed https host`);
  for (let hop = 0; ; hop++) {
    const res = await fetch(url, { headers: { "user-agent": WIKI_HEADERS["user-agent"] }, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      const next = hop < COVER_HOPS && location ? coverSource(new URL(location, url).href, env) : null;
      if (!next) throw new Error(`cover: refused a redirect (HTTP ${res.status})`);
      url = next;
      continue;
    }
    const length = res.headers.get("content-length");
    const size = Number(length);
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/") || (length !== null && !(size > 0 && size <= COVER_MAX_BYTES)))
      throw new Error(`cover: HTTP ${res.status}, ${res.headers.get("content-type")}, ${length} bytes`);
    const bytes = length !== null ? await res.arrayBuffer() : await readCapped(res, COVER_MAX_BYTES);
    if (bytes.byteLength > COVER_MAX_BYTES) throw new Error("cover: larger than it said");
    return bytes;
  }
}

/** Reserves one of today's `column` (a fixed name below) under `cap`; false when it is spent. */
async function takeDaily(db, day, column, cap) {
  if (!["covers", "publishes"].includes(column)) throw new Error(`no daily cap named ${column}`);
  const row = await db
    .prepare(`INSERT INTO daily (day, ${column}) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET ${column} = ${column} + 1 WHERE daily.${column} < ?2 RETURNING ${column}`)
    .bind(day, cap)
    .first();
  return Boolean(row);
}

/**
 * Keeps an image as the book's cover: checked by its first bytes, written under
 * the book's own random key (kept for good, so a note that links the cover
 * keeps working when it is replaced), and versioned by its hash.
 */
async function storeCover(env, book, bytes, now) {
  const type = imageType(bytes);
  if (!type) throw new Error("cover: not a JPEG, PNG, WebP or AVIF image");
  const key = book.cover_key ?? `reading/covers/${crypto.randomUUID()}`;
  // A day, not a year: a note links the cover without ?v=, and should see a replacement soon.
  await env.FILES.put(key, bytes, { httpMetadata: { contentType: type, cacheControl: "public, max-age=86400" } });
  const v = (await sha256(bytes)).slice(0, 12);
  await env.DB.prepare("UPDATE books SET cover_key = ?2, cover_v = ?3, cover_checked_at = ?4 WHERE document = ?1").bind(book.document, key, v, Math.floor(now / 1000)).run();
  return coverOf({ cover_key: key, cover_v: v }, env);
}

/** Room for one more cover write: today's cap, and the object cap when it adds an object rather than replacing one. */
async function coverRoom(env, now, adds = true) {
  const stored = adds ? await env.DB.prepare("SELECT COUNT(*) AS n FROM books WHERE cover_v IS NOT NULL").first("n") : 0;
  return stored < COVER_MAX_OBJECTS && (await takeDaily(env.DB, dayOf(now), "covers", COVERS_PER_DAY));
}

/** Copies one book's cover from its cover_url. A failure is noted, so the book waits a day. */
async function copyCover(env, book, now) {
  if (!(await coverRoom(env, now))) return false;
  try {
    await storeCover(env, book, await fetchCover(env, book.cover_url), now);
    return true;
  } catch (error) {
    console.error(error);
    await env.DB.prepare("UPDATE books SET cover_checked_at = ?2 WHERE document = ?1").bind(book.document, Math.floor(now / 1000)).run();
    return false;
  }
}

/**
 * Covers follow the public page: a book that left it (hidden, retitled away,
 * or no longer reading or finished) has its copy deleted, and a book on it
 * with a cover_url and no copy gets one, a few per run.
 */
async function syncCovers(env, now) {
  if (!env.FILES) return 0;
  const db = env.DB;
  const { results } = await db
    .prepare("SELECT document, title, public_title, hidden, status, percentage, cover_url, cover_key, cover_v, cover_checked_at FROM books")
    .all();
  for (const b of results.filter((b) => b.cover_v && !onPage(b, env))) {
    try {
      await env.FILES.delete(b.cover_key);
      await db.prepare("UPDATE books SET cover_v = NULL, cover_checked_at = NULL WHERE document = ?1").bind(b.document).run();
    } catch (error) {
      console.error(error); // kept as it is, so the next run tries again
    }
  }
  const seconds = Math.floor(now / 1000);
  const due = results.filter((b) => onPage(b, env) && !b.cover_v && b.cover_url && !(b.cover_checked_at > seconds - COVER_ERROR_RETRY));
  let copied = 0;
  for (const b of due.slice(0, COVERS_PER_RUN)) if (await copyCover(env, b, now)) copied++;
  return copied;
}

/** A cover sent from the private app for a book on the public page: the same checks as a copy, and it replaces any cover it had. */
async function uploadCover(env, request, now) {
  const document = new URL(request.url).searchParams.get("document") ?? "";
  if (!DOC.test(document)) return null;
  const length = request.headers.get("content-length");
  if (length === null) return respond({ error: "length required" }, 411);
  if (!(Number(length) > 0) || Number(length) > COVER_MAX_BYTES) return respond({ error: "too big" }, 413);
  if (!(request.headers.get("content-type") ?? "").startsWith("image/")) return null;
  const book = await env.DB.prepare("SELECT * FROM books WHERE document = ?1").bind(document).first();
  if (!book) return undefined;
  if (!onPage(book, env)) return { error: "not on the page" };
  if (!env.FILES) return { error: "no bucket" };
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > COVER_MAX_BYTES) return respond({ error: "too big" }, 413);
  if (!imageType(bytes)) return null;
  if (!(await coverRoom(env, now, !book.cover_v))) return { error: "cover limit" };
  const cover = await storeCover(env, book, bytes, now);
  await storeSummary(env, now);
  return { document, cover };
}

// ---------------------------------------------------------------- more of what Sync knows: descriptions, history, devices, linked apps

/** Book descriptions (GET /documents/{document}/about) for books on the public page, a few a run, asked again monthly. */
async function refreshAbout(env, now) {
  const db = env.DB;
  const seconds = Math.floor(now / 1000);
  const { results } = await db.prepare("SELECT b.*, a.checked_at FROM books b LEFT JOIN about a USING (document)").all();
  const due = results.filter((b) => onPage(b, env) && !(b.checked_at > seconds - ABOUT_REFRESH)).slice(0, ABOUT_PER_RUN);
  let found = 0;
  for (const b of due) {
    let row = { description: null, manual: 0 };
    try {
      const body = await syncJson(env, `/api/v1/documents/${encodeURIComponent(b.document)}/about`);
      row = { description: aboutText(body?.description), manual: body?.manual === true ? 1 : 0 };
    } catch (error) {
      if (error.status !== 404) throw error; // Sync knows no description: kept as none, asked again in a month
    }
    if (row.description) found++;
    await db
      .prepare("INSERT INTO about (document, description, manual, checked_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (document) DO UPDATE SET description = excluded.description, manual = excluded.manual, checked_at = excluded.checked_at")
      .bind(b.document, row.description, row.manual, seconds)
      .run();
  }
  return found;
}

/** A description kept as plain paragraphs: no control characters, at most one blank line in a row, 6000 characters. */
function aboutText(v) {
  if (typeof v !== "string") return null;
  const clean = v
    .toWellFormed()
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 6000);
  return clean || null;
}

/** Device names as the app shows them: CrossPoint is the reader; anything else (Readest) as Sync names it. */
const deviceRow = (d) => ({ device: text(d?.device, 60), device_id: text(d?.device_id, 64), percentage: num(d?.percentage), at: ts(d?.timestamp) });

/** One book's reading history and every device's position, read live from Sync for the app's book page. */
async function bookHistory(env, request) {
  const document = new URL(request.url).searchParams.get("document") ?? "";
  if (!DOC.test(document)) return null;
  if (!(await bookRow(env.DB, document))) return undefined;
  const doc = encodeURIComponent(document);
  const [activity, progressRows] = await Promise.all([
    syncJson(env, `/api/v1/stats/activity/books?documents=${doc}&tz=${TZ_OFFSET}`),
    syncJson(env, `/api/v1/progress/${doc}`).catch((error) => (error.status === 404 ? { devices: [] } : Promise.reject(error))),
  ]);
  const book = list(activity?.books)[0] ?? null;
  return {
    document,
    started: book && ts(book.started_at) ? dayOf(book.started_at * 1000) : null,
    finished: book && ts(book.finished_at) ? dayOf(book.finished_at * 1000) : null,
    pages_read: int(book?.pages_read),
    page_count: int(book?.page_count, 1, 100_000),
    reading_days: (Array.isArray(book?.reading_days) ? book.reading_days : []).filter((d) => typeof d === "string" && DAY.test(d)),
    days: list(book?.days)
      .filter((d) => typeof d.day === "string" && DAY.test(d.day))
      .map((d) => ({ day: d.day, pages: int(d.pages) ?? 0, syncs: int(d.syncs) ?? 0 })),
    devices: list(progressRows?.devices).map(deviceRow),
  };
}

/** The apps linked in Sync (Readest, Hardcover) and whether they are working; read-only. */
async function connectors(env) {
  const body = await syncJson(env, "/api/v1/connectors");
  return {
    encryption: text(body?.encryption, 20),
    connectors: list(body?.connectors)
      .filter((c) => c.linked === true)
      .map((c) => ({
        id: text(c.id, 40),
        name: text(c.name, 60),
        status: text(c.status, 40),
        pending: int(c.queue?.pending),
        dead: int(c.queue?.dead),
        errors: list(c.queue_errors).slice(0, 3).map((e) => ({ kind: text(e.kind, 60), message: text(e.message, 300), count: int(e.count) })),
      })),
  };
}

/** Covers to choose from for a book that has none, from Sync (Apple Books, Open Library); only those on an allowed host. */
async function coverCandidates(env, request) {
  const params = new URL(request.url).searchParams;
  const document = params.get("document") ?? "";
  if (!DOC.test(document)) return null;
  if (!(await bookRow(env.DB, document))) return undefined;
  const q = text(params.get("q"), 200);
  const body = await syncJson(env, `/api/v1/documents/${encodeURIComponent(document)}/cover/candidates${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return {
    items: list(body?.items)
      .filter((c) => typeof c.url === "string" && coverSource(c.url, env))
      .slice(0, 12)
      .map((c) => ({ url: c.url, title: text(c.title, 200), author: text(c.author, 200), source: text(c.source, 40), pages: int(c.pages, 1, 100_000) })),
  };
}

/** Keeps a chosen candidate as the book's cover, through the same guarded copy as Hardcover's. */
async function pickCover(env, input, now) {
  if (!isRecord(input) || typeof input.document !== "string" || !DOC.test(input.document) || typeof input.url !== "string" || !coverSource(input.url, env)) return null;
  const book = await bookRow(env.DB, input.document);
  if (!book) return undefined;
  if (!onPage(book, env)) return { error: "not on the page" };
  if (!env.FILES) return { error: "no bucket" };
  if (!(await coverRoom(env, now, !book.cover_v))) return { error: "cover limit" };
  let bytes;
  try {
    bytes = await fetchCover(env, input.url);
  } catch (error) {
    return { error: "cover", reason: String(error.message).slice(0, 200) };
  }
  if (!imageType(bytes)) return { error: "cover", reason: "not a JPEG, PNG, WebP or AVIF image" };
  const cover = await storeCover(env, book, bytes, now);
  await storeSummary(env, now);
  return { document: book.document, cover };
}

/**
 * A book's status (reading, paused, finished, dnf, or null for Sync to derive it
 * again) and its start and finish dates, written to Sync, which stays the system
 * of record; then a pull, so the public page follows (a dnf book leaves it).
 */
async function setStatus(env, input, now) {
  if (!isRecord(input) || typeof input.document !== "string" || !DOC.test(input.document)) return null;
  const { status, start_date, finished_date } = input;
  if (status !== undefined && status !== null && !STATUSES.has(status)) return null;
  for (const d of [start_date, finished_date]) if (d !== undefined && d !== null && !isDay(d)) return null;
  if (status === undefined && start_date === undefined && finished_date === undefined) return null;
  if (!(await bookRow(env.DB, input.document))) return undefined;
  const doc = encodeURIComponent(input.document);
  if (status !== undefined) await put(env, `/api/v1/documents/${doc}/status`, { status });
  const dates = Object.fromEntries(Object.entries({ start_date, finished_date }).filter(([, v]) => v !== undefined));
  if (Object.keys(dates).length) await put(env, `/api/v1/documents/${doc}/dates`, dates);
  const out = await pull(env, now, "manual");
  if (!out.ok) return { error: "pull failed", reason: out.error };
  return (await booksList(env)).books.find((b) => b.document === input.document);
}

/** A route that reads from or writes to Sync: a Sync failure is a 502 with its status, never the answer or the credentials. */
const viaSync = async (work) => {
  try {
    const out = await work();
    return out?.error === "cover" ? respond(out, 502) : answer(out);
  } catch (error) {
    if (!error.sync) throw error;
    return respond({ error: "sync", reason: error.message }, 502);
  }
};

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
    if (!Object.hasOwn(SETTINGS, key) || !isRecord(value)) return null; // never "__proto__" or "toString"
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
  await learnNotes(env, now);
  return outcome;
}

/**
 * Which books have a note on the site, from the JSON the site builds
 * (/reading/notes.json). Read on each pull, kept in meta; a failure keeps the
 * last list. No secret and no write path back to the repository.
 */
async function learnNotes(env, now) {
  try {
    const res = await fetch(env.NOTES_URL || `${SITE}/reading/notes.json`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`notes.json: HTTP ${res.status}`);
    const body = await res.json();
    const keys = (Array.isArray(body?.notes) ? body.notes : []).flatMap((n) => (Array.isArray(n?.keys) ? n.keys.filter((k) => typeof k === "string").slice(0, 5) : []));
    await env.DB.prepare("INSERT INTO meta (key, value, updated_at) VALUES ('notes', ?1, ?2) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind(J(keys.slice(0, 2000)), Math.floor(now / 1000))
      .run();
  } catch (error) {
    console.error(error);
  }
}

/** Books finished in the last 120 days that have no note yet, newest first, at most three. */
async function notesToWrite(db, now) {
  const [books, keys] = await Promise.all([
    db.prepare("SELECT document, title, public_title, finished_at FROM books WHERE status = 'finished' AND finished_at >= ?1 ORDER BY finished_at DESC").bind(Math.floor(now / 1000) - 120 * 86_400).all(),
    db.prepare("SELECT value FROM meta WHERE key = 'notes'").first("value"),
  ]);
  if (keys === null) return []; // the site's list has not been read yet: no reminder rather than a wrong one
  const have = new Set(JSON.parse(keys));
  return books.results
    .filter((b) => (b.public_title ?? b.title) && !have.has(titleKey(b.public_title ?? b.title)) && !have.has(titleKey(b.title ?? "")))
    .slice(0, 3)
    .map((b) => ({ document: b.document, title: b.public_title ?? b.title }));
}


// ---------------------------------------------------------------- book notes, written here, published to the site

// The one repository and branch this Worker may write to, with GITHUB_TOKEN (a
// fine-grained token for this repository alone, Contents read and write; see
// DEPLOY.md). Every request goes through github(), which only ever touches
// src/content/books/<slug>.md and src/content/books/tr/<slug>.md.
const REPO = "busahinku/busahinku.github.io";
const BRANCH = "main";
const NOTE_SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/; // the engagement Worker's page keys allow the same
const NOTE_PATH = /^src\/content\/books\/(tr\/)?[a-z0-9][a-z0-9-]{0,80}\.md$/;
const NOTE_BODY_MAX = 100_000;
const PUBLISH_PER_DAY = 20;
const LANGS = ["en", "tr"];

const notePath = (slug, lang) => `src/content/books/${lang === "tr" ? "tr/" : ""}${slug}.md`;
const noteUrl = (slug, lang) => `${SITE}${lang === "tr" ? "/tr" : ""}/reading/${slug}/`;
/** One line of frontmatter text: no control characters or line breaks, whatever was pasted. */
const oneLine = (v, max) => (typeof v === "string" ? v.toWellFormed().replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const isDay = (v) => typeof v === "string" && DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

/**
 * Raw HTML in a note, outside code. Markdown files may carry HTML into the
 * page, and the site's CSP allows inline script, so a note is Markdown only.
 * Autolinks (<https://...>) and comments are not tags and pass.
 */
function hasHtml(body) {
  const prose = body.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "").replace(/`+[^`\n]*`+/g, "");
  return /<\/?[A-Za-z][A-Za-z0-9-]*(?=[\s/>])/.test(prose);
}

/**
 * The file as committed: frontmatter written here from validated fields, every
 * value a JSON string (a valid YAML double-quoted scalar, so quotes, colons and
 * "---" stay text), then the body.
 */
function noteFile(note) {
  const fields = [
    ["title", note.title],
    ["author", note.author],
    ["finished", note.finished],
    ["description", note.description],
    ["readerTitle", note.reader_title],
    ["cover", note.cover],
    ["about", note.about],
    ["aboutFromHardcover", note.about_hardcover],
    ["lang", note.lang],
    ["translationKey", note.slug],
  ].filter(([, v]) => v);
  return `---\n${fields.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n")}\n---\n\n${note.body.trim()}\n`;
}

/** A draft as the app sends it, cleaned; null when it can never be saved. Empty fields are fine until publishing. */
function noteInput(input) {
  if (!isRecord(input) || typeof input.document !== "string" || !DOC.test(input.document) || !LANGS.includes(input.lang)) return null;
  if (typeof input.slug !== "string" || !NOTE_SLUG.test(input.slug) || typeof input.body !== "string") return null;
  const body = input.body.toWellFormed().replace(/\r\n?/g, "\n").replace(/\u0000/g, "");
  if (body.length > NOTE_BODY_MAX) return null;
  return {
    document: input.document,
    lang: input.lang,
    slug: input.slug,
    title: oneLine(input.title, 200),
    author: oneLine(input.author, 200),
    finished: isDay(input.finished) ? input.finished : null,
    description: oneLine(input.description, 300) || null,
    body,
  };
}

/** A note with what publishing would write, and whether that differs from what was last committed. */
async function noteState(env, row, book) {
  const file = noteFile(noteForFile(row, book, env));
  return {
    document: row.document,
    lang: row.lang,
    slug: row.slug,
    title: row.title,
    author: row.author,
    finished: row.finished,
    description: row.description,
    body: row.body,
    updated_at: row.updated_at,
    published: Boolean(row.published_path),
    published_at: row.published_at,
    changed: Boolean(row.published_path) && (await sha256(file)) !== row.published_hash,
    url: noteUrl(row.slug, row.lang),
  };
}

/** The note plus what the book adds to its file: the reader's own title when it differs, and the cover when the book is on the page. */
const noteForFile = (row, book, env) => ({
  ...row,
  // The book's description from Sync, credited to Hardcover unless it was written by hand there.
  about: book?.about ?? null,
  about_hardcover: book?.about ? !book.about_manual : null,
  reader_title: book?.title && titleKey(book.title) !== titleKey(row.title) ? oneLine(book.title, 200) : null,
  cover: book && onPage(book, env) ? coverOf(book, env) : null,
});

const bookRow = (db, document) =>
  db.prepare("SELECT b.*, a.description AS about, a.manual AS about_manual FROM books b LEFT JOIN about a USING (document) WHERE b.document = ?1").bind(document).first();

/** Both languages of a book's note, and the book to fill a new one from. */
async function getNote(env, request) {
  const document = new URL(request.url).searchParams.get("document") ?? "";
  if (!DOC.test(document)) return null;
  const book = await bookRow(env.DB, document);
  if (!book) return undefined;
  const { results } = await env.DB.prepare("SELECT * FROM notes WHERE document = ?1").bind(document).all();
  const notes = {};
  for (const row of results) notes[row.lang] = await noteState(env, row, book);
  return {
    book: {
      document,
      title: book.public_title ?? book.title ?? "",
      author: book.author ?? "",
      finished: book.finished_at ? dayOf(book.finished_at * 1000) : null,
      cover: coverOf(book, env),
      on_page: onPage(book, env),
    },
    notes,
  };
}

/**
 * Saves a draft (the app autosaves). A book's notes share one slug: it can be
 * changed until either language is published, and no other book may use it.
 */
async function saveNote(env, input, now) {
  const note = noteInput(input);
  if (!note) return null;
  const db = env.DB;
  if (!(await bookRow(db, note.document))) return undefined;
  const fixed = await db.prepare("SELECT slug FROM notes WHERE document = ?1 AND published_path IS NOT NULL LIMIT 1").bind(note.document).first("slug");
  if (fixed) note.slug = fixed;
  else if (await db.prepare("SELECT 1 FROM notes WHERE slug = ?1 AND document <> ?2").bind(note.slug, note.document).first()) return { error: "slug taken" };
  await db.batch([
    db
      .prepare(
        `INSERT INTO notes (document, lang, slug, title, author, finished, description, body, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT (document, lang) DO UPDATE SET slug = excluded.slug, title = excluded.title, author = excluded.author, finished = excluded.finished,
           description = excluded.description, body = excluded.body, updated_at = excluded.updated_at`,
      )
      .bind(note.document, note.lang, note.slug, note.title, note.author, note.finished, note.description, note.body, Math.floor(now / 1000)),
    db.prepare("UPDATE notes SET slug = ?2 WHERE document = ?1 AND slug <> ?2").bind(note.document, note.slug),
  ]);
  return readNote(env, note.document, note.lang);
}

async function readNote(env, document, lang) {
  const row = await env.DB.prepare("SELECT * FROM notes WHERE document = ?1 AND lang = ?2").bind(document, lang).first();
  return row && noteState(env, row, await bookRow(env.DB, document));
}

const base64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

/**
 * The GitHub contents API, for one path. The lock is here: anything but a
 * note's path is refused before a request is made, and only .md is written.
 * A GET of a missing file is null.
 */
async function github(env, method, path, body) {
  const read = method === "GET";
  if (!(read ? /^src\/content\/books\/(tr\/)?[a-z0-9][a-z0-9-]{0,80}\.mdx?$/ : NOTE_PATH).test(path) || !["GET", "PUT", "DELETE"].includes(method))
    throw new Error("refused: not a note's path");
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}${read ? `?ref=${BRANCH}` : ""}`, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "busahin-reading",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? J({ ...body, branch: BRANCH }) : undefined,
  });
  if (read && res.status === 404) return null;
  if (!res.ok) throw Object.assign(new Error(`GitHub: HTTP ${res.status}`), { github: true });
  return res.json();
}

/**
 * Commits a note to the site's repository, which rebuilds the site. A file
 * that is already there and not ours is never overwritten; one that changed
 * on GitHub since our last commit is only with {force: true}. One commit per
 * language, with a fixed message.
 */
async function publishNote(env, input, now) {
  if (!isRecord(input) || typeof input.document !== "string" || !DOC.test(input.document) || !LANGS.includes(input.lang)) return null;
  if (!env.GITHUB_TOKEN) return { error: "no token" };
  const db = env.DB;
  const row = await db.prepare("SELECT * FROM notes WHERE document = ?1 AND lang = ?2").bind(input.document, input.lang).first();
  if (!row) return undefined;
  if (!row.title || !row.author || !row.finished || !row.body.trim()) return { error: "incomplete" };
  if (hasHtml(row.body)) return { error: "html" };
  const path = notePath(row.slug, row.lang);
  const file = noteFile(noteForFile(row, await bookRow(db, row.document), env));
  if (!(await takeDaily(db, dayOf(now), "publishes", PUBLISH_PER_DAY))) return { error: "daily limit" };
  const current = await github(env, "GET", path);
  if (current && !row.published_sha) return { error: "exists" }; // a file of that name that this app did not write
  if (current && current.sha !== row.published_sha && input.force !== true) return { error: "changed" };
  if (!current && !row.published_path && (await github(env, "GET", path.replace(/\.md$/, ".mdx")))) return { error: "exists" };
  const verb = row.published_path ? "update" : "publish";
  const out = await github(env, "PUT", path, { message: `Reading note: ${verb} ${row.slug} (${row.lang})`, content: base64(file), ...(current ? { sha: current.sha } : {}) });
  await db
    .prepare("UPDATE notes SET published_path = ?3, published_sha = ?4, published_hash = ?5, published_at = ?6 WHERE document = ?1 AND lang = ?2")
    .bind(row.document, row.lang, path, out.content.sha, await sha256(file), Math.floor(now / 1000))
    .run();
  return readNote(env, row.document, row.lang);
}

/** Deletes the note's file from the repository; the draft stays here. */
async function unpublishNote(env, input, now) {
  if (!isRecord(input) || typeof input.document !== "string" || !DOC.test(input.document) || !LANGS.includes(input.lang)) return null;
  if (!env.GITHUB_TOKEN) return { error: "no token" };
  const db = env.DB;
  const row = await db.prepare("SELECT * FROM notes WHERE document = ?1 AND lang = ?2").bind(input.document, input.lang).first();
  if (!row) return undefined;
  if (!row.published_path) return { error: "not published" };
  if (!(await takeDaily(db, dayOf(now), "publishes", PUBLISH_PER_DAY))) return { error: "daily limit" };
  const current = await github(env, "GET", row.published_path);
  if (current && current.sha !== row.published_sha && input.force !== true) return { error: "changed" };
  if (current) await github(env, "DELETE", row.published_path, { message: `Reading note: unpublish ${row.slug} (${row.lang})`, sha: current.sha });
  await db
    .prepare("UPDATE notes SET published_path = NULL, published_sha = NULL, published_hash = NULL, published_at = NULL WHERE document = ?1 AND lang = ?2")
    .bind(row.document, row.lang)
    .run();
  return readNote(env, row.document, row.lang);
}

/**
 * Publishing writes to the site's repository, so it asks for more than a
 * valid session: the session cookie itself (never a bearer token from a
 * script) on a request from the app's own origin.
 */
function fromTheApp(request) {
  return givenToken(request).cookie && request.headers.get("origin") === new URL(request.url).origin;
}

/** A GitHub failure goes back as 502 with its status, never the token or the answer. */
const viaGithub = async (request, work) => {
  if (!fromTheApp(request)) return respond({ error: "forbidden" }, 403);
  try {
    return answer(await work());
  } catch (error) {
    if (!error.github) throw error;
    return respond({ error: "github", reason: error.message }, 502);
  }
};

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
  // Where reading happened, by day: each device's days, and the days both were used.
  const { results: deviceDays } = await db.prepare("SELECT day, COUNT(*) AS n, MIN(device) AS device FROM day_devices GROUP BY day").all();
  const byDevice = new Map();
  for (const d of (await db.prepare("SELECT device, COUNT(*) AS days FROM day_devices GROUP BY device ORDER BY days DESC, device").all()).results) byDevice.set(d.device, d.days);
  return {
    today,
    weeks: series,
    accuracy: { all: rate(reviewRows), last30: rate(recent), reviews: reviewRows.length },
    bands,
    // The Academic Word List has 570 headword families (Coxhead, 2000).
    awl: { met: awlMet.size, learned: awlLearned.size, in_lists: listed, families: 570 },
    books: bookRows,
    lists: preBooks,
    devices: { days: [...byDevice].map(([device, days]) => ({ device, days })), both: deviceDays.filter((d) => d.n > 1).length, since: deviceDays[0]?.day ?? null },
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
  const names = ["cards", "reviews", "clippings", "books", "days", "book_days", "prestudy", "audio", "sync_log", "notes", "about", "day_devices"];
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
      lemma: termOf(w.lemma).slice(0, 60) || null,
      chapter: int(w.chapter, 0, 10_000),
      chapter_title: text(w.chapter_title, 200),
      rank: int(w.rank, 1, 10_000_000),
      ipa: text(w.ipa, 80),
      tr: text(w.turkish, 300),
      def: text(w.definition, 500),
      awl: w.awl === true ? 1 : 0,
      awl_headword: termOf(w.awl_headword).slice(0, 60) || null,
      count: int(w.count, 0, 1_000_000),
    });
  }
  const db = env.DB;
  // Upserts that skip identical rows, then the words no longer on the list: importing the
  // same file again writes nothing, and a changed file writes only what changed.
  await db.batch([
    ...chunks(words, 500).map((part) =>
      db
        .prepare(
          `INSERT INTO prestudy (book, term, lemma, chapter, chapter_title, rank, ipa, tr, def, awl, awl_headword, count)
           SELECT ?1, value->>'term', value->>'lemma', value->>'chapter', value->>'chapter_title', value->>'rank', value->>'ipa', value->>'tr',
                  value->>'def', value->>'awl', value->>'awl_headword', value->>'count' FROM json_each(?2) WHERE true
           ON CONFLICT (book, term) DO UPDATE SET lemma = excluded.lemma, chapter = excluded.chapter, chapter_title = excluded.chapter_title,
             rank = excluded.rank, ipa = excluded.ipa, tr = excluded.tr, def = excluded.def, awl = excluded.awl, awl_headword = excluded.awl_headword, count = excluded.count
           WHERE (prestudy.lemma, prestudy.chapter, prestudy.chapter_title, prestudy.rank, prestudy.ipa, prestudy.tr, prestudy.def, prestudy.awl, prestudy.awl_headword, prestudy.count)
             IS NOT (excluded.lemma, excluded.chapter, excluded.chapter_title, excluded.rank, excluded.ipa, excluded.tr, excluded.def, excluded.awl, excluded.awl_headword, excluded.count)`,
        )
        .bind(book, J(part)),
    ),
    db.prepare("DELETE FROM prestudy WHERE book = ?1 AND term NOT IN (SELECT value->>'term' FROM json_each(?2))").bind(book, J(words.map(({ term }) => ({ term })))),
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
  "POST /api/reading/prestudy": async (env, request) =>
    request.headers.get("content-length") === null ? respond({ error: "length required" }, 411) : answer(await importList(env, await readJson(request, 2_000_000))),
  "GET /api/reading/books": (env) => booksList(env),
  "POST /api/reading/books": async (env, request, now) => answer(await setBook(env, await readJson(request), now)),
  "POST /api/reading/books/cover": async (env, request, now) => answer(await uploadCover(env, request, now)),
  "GET /api/reading/books/history": (env, request) => viaSync(() => bookHistory(env, request)),
  "GET /api/reading/books/candidates": (env, request) => viaSync(() => coverCandidates(env, request)),
  "POST /api/reading/books/cover/pick": async (env, request, now) => viaSync(async () => pickCover(env, await readJson(request), now)),
  "POST /api/reading/books/status": async (env, request, now) => viaSync(async () => setStatus(env, await readJson(request), now)),
  "GET /api/reading/connectors": (env) => viaSync(() => connectors(env)),
  "GET /api/reading/note": async (env, request) => answer(await getNote(env, request)),
  "POST /api/reading/note": async (env, request, now) =>
    request.headers.get("content-length") === null ? respond({ error: "length required" }, 411) : answer(await saveNote(env, await readJson(request, 400_000), now)),
  "POST /api/reading/note/publish": (env, request, now) => viaGithub(request, async () => publishNote(env, await readJson(request), now)),
  "POST /api/reading/note/unpublish": (env, request, now) => viaGithub(request, async () => unpublishNote(env, await readJson(request), now)),
};

// The private page and its sign-in. Strict headers: no framing, no indexing,
// scripts and styles only with this response's nonce.
// The app shows cover candidates before one is copied, so it may load images from the cover hosts.
const coverImgSrc = (env) => coverHosts(env).map((h) => (h.startsWith(".") ? `https://*${h}` : `https://${h}`)).join(" ");

function html(body, status, nonce, extra = {}, images = "") {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "same-origin",
      "x-frame-options": "DENY",
      "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; font-src 'self'; connect-src 'self'; media-src https://files.busahin.com; img-src 'self' data: https://files.busahin.com${images ? ` ${images}` : ""}; manifest-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
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
    return (await authorized(request, env)) ? html(appPage(nonce), 200, nonce, {}, coverImgSrc(env)) : html(loginPage(nonce), 401, nonce);
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
        // Five minutes at the edge (the Cache API copy); the data changes at most every thirty.
        // The browser gets no-store: the zone's Browser Cache TTL would otherwise stretch any
        // max-age to a month, and the page would show the same numbers for weeks.
        const cache = globalThis.caches?.default;
        const key = new Request(url.origin + path);
        const browser = (res) => new Response(res.body, { status: 200, headers: { ...Object.fromEntries(res.headers), "cache-control": "no-store", ...cors } });
        const hit = await cache?.match(key);
        if (hit) return browser(hit);
        const res = respond(await PUBLIC[path](env, Date.now()), 200, { "cache-control": "public, max-age=300" });
        if (cache) ctx.waitUntil(cache.put(key, res.clone()));
        return browser(res);
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
export { aboutText, bookHistory, connectors, coverCandidates, DERIVE_VERSION, fetchCover, pickCover, refreshAbout, setStatus, addDays, addWord, adminData, audioFor, authorized, band, booksList, buildSummary, candidates, cardsCsv, cardsJson, classify, commonsAudio, coverSource, dayOf, deleteWord, derive, editWord, ensureAudio, eveningPush, exportAll, forecast, getNote, getSettings, handTerm, hasHtml, healthLines, imageType, importList, ingest, learnNotes, nextBox, noteFile, notesToWrite, notification, notifications, notify, pace, pickRecording, progress, publicTitle, publishNote, pull, review, rotateToken, saveNote, sentences, sentencesMined, setBook, setSettings, streak, summary, syncCovers, termOf, todayCard, unpublishNote, uploadCover, weeklyPush, wordFacts };
