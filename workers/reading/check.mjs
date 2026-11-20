// node workers/reading/check.mjs: the derivations and the whole ingest, offline.
// CrossPoint Sync answers come from fixtures/ (built from the documented shapes
// in its API reference), D1 is Node's built-in SQLite behind a small shim, and
// Workers AI and ntfy are stubs. No network, no account.
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as w from "./index.js";

const here = new URL(".", import.meta.url);
const fixture = (name) => fs.readFileSync(new URL(`fixtures/${name}.json`, here), "utf8");

// ---- dates and streaks: the day is Istanbul's, not UTC's
assert.equal(w.dayOf(Date.parse("2026-11-17T20:59:00Z")), "2026-11-17"); // 23:59 in Istanbul
assert.equal(w.dayOf(Date.parse("2026-11-17T21:00:00Z")), "2026-11-18"); // midnight in Istanbul, still the 17th in UTC
assert.equal(w.addDays("2026-02-28", 1), "2026-03-01");
const run = ["2026-11-15", "2026-11-16", "2026-11-17"];
assert.deepEqual(w.streak(run, "2026-11-17"), { current: 3, longest: 3 });
assert.deepEqual(w.streak(run, "2026-11-18"), { current: 3, longest: 3 }, "today unread does not break the run");
assert.deepEqual(w.streak(run, "2026-11-19"), { current: 0, longest: 3 }, "a whole missed day does");
assert.deepEqual(w.streak(["2026-12-31", "2027-01-01", "2026-12-30", "2026-12-01"], "2027-01-01"), { current: 3, longest: 3 });
assert.deepEqual(w.streak([], "2026-11-18"), { current: 0, longest: 0 });

// ---- pace and forecast
const rows = [
  { day: "2026-11-01", from_pct: 0, to_pct: 0.3 }, // outside the window
  { day: "2026-11-10", from_pct: 0.4, to_pct: 0.5 },
  { day: "2026-11-17", from_pct: 0.5, to_pct: 0.54 },
  { day: "2026-11-16", from_pct: 0.6, to_pct: 0.5 }, // going back never counts as negative reading
];
assert.ok(Math.abs(w.pace(rows, "2026-10-01", "2026-11-18") - 0.14 / 14) < 1e-12);
assert.ok(Math.abs(w.pace(rows, "2026-11-10", "2026-11-18") - 0.14 / 9) < 1e-12, "a newer book is measured since it was started");
assert.equal(w.pace([], null, "2026-11-18"), 0);
assert.equal(w.forecast(0.5, 0.05, "2026-11-18"), "2026-11-28");
assert.equal(w.forecast(0.5, 0, "2026-11-18"), null);
assert.equal(w.forecast(0.5, 0.0001, "2026-11-18"), null, "more than ten years away is no forecast");
assert.equal(w.forecast(1, 0.1, "2026-11-18"), "2026-11-18");

// ---- vocabulary or sentence
assert.deepEqual(w.classify("ubiquitous"), { kind: "word", term: "ubiquitous" });
assert.deepEqual(w.classify("  “Mellow,” "), { kind: "word", term: "mellow" });
assert.deepEqual(w.classify("give   up"), { kind: "word", term: "give up" });
assert.deepEqual(w.classify("by and large"), { kind: "word", term: "by and large" });
assert.deepEqual(w.classify("Don’t"), { kind: "word", term: "don't" });
assert.equal(w.classify("one two three four").kind, "sentence");
assert.equal(w.classify("x".repeat(61)).kind, "sentence");
assert.equal(w.classify(" ... "), null);
assert.deepEqual(w.candidates("abandoned"), ["abandoned", "abandon", "abandone"]);
assert.ok(w.candidates("running").includes("run"));
assert.ok(w.candidates("stories").includes("story"));
assert.deepEqual(w.candidates("give up"), ["give up"]);

// ---- Leitner
assert.equal(w.nextBox(1, "good"), 2);
assert.equal(w.nextBox(5, "good"), 5);
assert.equal(w.nextBox(4, "again"), 1);

// ---- D1 on node:sqlite
function d1(sqlite) {
  const statement = (sql, args = []) => ({
    bind: (...a) => statement(sql, a),
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    first: async (col) => {
      const row = sqlite.prepare(sql).get(...args) ?? null;
      return col ? (row?.[col] ?? null) : row;
    },
    run: async () => (sqlite.prepare(sql).run(...args), { success: true }),
    sql,
    args,
  });
  return {
    prepare: (sql) => statement(sql),
    batch: async (list) => {
      sqlite.exec("BEGIN");
      try {
        const out = list.map((s) => ({ results: sqlite.prepare(s.sql).all(...s.args) }));
        sqlite.exec("COMMIT");
        return out;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(fs.readFileSync(new URL("schema.sql", here), "utf8"));
sqlite.exec(`INSERT INTO dict (word, ipa, pos, def, tr) VALUES
  ('ubiquitous', 'juˈbɪkwətəs', 'adjective', 'being everywhere', 'aynı zamanda her yerde bulunan, hazır ve nazır'),
  ('abandon', 'əˈbæn.dən', 'verb', 'to give up control of, surrender', 'bırakmak, kovmak'),
  ('give up', NULL, 'verb', 'admit defeat', 'pes etmek'),
  ('run', 'ɹʌn', 'verb', 'to move quickly on two feet', 'koşmak')`);

// CrossPoint Sync, ntfy and Workers AI, all offline.
const answers = Object.fromEntries(["healthz", "progress", "activity", "overview", "clippings"].map((n) => [n, fixture(n)]));
const requests = [];
const pushed = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  if (url.host === "ntfy.example") {
    pushed.push(JSON.parse(init.body));
    return new Response("{}");
  }
  if (url.host.endsWith("wikimedia.org") || url.host === "en.wiktionary.org") return wiki(url, init);
  if (url.host === "busahin.com" && url.pathname === "/reading/notes.json") return new Response(answers.notes ?? '{"notes":[]}');
  if (url.host === "assets.hardcover.app") return (coverFetches.push(url.href), coverAnswer(url));
  if (url.host === "api.github.com") return githubApi(url, init);
  const more = url.host === "sync.example" ? syncMore(url, init) : null;
  if (more) return more;
  requests.push({ url, headers: init.headers });
  const name = { "/healthz": "healthz", "/api/v1/progress": "progress", "/api/v1/stats/activity": "activity", "/api/v1/stats/overview": "overview", "/api/v1/clippings": "clippings" }[url.pathname];
  return name ? new Response(answers[name]) : new Response('{"code":2001,"message":"Unauthorized"}', { status: 401 });
};
// Hardcover's cover images and the GitHub contents API, both offline (defined with their checks below).
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
const coverFetches = [];
let coverAnswer = () => new Response(JPEG, { headers: { "content-type": "image/jpeg", "content-length": String(JPEG.length) } });
let githubApi = () => new Response("{}", { status: 500 });
// The Sync routes read live or now and then (descriptions, a book's history and devices, linked apps,
// cover candidates) and the two it may write (status, dates), from API.md's documented shapes.
const readest = JSON.parse(fixture("readest"));
const syncWrites = [];
const syncMore = (url, init) => {
  const p = url.pathname;
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
  if (init.method === "PUT" && /^\/api\/v1\/documents\/[^/]+\/(status|dates)$/.test(p)) return (syncWrites.push({ path: p, body: JSON.parse(init.body) }), json({}));
  if (/\/about$/.test(p)) return p.includes("a1b2c3d4e5f60718293a4b5c6d7e8f90") ? json({ description: "Stevens drives west.\r\n\n\n\nA\tbutler\u0007 remembers.", manual: false }) : json({ code: 2004, message: "Not found" }, 404);
  if (p === "/api/v1/stats/activity/books")
    return json({ books: [{ document: url.searchParams.get("documents"), started_at: 1794000000, finished_at: null, page_count: 258, pages_read: 160, reading_days: ["2026-11-16", "2026-11-17", "bad"], days: [{ day: "2026-11-16", pages: 20, syncs: 2 }, { day: "2026-11-17", pages: 5, syncs: 1 }, { day: 7 }], requested: [url.searchParams.get("documents")] }] });
  if (/^\/api\/v1\/progress\/[^/]+$/.test(p) && p !== "/api/v1/progress/changes")
    return json({ document: p.split("/").pop(), devices: [{ device_id: "crosspoint-reader", device: "CrossPoint", percentage: 0.62, progress: "x", position: { spine: 7 }, timestamp: 1795000000 }, { device_id: "readest", device: "Readest", percentage: 0.6, progress: "y", position: null, timestamp: 1794990000 }] });
  if (p === "/api/v1/connectors")
    return json({ encryption: "enabled", connectors: [
      { id: "readest", name: "Readest", linked: true, status: "ok", account: "me", queue: { pending: 2, dead: 1 }, queue_errors: [{ kind: "highlight", message: "clipping text not found at its position in the Readest copy of the book", count: 1 }] },
      { id: "hardcover", name: "Hardcover", linked: true, status: "ok", queue: { pending: 0, dead: 0 }, queue_errors: [] },
      { id: "readwise", name: "Readwise", linked: false, status: null } ] });
  if (/\/cover\/candidates$/.test(p))
    return json({ items: [
      { url: "https://is3-ssl.mzstatic.com/image/thumb/Publication/v4/aa/600x600bb.jpg", title: "Foundryside", author: "Robert Jackson Bennett", source: "apple" },
      { url: "https://covers.openlibrary.org/b/id/240727-L.jpg", title: "Foundryside", source: "openlibrary", pages: 512 },
      { url: "https://evil.example/cover.jpg", title: "x" },
      { url: "http://covers.openlibrary.org/b/id/1-L.jpg", title: "plain http" } ] });
  return null;
};
let aiCalls = 0;
const env = {
  DB: d1(sqlite),
  SYNC_URL: "https://sync.example",
  SYNC_USER: "reader",
  SYNC_KEY: "0f359740bd1cda994f8b55330c86d845",
  NTFY_URL: "https://ntfy.example",
  NTFY_TOPIC: "a-long-unguessable-topic",
  READING_TOKEN: "t".repeat(40),
  AI: { run: async (model, input) => (aiCalls++, { translated_text: `TR: ${input.text}` }) },
};
const NOW = Date.parse("2026-11-18T07:00:00Z"); // 10:00 in Istanbul
const tables = () => Object.fromEntries(["books", "days", "book_days", "clippings", "cards", "daily"].map((t) => [t, sqlite.prepare(`SELECT * FROM ${t} ORDER BY 1, 2`).all()]));
const changes = () => sqlite.prepare("SELECT total_changes() AS n").get().n;

// ---- first pull
const first = await w.ingest(env, NOW);
assert.deepEqual(first.changed.sort(), ["activity", "clippings", "overview", "progress"]);
for (const r of requests.filter((r) => r.url.pathname !== "/healthz")) {
  assert.equal(r.headers["x-auth-user"], "reader");
  assert.equal(r.headers["x-auth-key"], env.SYNC_KEY);
}
assert.ok(requests.filter((r) => r.url.pathname.startsWith("/api/v1/stats/")).every((r) => r.url.searchParams.get("tz") === "-180"), "days are bucketed in Istanbul");
assert.equal(first.books, 4);
assert.equal(first.clippings, 7, "the blank clipping and the malformed id are skipped");
const t1 = tables();
const klaraRow = t1.books.find((b) => b.document === "ffeeddccbbaa99887766554433221100");
assert.deepEqual([klaraRow.title, klaraRow.filename], [null, "Klara and the Sun - Kazuo Ishiguro.epub"], "no metadata: no title, the file name kept apart");
assert.deepEqual(t1.clippings.filter((c) => c.kind === "word").map((c) => c.term).sort(), ["abandoned", "give up", "mellow", "running", "ubiquitous"]);
assert.deepEqual(t1.cards.map((c) => [c.term, c.box, c.due]), ["abandoned", "give up", "mellow", "running", "ubiquitous"].map((t) => [t, 1, "2026-11-18"]));
assert.equal(first.translated, 2);
assert.equal(t1.clippings.find((c) => c.id === "c0ffee0011223302").translation, "TR: The ubiquitous hum of the house had settled into something like a promise, and I found I did not mind it.");
assert.equal(t1.daily.find((d) => d.day === "2026-11-18").translations, 2);

// ---- the same answers again: nothing but the fetch times changes, and nothing is translated twice
const before = changes();
const second = await w.ingest(env, NOW + 1_800_000);
assert.deepEqual(second.changed, []);
assert.equal(second.translated, 0);
assert.equal(aiCalls, 2);
assert.deepEqual(tables(), t1);
assert.equal(changes() - before, 5, "only the four raw rows' fetched_at and the stored summary");
assert.ok(sqlite.prepare("SELECT COUNT(*) AS n FROM raw WHERE server_version = '0.1.0'").get().n === 4);

// ---- a database ingested by older code is re-derived once, even when Sync's answers are unchanged
{
  const meta = () => sqlite.prepare("SELECT cover_url, release_year, genres FROM books WHERE document = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'").get();
  const filled = meta();
  assert.equal(filled.cover_url, "https://assets.hardcover.app/edition/30373948/remains.jpeg");
  // As the live database stood after upgrades/0003: new columns empty, hashes current, no version.
  sqlite.exec("UPDATE books SET cover_url = NULL, release_year = NULL, genres = NULL; DELETE FROM meta WHERE key = 'derive_version'");
  const backfill = await w.ingest(env, NOW);
  assert.deepEqual(backfill.changed.sort(), ["activity", "clippings", "overview", "progress"], "an older derivation re-reads every answer");
  assert.deepEqual(meta(), filled, "cover_url and the metadata are filled on the first pull");
  assert.equal(sqlite.prepare("SELECT value FROM meta WHERE key = 'derive_version'").get().value, String(w.DERIVE_VERSION));
  assert.deepEqual((await w.ingest(env, NOW)).changed, [], "and only once");
}

// ---- a re-derive from the stored raw answers gives the same rows
const raw = Object.fromEntries(sqlite.prepare("SELECT endpoint, body FROM raw").all().map((r) => [r.endpoint, JSON.parse(r.body)]));
assert.deepEqual(w.derive(raw), w.derive(Object.fromEntries(["progress", "activity", "clippings"].map((n) => [n, JSON.parse(answers[n])]))));

// ---- summary
const s = await w.summary(env, NOW);
assert.equal(s.today, "2026-11-18");
assert.deepEqual(s.streak, { current: 8, longest: 11 });
assert.equal(s.days.length, 21);
assert.deepEqual(s.days.at(-1), ["2026-11-17", 5]);
assert.deepEqual(s.reading.map((b) => b.title), ["The Remains of the Day"], "paused and finished books are not in progress, and a book with only a file name is not shown");
const remains = s.reading[0];
// 0.22 of the book over the last 14 days (it was started 18 days ago).
assert.equal(remains.percent, 62);
assert.equal(remains.percent_per_day, 1.6);
assert.equal(remains.pages_per_day, 4.1);
assert.equal(remains.forecast, "2026-12-13");
assert.equal(remains.started, "2026-11-01");
assert.deepEqual(s.finished, [{ title: "Foundryside", author: "Robert Jackson Bennett", cover: null, started: "2026-10-20", finished: "2026-10-30", days: 11 }]);
assert.equal(remains.cover, null, "no bucket in the first pulls: no cover copy, and never Hardcover's own address");
for (const secret of ["hardcover", "1989", "Historical"]) assert.ok(!JSON.stringify(s).includes(secret), `summary carries "${secret}"`);
assert.deepEqual(Object.keys(s).sort(), ["days", "finished", "reading", "since", "streak", "time", "today", "updated_at"], "nothing about words in public");
assert.equal(s.since, "2026-10-20", "without TRACKING_SINCE: the earliest day synced");
assert.equal((await w.buildSummary({ ...env, TRACKING_SINCE: "2026-11-16" }, NOW)).since, "2026-11-16");
assert.equal((await w.buildSummary({ ...env, TRACKING_SINCE: "16 Nov" }, NOW)).since, "2026-10-20", "a malformed var is ignored");
assert.deepEqual((await w.buildSummary({ ...env, TRACKING_SINCE: "2026-11-16" }, NOW)).streak, s.streak, "the streak does not change");
assert.equal(s.time, null, "CrossPoint uploads no reading time");
assert.ok(s.updated_at > 0);
const sJson = JSON.stringify(s);
for (const secret of ["hum of the house", "boats against", "TR:", "Chapter"]) assert.ok(!sJson.includes(secret), `summary leaks "${secret}"`);

// ---- word of the day: chosen once, kept all day, rotates the next
assert.deepEqual(await w.todayCard(env, NOW), { day: "2026-11-18", streak: 8 }, "the public card is the day and the streak only");
const day1 = await w.todayCard(env, NOW, true);
assert.equal(day1.streak, 8);
assert.deepEqual(day1.words, { collected: 5, learned: 0 });
assert.deepEqual(await w.todayCard(env, NOW + 3_600_000, true), day1);
const day2 = await w.todayCard(env, NOW + 86_400_000, true);
assert.notEqual(day2.word.term, day1.word.term, "a new day shows a word not shown yet");
// "abandoned" is looked up under its headword.
sqlite.exec("UPDATE daily SET term = 'abandoned' WHERE day = '2026-11-21'");
sqlite.exec("INSERT OR IGNORE INTO daily (day, term) VALUES ('2026-11-21', 'abandoned')");
const abandoned = await w.todayCard(env, Date.parse("2026-11-21T07:00:00Z"), true);
assert.deepEqual(abandoned.word, { term: "abandoned", ipa: "əˈbæn.dən", tr: "bırakmak, kovmak", def: "to give up control of, surrender" });

// ---- reviews
assert.equal(await w.review(env, { term: "nope", grade: "good" }, NOW), undefined);
assert.equal(await w.review(env, { term: "mellow", grade: "maybe" }, NOW), null);
assert.equal(await w.review(env, { term: 42, grade: "good" }, NOW), null);
let card = await w.review(env, { term: "Mel\u00ADlow\u200B", grade: "good" }, NOW);
assert.deepEqual({ ...card }, { term: "mellow", box: 2, due: "2026-11-20", reviews: 1, lapses: 0 }, "a soft hyphen or zero-width space never makes another word");
const again = await w.review(env, { term: "mellow", grade: "good" }, NOW);
assert.equal(again.error, "not due", "a retried or doubled answer cannot move the card twice");
assert.deepEqual({ ...again.card }, { term: "mellow", box: 2, due: "2026-11-20", reviews: 1, lapses: 0 });
// Answered on each due day: 1 -> 2 -> 3 -> 4 -> 5 days 2, 4 and 8 apart.
const at = (day) => Date.parse(`${day}T07:00:00Z`);
for (const day of ["2026-11-20", "2026-11-24", "2026-12-02"]) card = await w.review(env, { term: "mellow", grade: "good" }, at(day));
assert.deepEqual([card.box, card.due, card.reviews], [5, "2026-12-18", 4]);
assert.equal((await w.todayCard(env, at("2026-12-02"), true)).words.learned, 1);
const times = sqlite.prepare("SELECT first_reviewed_at, matured_at FROM cards WHERE term = 'mellow'").get();
assert.deepEqual({ ...times }, { first_reviewed_at: NOW / 1000, matured_at: at("2026-12-02") / 1000 }, "first review and maturity are recorded");
card = await w.review(env, { term: "mellow", grade: "again" }, at("2026-12-18"));
assert.deepEqual([card.box, card.due, card.lapses], [1, "2026-12-19", 1]);
sqlite.exec("UPDATE cards SET due = '2026-11-18' WHERE term = 'mellow'");

// ---- the Anki export
const csv = await w.cardsCsv(env);
const lines = csv.trim().split("\n");
assert.equal(lines[2], "#columns:Word,IPA,Turkish,Definition,Sentence,Sentence (TR),Book");
assert.equal(lines.length, 3 + 5);
const ubiquitous = lines.find((l) => l.startsWith('"ubiquitous"'));
assert.equal(
  ubiquitous,
  '"ubiquitous","/juˈbɪkwətəs/","aynı zamanda her yerde bulunan, hazır ve nazır","being everywhere","The ubiquitous hum of the house had settled into something like a promise, and I found I did not mind it.","TR: The ubiquitous hum of the house had settled into something like a promise, and I found I did not mind it.","The Remains of the Day"',
);
assert.ok(lines.some((l) => l.startsWith('"running","/ɹʌn/","koşmak"')));
assert.ok(lines.some((l) => l.startsWith('"mellow","","",""')), "a word the dictionary lacks still exports");
assert.equal((await w.sentences(env)).items.length, 2);

// ---- a clipping deleted on the reader is gone after the next pull; its card stays but leaves the counts
const fewer = JSON.parse(answers.clippings);
fewer.items = fewer.items.filter((c) => c.text !== "Running");
answers.clippings = JSON.stringify(fewer);
const third = await w.ingest(env, NOW + 3_600_000);
assert.deepEqual(third.changed, ["clippings"]);
assert.equal(sqlite.prepare("SELECT deleted FROM clippings WHERE text = 'Running'").get().deleted, 1);
assert.equal((await w.todayCard(env, NOW, true)).words.collected, 4);
assert.ok(!(await w.cardsCsv(env)).includes('"running"'));

// ---- an error from Sync writes nothing
const savedProgress = answers.progress;
answers.progress = "not json";
const snapshot = tables();
await assert.rejects(w.ingest(env, NOW + 7_200_000));
assert.deepEqual(tables(), snapshot);
answers.progress = savedProgress;

// ---- the daily cap on translations counts attempts
sqlite.exec("UPDATE daily SET translations = 40 WHERE day = '2026-11-18'");
sqlite.exec("UPDATE clippings SET translation = NULL WHERE kind = 'sentence'");
await w.ingest(env, NOW + 9_000_000);
assert.equal(aiCalls, 2, "no translations past the cap");

// ---- morning notification, once a day
assert.equal(await w.notify(env, NOW), true);
assert.equal(await w.notify(env, NOW + 60_000), false, "a retried cron does not send twice");
assert.equal(pushed.length, 1);
assert.equal(pushed[0].topic, env.NTFY_TOPIC);
assert.equal(pushed[0].title, day1.word.term);
assert.ok(pushed[0].message.endsWith("Streak: 8 days."));
assert.equal(pushed[0].click, "https://busahin.com/reading/");
assert.deepEqual(w.notification(null, 0), { title: "Reading", message: "No words clipped yet.\nNo streak right now. A page today starts one." });
assert.deepEqual(w.notification({ term: "give up", ipa: null, tr: "pes etmek", def: "admit defeat" }, 1), {
  title: "give up",
  message: "pes etmek\nadmit defeat\nStreak: 1 day.",
});

// ---- the private routes want the token
const ask = (auth) => w.authorized(new Request("https://busahin.com/api/reading/cards.csv", { headers: auth ? { authorization: auth } : {} }), env);
assert.equal(await ask(`Bearer ${env.READING_TOKEN}`), true);
assert.equal(await ask(`Bearer ${env.READING_TOKEN}x`), false);
assert.equal(await ask(""), false);
assert.equal(await w.authorized(new Request("https://x/", { headers: { authorization: "Bearer short" } }), { READING_TOKEN: "short" }), false, "a short token is never accepted");

// ---- routing: one token check for every private route; today is public without one
const open = { limit: async () => ({ success: true }) };
const call = (method, path, auth, body) =>
  w.default.fetch(
    new Request(`https://busahin.com${path}`, { method, headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body }),
    { ...env, PER_VISITOR: open, SITE_WIDE: open },
    { waitUntil() {} },
  );
const publicToday = await (await call("GET", "/api/reading/today")).json();
assert.deepEqual(Object.keys(publicToday).sort(), ["day", "streak"]);
const privateToday = await (await call("GET", "/api/reading/today", env.READING_TOKEN)).json();
assert.ok(privateToday.word && privateToday.words);
assert.equal((await call("GET", "/api/reading/today", "wrong")).status, 404, "a wrong token is refused, not served the public card");
for (const [method, path] of [["GET", "/api/reading/cards.csv"], ["GET", "/api/reading/sentences"], ["POST", "/api/reading/sync"], ["POST", "/api/reading/review"]])
  assert.equal((await call(method, path)).status, 404, `${method} ${path} needs the token`);
assert.equal((await call("GET", "/api/reading/cards.csv", env.READING_TOKEN)).headers.get("content-type"), "text/csv; charset=utf-8");
assert.equal((await call("POST", "/api/reading/review", env.READING_TOKEN, '{"term":"give up","grade":"good"}')).status, 200);
assert.equal((await call("POST", "/api/reading/review", env.READING_TOKEN, "not json")).status, 400);
assert.equal((await call("GET", "/api/reading/review", env.READING_TOKEN)).status, 405);
assert.equal((await call("DELETE", "/api/reading/summary")).status, 405);
assert.equal((await call("GET", "/api/reading/nope")).status, 404);
const publicSummary = await (await call("GET", "/api/reading/summary")).text();
for (const word of ["word", "vocab", "learn", "english", "ielts"]) assert.ok(!publicSummary.toLowerCase().includes(word), `public summary mentions "${word}"`);

// ---- R1: a sentence the model fails on never holds up the others
{
  sqlite.exec("UPDATE daily SET translations = 0");
  sqlite.exec("UPDATE clippings SET translation = NULL, translate_tries = 0 WHERE kind = 'sentence'");
  const bad = "c0ffee0011223302"; // the newest sentence
  const saved = env.AI;
  const log = console.error;
  console.error = () => {}; // the failures below are on purpose
  let calls = 0;
  env.AI = { run: async (model, input) => (calls++, input.text.startsWith("The ubiquitous") ? Promise.reject(new Error("model refused")) : { translated_text: `TR: ${input.text}` }) };
  await w.ingest(env, NOW + 10_000_000);
  const row = (id) => sqlite.prepare("SELECT translation, translate_tries FROM clippings WHERE id = ?").get(id);
  assert.equal(row(bad).translate_tries, 1);
  assert.ok(row("c0ffee0011223307").translation, "the older sentence is translated past the failing one");
  for (let i = 0; i < 6; i++) await w.ingest(env, NOW + 10_000_000 + i);
  assert.equal(row(bad).translate_tries, 5, "tried five times, then left alone");
  assert.equal(calls, 6, "one call per run until then, none after");
  // An empty answer counts as a failure, and two in a row end the run.
  sqlite.exec("UPDATE daily SET translations = 0");
  sqlite.exec("UPDATE clippings SET translation = NULL, translate_tries = 0 WHERE kind = 'sentence'");
  calls = 0;
  env.AI = { run: async () => (calls++, { translated_text: "  " }) };
  await w.ingest(env, NOW + 11_000_000);
  assert.equal(calls, 2);
  assert.deepEqual(sqlite.prepare("SELECT translate_tries FROM clippings WHERE kind = 'sentence' ORDER BY id").all().map((r) => r.translate_tries), [1, 1]);
  env.AI = saved;
  console.error = log;
}

// ---- R2: a 200 with the wrong shape, or empty lists, never empties the tables
{
  const counts = () => sqlite.prepare("SELECT (SELECT COUNT(*) FROM books) b, (SELECT COUNT(*) FROM days) d, (SELECT COUNT(*) FROM book_days) bd, (SELECT COUNT(*) FROM clippings WHERE deleted = 0) c").get();
  const before = { ...counts() };
  const saved = { ...answers };
  for (const [name, body] of [["activity", "{}"], ["progress", '{"error":"maintenance"}'], ["progress", "[]"], ["clippings", '{"items":null}'], ["overview", "null"]]) {
    Object.assign(answers, saved, { [name]: body });
    await assert.rejects(w.ingest(env, NOW + 12_000_000), /unexpected answer shape/, `${name} ${body}`);
    assert.deepEqual({ ...counts() }, before);
  }
  Object.assign(answers, saved, { activity: '{"books":[],"days":[]}', progress: '{"items":[],"next":null}', clippings: '{"items":[]}' });
  await w.ingest(env, NOW + 12_000_000);
  assert.deepEqual({ ...counts() }, before, "empty lists from a fresh or reset server delete nothing");
  // Null and broken records are skipped one by one, never the whole pull.
  const progress = JSON.parse(saved.progress);
  progress.items.push(null, 7, { document: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", title: 42, filename: 99, percentage: 3, timestamp: 1e17 });
  const activity = JSON.parse(saved.activity);
  activity.books.push(null, { document: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", started_at: 1e17 });
  activity.days.push(null, { day: 5 }, { day: "2026-11-18", books: [null, { document: 3 }] });
  Object.assign(answers, saved, { progress: JSON.stringify(progress), activity: JSON.stringify(activity), clippings: JSON.stringify({ items: [null, 1, ...JSON.parse(saved.clippings).items] }) });
  await w.ingest(env, NOW + 13_000_000);
  const broken = sqlite.prepare("SELECT title, filename, percentage, started_at, last_at FROM books WHERE document = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'").get();
  assert.deepEqual({ ...broken }, { title: null, filename: null, percentage: null, started_at: null, last_at: null }, "out-of-range values become null");
  assert.ok((await w.summary(env, NOW)).streak, "and the summary still builds");
  // A first page of books (next is set) deletes none of the rest.
  Object.assign(answers, saved, { progress: JSON.stringify({ items: JSON.parse(saved.progress).items.slice(0, 1), next: "x:y" }) });
  await w.ingest(env, NOW + 14_000_000);
  assert.equal(counts().b, before.b + 1);
  Object.assign(answers, saved);
  await w.ingest(env, NOW + 15_000_000);
  assert.equal(counts().b, before.b, "the broken book goes once the full list no longer has it");
}

// ---- a redirect from Sync is refused, so the credentials never follow it
{
  const real = globalThis.fetch;
  let init;
  globalThis.fetch = async (input, options = {}) =>
    new URL(input).pathname === "/api/v1/clippings" ? ((init = options), new Response(null, { status: 302, headers: { location: "https://elsewhere.example/" } })) : real(input, options);
  await assert.rejects(w.ingest(env, NOW + 15_500_000), /refused a redirect/);
  assert.equal(init.redirect, "manual", "Workers only accept follow or manual");
  globalThis.fetch = real;
}

// ---- a failed pull tells the owner why (endpoint and status or shape, no answer data), and is kept
{
  const saved = answers.activity;
  answers.activity = "<html>secret page</html>";
  const res = await call("POST", "/api/reading/sync", env.READING_TOKEN);
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.deepEqual(body, { error: "pull failed", reason: "activity: not JSON" });
  answers.activity = saved;
  const last = (await w.todayCard(env, NOW, true)).last_pull;
  assert.deepEqual([last.ok, last.error], [false, "activity: not JSON"]);
  assert.equal((await call("POST", "/api/reading/sync")).status, 404, "never without the token");
  const ok = await (await call("POST", "/api/reading/sync", env.READING_TOKEN)).json();
  assert.ok(Array.isArray(ok.changed));
  assert.equal((await w.todayCard(env, NOW, true)).last_pull.ok, true);
  assert.deepEqual(Object.keys(await w.todayCard(env, NOW)).sort(), ["day", "streak"], "the public card is unchanged");
}

// ---- R4: a health check that is not JSON never stops a pull
{
  const saved = answers.healthz;
  for (const body of ["ok", "null", ""]) {
    answers.healthz = body;
    await w.ingest(env, NOW + 16_000_000);
  }
  answers.healthz = saved;
}

// ---- R5: titles that must stay off the public page
{
  const doc = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const progress = JSON.parse(answers.progress);
  progress.items.push({ document: doc, title: "Private Notebook Volume 18", author: "Someone", filename: "notebook18.pdf", percentage: 0.3, timestamp: 1794944400, status: "reading" });
  answers.progress = JSON.stringify(progress);
  await w.ingest(env, NOW + 17_000_000);
  env.HIDE_TITLES = "notebook, journal";
  const shown = async () => {
    await w.ingest(env, NOW + 17_100_000);
    return JSON.stringify(await w.summary(env, NOW + 17_100_000));
  };
  let pub = await shown();
  assert.ok(!/notebook|klara|\.epub|\.pdf/i.test(pub), "a matching title and a file-name-only book stay off the public page");
  const remains = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
  assert.equal((await w.setBook(env, { document: remains, hidden: true }, NOW)).shown_as, null);
  assert.ok(!(await w.summary(env, NOW)).reading.length, "a hidden book disappears at once (the stored summary is rebuilt)");
  await w.setBook(env, { document: remains, hidden: false }, NOW);
  const klara = await w.setBook(env, { document: "ffeeddccbbaa99887766554433221100", title: "Klara and the Sun" }, NOW);
  assert.equal(klara.shown_as, "Klara and the Sun");
  pub = await w.summary(env, NOW);
  assert.deepEqual(pub.reading.map((b) => b.title), ["The Remains of the Day", "Klara and the Sun"], "a title given from the private side is shown");
  const klaraPub = pub.reading[1];
  assert.deepEqual([klaraPub.percent_per_day, klaraPub.forecast], [0, null], "the first synced day is where the book was, not reading done that day");
  assert.equal(await w.setBook(env, { document: "no pe!" }, NOW), null);
  assert.equal(await w.setBook(env, { document: "cccccccccccccccccccccccccccccccc" }, NOW), undefined);
  assert.equal(await w.setBook(env, { document: remains, hidden: "yes" }, NOW), null);
  assert.ok((await w.booksList(env)).books.some((b) => b.document === doc && b.shown_as === null && b.filename === "notebook18.pdf"), "the private list says what is hidden and why it is there");
  delete env.HIDE_TITLES;
}

// ---- slow progress stays visible
{
  const doc = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
  sqlite.exec(`UPDATE book_days SET from_pct = 0.6, to_pct = 0.603 WHERE document = '${doc}' AND day = '2026-11-17'`);
  sqlite.exec(`UPDATE book_days SET from_pct = to_pct WHERE document = '${doc}' AND day <> '2026-11-17'`);
  const slow = (await w.buildSummary(env, NOW)).reading.find((b) => b.title === "The Remains of the Day");
  assert.ok(slow.percent_per_day > 0 && slow.forecast, `0.3% over two weeks is shown, not rounded to nothing (${slow.percent_per_day})`);
}

// ---- R3: the private routes find a card's clipping through an index, not a scan
{
  const plan = (sql) => sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all().map((r) => r.detail).join(" | ");
  assert.match(plan("SELECT 1 FROM cards WHERE EXISTS (SELECT 1 FROM clippings w WHERE w.kind = 'word' AND w.deleted = 0 AND w.term = cards.term)"), /clippings_word_term/);
  assert.match(plan("SELECT 1 FROM clippings s WHERE s.kind = 'sentence' AND s.deleted = 0 AND s.document = 'x'"), /clippings_sentences/);
  // 3000 cards: the private card count stays fast.
  sqlite.exec("BEGIN");
  const ins = sqlite.prepare("INSERT INTO clippings (id, document, text, kind, term, created_at) VALUES (?, 'a1b2c3d4e5f60718293a4b5c6d7e8f90', ?, 'word', ?, 1794900000)");
  const card = sqlite.prepare("INSERT OR IGNORE INTO cards (term, due, added_at) VALUES (?, '2026-11-18', 1)");
  for (let i = 0; i < 3000; i++) (ins.run(`f${String(i).padStart(15, "0")}`, `word${i}`, `word${i}`), card.run(`word${i}`));
  sqlite.exec("COMMIT");
  const t0 = performance.now();
  await w.todayCard(env, NOW, true);
  assert.ok(performance.now() - t0 < 200, `private today at 3000 cards took ${Math.round(performance.now() - t0)} ms`);
  sqlite.exec("DELETE FROM clippings WHERE id LIKE 'f%'; DELETE FROM cards WHERE term LIKE 'word%'");
}

// ---- the stored summary is what the public route reads
{
  sqlite.exec(`UPDATE meta SET value = json_set(value, '$.streak.longest', 999) WHERE key = 'summary'`);
  const stored = JSON.parse(sqlite.prepare("SELECT value FROM meta WHERE key = 'summary'").get().value);
  assert.equal((await w.summary(env, Date.parse(`${stored.today}T12:00:00Z`))).streak.longest, 999, "one row read on a hit");
  assert.notEqual((await w.summary(env, Date.parse(`${stored.today}T12:00:00Z`) + 86_400_000)).streak.longest, 999, "a stored summary from yesterday is not used");
}

// ---- the limiter runs first and really refuses; CORS only on public answers
{
  const shut = { limit: async () => ({ success: false }) };
  const res = await w.default.fetch(new Request("https://busahin.com/api/reading/cards.csv", { headers: { authorization: "Bearer wrong" } }), { ...env, PER_VISITOR: shut, SITE_WIDE: open }, { waitUntil() {} });
  assert.equal(res.status, 429, "refused before the token is even checked");
  const site = await w.default.fetch(new Request("https://busahin.com/api/reading/summary"), { ...env, PER_VISITOR: open, SITE_WIDE: shut }, { waitUntil() {} });
  assert.equal(site.status, 429, "the site-wide limit holds too");
  const from = (path, origin, auth) =>
    w.default.fetch(new Request(`https://busahin.com${path}`, { headers: { origin, ...(auth ? { authorization: `Bearer ${auth}` } : {}) } }), { ...env, PER_VISITOR: open, SITE_WIDE: open }, { waitUntil() {} });
  assert.equal((await from("/api/reading/summary", "http://localhost:4321")).headers.get("access-control-allow-origin"), "http://localhost:4321");
  assert.equal((await from("/api/reading/summary", "https://evil.example")).headers.get("access-control-allow-origin"), null);
  for (const path of ["/api/reading/today", "/api/reading/cards.csv", "/api/reading/books"])
    assert.equal((await from(path, "http://localhost:4321", env.READING_TOKEN)).headers.get("access-control-allow-origin"), null, `${path} never carries CORS`);
  for (const [method, path] of [["GET", "/api/reading/books"], ["POST", "/api/reading/books"]])
    assert.equal((await call(method, path)).status, 404, `${method} ${path} needs the token`);
}

// ---- words added by hand
assert.equal(w.handTerm("  Serendipity! "), "serendipity");
assert.equal(w.handTerm("take something for granted"), "take something for granted");
for (const bad of ["", "  ...  ", "1234", "one two three four five six seven", "x".repeat(61), null, 42]) assert.equal(w.handTerm(bad), null, `refuses ${bad}`);

sqlite.exec(`INSERT INTO dict (word, ipa, pos, def, tr) VALUES ('serendipity', 'ˌsɛɹ.ənˈdɪp.ɪ.ti', 'noun', 'a combination of events which have come together by chance', 'şans eseri bulma')`);
sqlite.exec(`INSERT INTO examples (word, id, en, tr) VALUES
  ('ubiquitous', 5379449, 'Cellphones are now ubiquitous.', 'Cep telefonları artık her yerde vardır.'),
  ('abandon', 255842, 'I was forced to abandon the plan.', 'Plandan vazgeçmek zorunda kaldım.'),
  ('abandon', 634991, 'He decided to abandon law for art.', 'O sanat için hukuku terk etmeye karar verdi.'),
  ('abandon', 690265, 'We were obliged to abandon our plan.', 'Planımızdan vazgeçmek zorunda kaldık.'),
  ('abandon', 700000, 'A fourth one is never shown.', 'Dördüncü hiç gösterilmez.')`);

const calls = aiCalls;
sqlite.exec("UPDATE daily SET translations = 0");
const added = await w.addWord(env, { term: "Serendipity", note: "from a podcast", sentence: "It was pure serendipity that we met." }, NOW);
assert.equal(added.source, "manual");
assert.equal(added.due, "2026-11-18", "a new word is due the day it is added");
assert.deepEqual([added.ipa, added.tr, added.note], ["ˌsɛɹ.ənˈdɪp.ɪ.ti", "şans eseri bulma", "from a podcast"]);
assert.equal(added.sentence_tr, "TR: It was pure serendipity that we met.", "his sentence is translated once");
assert.equal(aiCalls, calls + 1);
assert.equal((await w.todayCard(env, NOW, true)).words.collected, 5, "a manual word counts like a clipped one");
const merged = await w.addWord(env, { term: "ubiquitous", note: "everywhere at once" }, NOW);
assert.deepEqual([merged.source, merged.note], ["clipping", "everywhere at once"], "adding a word that is already a card keeps it a clipped card");
assert.equal(await w.addWord(env, { term: "   " }, NOW), null);

// Examples: the word's own first, then its headword's, three at most.
const cardsNow = await w.cardsJson(env, NOW);
const byTerm = Object.fromEntries(cardsNow.cards.map((c) => [c.term, c]));
assert.deepEqual(byTerm.ubiquitous.examples, [{ id: 5379449, en: "Cellphones are now ubiquitous.", tr: "Cep telefonları artık her yerde vardır." }]);
assert.equal(byTerm.ubiquitous.clipped, "The ubiquitous hum of the house had settled into something like a promise, and I found I did not mind it.");
assert.equal(byTerm.ubiquitous.book, "The Remains of the Day");
assert.deepEqual(byTerm.abandoned.examples.map((e) => e.id), [255842, 634991, 690265], "abandoned borrows abandon's examples");
assert.ok(!("running" in byTerm), "a card whose clipping was deleted is left out");

// Editing and deleting.
assert.deepEqual(await w.editWord(env, { term: "ubiquitous", new_term: "omnipresent" }, NOW), { error: "clipped" }, "a clipped word keeps its name");
assert.deepEqual(await w.editWord(env, { term: "serendipity", new_term: "ubiquitous" }, NOW), { error: "exists" });
let edited = await w.editWord(env, { term: "serendipity", new_term: "Serendipitous", note: "", sentence: "A serendipitous find." }, NOW);
assert.deepEqual([edited.term, edited.note, edited.sentence, edited.sentence_tr], ["serendipitous", null, "A serendipitous find.", "TR: A serendipitous find."]);
edited = await w.editWord(env, { term: "serendipitous", note: "kept" }, NOW);
assert.deepEqual([edited.note, edited.sentence], ["kept", "A serendipitous find."], "fields left out stay as they were");
assert.equal(await w.editWord(env, { term: "nope" }, NOW), undefined);
assert.deepEqual(await w.deleteWord(env, { term: "ubiquitous" }), { error: "clipped" }, "a clipped word is deleted on the reader");
assert.deepEqual(await w.deleteWord(env, { term: "serendipitous" }), { term: "serendipitous", deleted: true });
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM cards WHERE term = 'serendipitous'").get().n, 0);

// ---- recordings from Wikimedia Commons, kept in R2
assert.equal(w.pickRecording(["File:Cat.jpg", "File:LL-Q1860 (eng)-X-word.wav", "File:En-uk-word.ogg", "File:En-us-word.ogg", "File:De-word.ogg"]), "File:En-us-word.ogg");
assert.equal(w.pickRecording(["File:LL-Q1860 (eng)-X-word.wav", "File:Fr-word.ogg"]), "File:LL-Q1860 (eng)-X-word.wav");
assert.equal(w.pickRecording(["File:Cat.jpg", "File:Fr-word.ogg"]), null);

const wikiCalls = [];
function wiki(url, init) {
  wikiCalls.push(url.host);
  assert.match(init.headers["user-agent"], /^busahin-reading\/1 /, "Wikimedia asks for an identifying user agent");
  if (url.host === "en.wiktionary.org") {
    const title = url.searchParams.get("titles");
    const images = title === "ubiquitous" ? [{ title: "File:En-au-ubiquitous.ogg" }, { title: "File:En-us-ubiquitous.ogg" }] : [{ title: "File:Some-picture.jpg" }];
    return new Response(JSON.stringify({ query: { pages: [{ title, images }] } }));
  }
  if (url.host === "commons.wikimedia.org") {
    assert.equal(url.searchParams.get("titles"), "File:En-us-ubiquitous.ogg");
    return new Response(
      JSON.stringify({
        query: {
          pages: [
            {
              imageinfo: [{ url: "https://upload.wikimedia.org/wikipedia/commons/b/b5/En-us-ubiquitous.ogg", extmetadata: { Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Dvortygirl">Dvortygirl</a>' }, LicenseShortName: { value: "CC BY-SA 3.0" }, LicenseUrl: { value: "http://creativecommons.org/licenses/by-sa/3.0/" } } }],
              videoinfo: [{ derivatives: [{ type: "audio/ogg", src: "https://upload.wikimedia.org/x.ogg" }, { type: "audio/mpeg", src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b5/En-us-ubiquitous.ogg/En-us-ubiquitous.ogg.mp3" }] }],
            },
          ],
        },
      }),
    );
  }
  return recordingAnswer();
}
let recordingAnswer = () => new Response(new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]), { headers: { "content-type": "audio/mpeg", "content-length": "6" } });
const bucket = new Map();
env.FILES = { put: async (key, bytes, opts) => bucket.set(key, { bytes, opts }), delete: async (key) => bucket.delete(key) };

let audio = (await w.audioFor(env, { term: "ubiquitous" }, NOW)).audio;
assert.match(audio.url, /^https:\/\/files\.busahin\.com\/reading\/audio\/[0-9a-f-]{36}\.mp3$/, "served by the files Worker under a name that does not give the word away");
assert.deepEqual([audio.file, audio.author, audio.license], ["En-us-ubiquitous.ogg", "Dvortygirl", "CC BY-SA 3.0"]);
assert.equal(bucket.size, 1);
const [stored] = bucket.values();
assert.equal(stored.opts.httpMetadata.contentType, "audio/mpeg");
assert.deepEqual(wikiCalls, ["en.wiktionary.org", "commons.wikimedia.org", "upload.wikimedia.org"]);
assert.deepEqual((await w.audioFor(env, { term: "ubiquitous" }, NOW + 86_400_000 * 90)).audio, audio, "a recording is fetched once, ever");
assert.equal(wikiCalls.length, 3);

assert.deepEqual(await w.audioFor(env, { term: "give up" }, NOW), { audio: null }, "no recording: the page falls back to the browser's voice");
assert.equal(wikiCalls.length, 4, "only the Wiktionary page was asked");
await w.audioFor(env, { term: "give up" }, NOW + 86_400_000);
assert.equal(wikiCalls.length, 4, "and not again for thirty days");
await w.audioFor(env, { term: "give up" }, NOW + 86_400_000 * 31);
assert.equal(wikiCalls.length, 5, "but after them");
assert.equal(await w.audioFor(env, { term: "not a card" }, NOW), undefined, "only cards get recordings");

// Guards on the copy: judged by its headers before a byte is read, and a failure waits a day.
{
  const log = console.error;
  console.error = () => {};
  const tryWith = async (answer, day) => {
    recordingAnswer = answer;
    sqlite.exec("DELETE FROM audio WHERE term = 'ubiquitous'");
    const before = bucket.size;
    const out = (await w.audioFor(env, { term: "ubiquitous" }, NOW + day * 86_400_000)).audio;
    return { out, stored: bucket.size - before, row: sqlite.prepare("SELECT r2_key, checked_at FROM audio WHERE term = 'ubiquitous'").get() };
  };
  let read = false;
  const huge = { headers: new Headers({ "content-type": "audio/mpeg", "content-length": String(30_000_000) }), ok: true, status: 200, arrayBuffer: async () => ((read = true), new ArrayBuffer(8)) };
  let r = await tryWith(() => huge, 40);
  assert.deepEqual([r.out, r.stored, read], [null, 0, false], "30 MB is refused without reading it");
  assert.ok(r.row && r.row.r2_key === null, "and a row is kept, so the word is not looked up again on every pull");
  r = await tryWith(() => new Response("<html>", { headers: { "content-type": "text/html", "content-length": "6" } }), 41);
  assert.deepEqual([r.out, r.stored], [null, 0], "not audio, not stored");
  r = await tryWith(() => new Response(null, { status: 302, headers: { location: "https://elsewhere.example/" } }), 42);
  assert.deepEqual([r.out, r.stored], [null, 0], "a redirect is not followed");
  const calls = wikiCalls.length;
  await w.audioFor(env, { term: "ubiquitous" }, NOW + 42 * 86_400_000 + 3_600_000);
  assert.equal(wikiCalls.length, calls, "a failed word waits");
  await w.audioFor(env, { term: "ubiquitous" }, NOW + 43 * 86_400_000 + 60_000);
  assert.ok(wikiCalls.length > calls, "for a day, not thirty");
  recordingAnswer = () => new Response(new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]), { headers: { "content-type": "audio/mpeg", "content-length": "6" } });
  r = await tryWith(recordingAnswer, 44);
  assert.equal(r.stored, 1);
  assert.equal(sqlite.prepare("SELECT license_url FROM audio WHERE term = 'ubiquitous'").get().license_url, "https://creativecommons.org/licenses/by-sa/3.0/", "licence links are https");
  // R2 has a hard stop: past AUDIO_MAX_OBJECTS recordings no more copies are made.
  sqlite.exec("BEGIN");
  const fill = sqlite.prepare("INSERT INTO audio (term, r2_key, checked_at) VALUES (?, ?, 1)");
  for (let i = 0; i < 5000; i++) fill.run(`filler${i}`, `reading/audio/filler${i}.mp3`);
  sqlite.exec("COMMIT");
  r = await tryWith(recordingAnswer, 45);
  assert.deepEqual([r.out, r.stored], [null, 0], "the object cap holds");
  sqlite.exec("DELETE FROM audio WHERE term LIKE 'filler%'");
  console.error = log;
}

// Renaming a word added by hand deletes its old recording from R2.
{
  await w.addWord(env, { term: "zest" }, NOW);
  bucket.set("reading/audio/old-zest.mp3", {});
  sqlite.exec("INSERT OR REPLACE INTO audio (term, r2_key, checked_at) VALUES ('zest', 'reading/audio/old-zest.mp3', 1)");
  await w.editWord(env, { term: "zest", new_term: "zeal" }, NOW);
  assert.ok(!bucket.has("reading/audio/old-zest.mp3"), "no orphan left behind");
  await w.deleteWord(env, { term: "zeal" });
}

sqlite.exec("DELETE FROM audio WHERE term = 'mellow'");
sqlite.exec(`UPDATE daily SET audio = 100 WHERE day = '2026-11-18'`);
const before100 = wikiCalls.length;
await w.audioFor(env, { term: "mellow" }, NOW);
assert.equal(wikiCalls.length, before100, "nothing past the daily cap");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM audio WHERE term = 'mellow'").get().n, 0, "and the word is tried again tomorrow");

// ---- the private page: sign in with the token, a cookie from then on
const site = (method, path, { cookie, origin, form, json } = {}) => {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  if (form) (headers["content-type"] = "application/x-www-form-urlencoded"), (headers["content-length"] = String(new URLSearchParams(form).toString().length));
  if (json) headers["content-type"] = "application/json";
  return w.default.fetch(
    new Request(`https://busahin.com${path}`, { method, headers, body: form ? new URLSearchParams(form).toString() : json ? JSON.stringify(json) : undefined, redirect: "manual" }),
    { ...env, PER_VISITOR: open, SITE_WIDE: open },
    { waitUntil() {} },
  );
};
let res = await site("GET", "/api/reading/app");
assert.equal(res.status, 401);
let page = await res.text();
assert.ok(page.includes('name="token"'), "the sign-in form");
for (const giveaway of [/\bwords?\b/, /vocab/, /turkish/, /english/, /\.term\b/, /\.ipa\b/, /\.def\b/, /cards/, /\.ex\b/, /\.due\b/, /\.note\b/, /review/])
  assert.ok(!giveaway.test(page.toLowerCase()), `the sign-in page, stylesheet included, never matches ${giveaway}`);
res = await site("POST", "/api/reading/login", { form: { token: "wrong" } });
assert.equal(res.status, 401);
res = await site("POST", "/api/reading/login", { form: { token: env.READING_TOKEN } });
assert.equal(res.status, 303);
const setCookie = res.headers.get("set-cookie");
assert.match(setCookie, /^reading_session=\d{10}\.[0-9a-f]{64}; Path=\/api\/reading; Max-Age=5184000; HttpOnly; SameSite=Strict; Secure$/, "a signed, expiring session, never the token");
assert.equal(res.headers.get("cache-control"), "no-store");
const cookie = setCookie.split(";")[0];
assert.ok(!cookie.includes(env.READING_TOKEN));
assert.equal((await call("GET", "/api/reading/cards", cookie.split("=")[1])).status, 404, "the session cannot be used as a bearer token");
res = await site("GET", "/api/reading/app", { cookie });
assert.equal(res.status, 200);
page = await res.text();
const csp = res.headers.get("content-security-policy");
const nonce = csp.match(/script-src 'nonce-([0-9a-f]+)'/)[1];
assert.equal(page.match(/<script nonce="([0-9a-f]+)">/g).length, 2);
assert.ok(page.includes(`<script nonce="${nonce}">`) && !csp.includes("unsafe-inline"), "inline code runs only with this response's nonce");
assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
assert.ok(!page.includes("—"), "no em dashes on the page");
assert.equal((await site("GET", "/api/reading/cards", { cookie })).status, 200, "the cookie opens the private routes");
assert.equal((await site("POST", "/api/reading/words", { cookie, origin: "https://busahin.com", json: { term: "quixotic" } })).status, 200);
assert.equal((await site("POST", "/api/reading/words", { cookie, origin: "https://evil.example", json: { term: "x" } })).status, 404, "a cookie from another site's form never counts");
assert.equal((await site("POST", "/api/reading/words/delete", { cookie, json: { term: "ubiquitous" } })).status, 409);
assert.equal((await site("POST", "/api/reading/words/delete", { cookie, json: { term: "nothing here" } })).status, 404);
assert.equal((await site("GET", "/api/reading/cards", { cookie: "reading_session=1999999999.00ab" })).status, 404);
// Sign-out: refused from another origin; from the page it ends every session.
res = await site("POST", "/api/reading/logout", { cookie, origin: "https://evil.example" });
assert.equal(res.status, 403);
assert.equal((await site("GET", "/api/reading/cards", { cookie })).status, 200, "a foreign sign-out changed nothing");
res = await site("POST", "/api/reading/logout", { cookie, origin: "https://busahin.com" });
assert.match(res.headers.get("set-cookie"), /^reading_session=; Path=\/api\/reading; Max-Age=0/);
assert.equal((await site("GET", "/api/reading/cards", { cookie })).status, 404, "the old session is dead after sign-out, wherever it was copied");
assert.equal((await call("GET", "/api/reading/cards", env.READING_TOKEN)).status, 200, "the token itself still works for scripts");
// Expired sessions, odd cookies, missing lengths and plain http.
const expired = `${Math.floor(Date.now() / 1000) - 10}.${"0".repeat(64)}`;
assert.equal((await site("GET", "/api/reading/cards", { cookie: `reading_session=${expired}` })).status, 404);
assert.equal((await site("GET", "/api/reading/today", { cookie: "reading_session=%" })).status, 200, "a malformed cookie is no cookie");
assert.deepEqual(Object.keys(await (await site("GET", "/api/reading/today", { cookie: "reading_session=1999999999.00ab" })).json()).sort(), ["day", "streak"], "a stale session sees the public card");
const noLength = await w.default.fetch(new Request("https://busahin.com/api/reading/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "token=x" }), { ...env, PER_VISITOR: open, SITE_WIDE: open }, { waitUntil() {} });
assert.equal(noLength.status, 411);
const http = await w.default.fetch(new Request("http://busahin.com/api/reading/app"), { ...env, PER_VISITOR: open, SITE_WIDE: open }, { waitUntil() {} });
assert.equal(http.status, 403, "never over plain http");
// Without the token, private routes are indistinguishable from paths that do not exist, whatever the method.
for (const [method, path] of [["GET", "/api/reading/words"], ["GET", "/api/reading/audio"], ["POST", "/api/reading/cards"], ["GET", "/api/reading/nope"]])
  assert.equal((await call(method, path)).status, 404, `${method} ${path}`);
const publicCard = await (await site("GET", "/api/reading/today")).json();
assert.deepEqual(Object.keys(publicCard).sort(), ["day", "streak"], "still only the day and streak in public");

// ---- the private app: review log, offline grades, mining, lists, progress, admin
{
  const q = (sql) => sqlite.prepare(sql).all();
  sqlite.exec("UPDATE cards SET due = '2026-11-18', box = 1 WHERE term = 'give up'");
  sqlite.exec("UPDATE cards SET due = '2026-11-17', box = 1 WHERE term = 'abandoned'");
  const before = q("SELECT COUNT(*) AS n FROM reviews")[0].n;
  // An answer is logged once, even when the app sends it again after losing the connection.
  const first = await w.review(env, { term: "give up", grade: "good", id: "grade-0001-abcd" }, NOW);
  assert.equal(first.box, 2);
  const resent = await w.review(env, { term: "give up", grade: "good", id: "grade-0001-abcd" }, NOW + 5_000);
  assert.equal(resent.duplicate, true);
  assert.equal(resent.box, 2, "not moved twice");
  assert.equal(q("SELECT COUNT(*) AS n FROM reviews")[0].n, before + 1);
  assert.equal(await w.review(env, { term: "give up", grade: "good", id: "bad id!" }, NOW), null);
  // A grade kept offline counts on the day it was given.
  const offline = await w.review(env, { term: "abandoned", grade: "again", id: "grade-0002-abcd", at: NOW - 86_400_000 }, NOW);
  assert.equal(offline.due, "2026-11-18", "given yesterday, due a day later");
  const log = q("SELECT term, grade, box_before, box_after, day FROM reviews WHERE client_id = 'grade-0002-abcd'")[0];
  assert.deepEqual({ ...log }, { term: "abandoned", grade: "again", box_before: 1, box_after: 1, day: "2026-11-17" });
  assert.equal(q("SELECT COUNT(*) AS n FROM reviews WHERE term = 'abandoned'")[0].n, 1);
  // A refused (not due) answer is not logged.
  await w.review(env, { term: "give up", grade: "good", id: "grade-0003-abcd" }, NOW);
  assert.equal(q("SELECT COUNT(*) AS n FROM reviews WHERE client_id = 'grade-0003-abcd'")[0].n, 0);

  // Sentence mining: the rare words in a clipped sentence, rarest first, never a word that is a card already.
  sqlite.exec(`INSERT OR REPLACE INTO dict (word, ipa, pos, def, tr) VALUES ('hum', 'hʌm', 'noun', 'a low steady sound', 'vızıltı'), ('promise', 'ˈpɹɒmɪs', 'noun', 'a vow', 'söz'), ('settle', 'ˈsɛtl̩', 'verb', 'to come to rest', 'yerleşmek'), ('ceaselessly', NULL, 'adverb', 'without stopping', 'durmaksızın'), ('current', NULL, 'noun', 'a flow', 'akıntı')`);
  sqlite.exec("INSERT OR REPLACE INTO ranks (word, rank) VALUES ('promise', 900), ('hum', 8000), ('settle', 4200), ('current', 1500)");
  const mined = await w.sentencesMined(env);
  const hum = mined.items.find((i) => i.text.includes("hum of the house"));
  assert.deepEqual(hum.words.map((x) => x.word), ["hum", "settled"], "rare first; ubiquitous is a card, promise is common");
  assert.equal(hum.words[1].lemma, "settle");
  assert.equal(hum.tr.startsWith("TR:"), true, "with its translation");
  assert.deepEqual(mined.items.find((i) => i.text.includes("boats")).words.map((x) => x.word), ["ceaselessly"], "unranked but in the dictionary counts as rare");
  sqlite.exec("INSERT OR REPLACE INTO dict (word, ipa, pos, def, tr) VALUES ('boats', NULL, 'noun', 'a vessel', 'tekneler')");
  sqlite.exec("INSERT OR REPLACE INTO ranks (word, rank) VALUES ('boat', 700), ('boats', 5799)");
  assert.ok(!(await w.sentencesMined(env)).items.find((i) => i.text.includes("boats")).words.some((x) => x.word === "boats"), "a plural takes its singular's rank");
  const added = await w.addWord(env, { term: "hum", sentence: hum.text }, NOW);
  assert.equal(added.sentence, hum.text, "a mined word keeps the sentence it came from");
  assert.ok(!(await w.sentencesMined(env)).items.find((i) => i.id === hum.id).words.some((x) => x.word === "hum"), "and is no longer proposed");

  // A book's word list: imported once, it ranks words, flags the Academic Word List, and fills meanings.
  const list = { book: "The Call of the Wild", words: [
    { word: "apparent", lemma: "apparent", chapter: 1, chapter_title: "I: Into the Primitive", rank: 8426, ipa: "/əˈpæɹənt/", turkish: "", definition: "Easily seen.", awl: true, awl_headword: "apparent", count: 5 },
    { word: "Mellow", lemma: "mellow", chapter: 2, chapter_title: "II", rank: 15000, ipa: "/ˈmɛl.oʊ/", turkish: "yumuşak", definition: "Soft and rich.", awl: false, awl_headword: "", count: 1 },
    null, { word: "" }, { word: 42 },
  ] };
  assert.deepEqual(await w.importList(env, list), { book: "The Call of the Wild", words: 2, skipped: 3 });
  assert.deepEqual(await w.importList(env, list), { book: "The Call of the Wild", words: 2, skipped: 3 }, "importing again replaces, never doubles");
  assert.equal(q("SELECT COUNT(*) AS n FROM prestudy")[0].n, 2);
  const writes = () => sqlite.prepare("SELECT total_changes() AS n").get().n;
  const w0 = writes();
  await w.importList(env, list);
  assert.equal(writes() - w0, 0, "the same file again writes nothing");
  await w.importList(env, { ...list, words: [list.words[0], { ...list.words[1], rank: 14000 }, { word: "rugged", lemma: "x".repeat(100) }] });
  assert.equal(writes() - w0, 2, "a changed file writes only the changed and the new rows");
  assert.equal(q("SELECT LENGTH(lemma) AS n FROM prestudy WHERE term = 'rugged'")[0].n, 60, "lemma capped");
  await w.importList(env, list);
  assert.equal(q("SELECT COUNT(*) AS n FROM prestudy")[0].n, 2, "a word no longer on the list goes");
  const noLength = await w.default.fetch(
    new Request("https://busahin.com/api/reading/prestudy", { method: "POST", headers: { authorization: `Bearer ${env.READING_TOKEN}`, "content-type": "application/json" }, body: "{}" }),
    { ...env, PER_VISITOR: { limit: async () => ({ success: true }) }, SITE_WIDE: { limit: async () => ({ success: true }) } },
    { waitUntil() {} },
  );
  assert.equal(noLength.status, 411);
  assert.equal(await w.importList(env, { book: "", words: [] }), null);
  assert.equal(await w.importList(env, { book: "x", words: new Array(5001).fill({ word: "a" }) }), null);
  const mellow = (await w.cardsJson(env, NOW, "mellow")).cards[0];
  assert.deepEqual([mellow.tr, mellow.ipa, mellow.def, mellow.rank, mellow.band, mellow.lists], ["yumuşak", "ˈmɛl.oʊ", "Soft and rich.", 15000, "10000+", ["The Call of the Wild"]], "the book's list fills what WikDict lacks");
  await w.addWord(env, { term: "apparent" }, NOW);
  assert.equal((await w.cardsJson(env, NOW, "apparent")).cards[0].awl, "apparent");

  // Progress: twelve weeks of states, accuracy, bands, coverage, books.
  const prog = await w.progress(env, NOW);
  assert.equal(prog.weeks.length, 12);
  assert.equal(prog.weeks.at(-1).week, "2026-11-16", "weeks start on Monday");
  const total = (wk) => wk.new + wk.learning + wk.review + wk.learned;
  assert.equal(total(prog.weeks.at(-1)), (await w.cardsJson(env, NOW)).cards.length, "every live card is counted once in the current week");
  assert.ok(prog.weeks.at(-1).reviews >= 2 && prog.accuracy.reviews >= 2);
  assert.equal(prog.bands["10000+"], 1);
  assert.deepEqual(prog.awl, { met: 1, learned: 0, in_lists: 1, families: 570 });
  assert.ok(prog.books.some((b) => b.book === "The Remains of the Day" && b.cards >= 3));
  assert.deepEqual(prog.lists.map((l) => ({ ...l })), [{ book: "The Call of the Wild", words: 2, cards: 2, learned: 0 }]);

  // The pull's log, with failures and their reason.
  await w.pull(env, NOW + 20_000_000, "manual");
  const savedProgress = answers.progress;
  answers.progress = "{}";
  assert.deepEqual(await w.pull(env, NOW + 20_100_000, "cron"), { ok: false, error: "progress: unexpected answer shape" });
  answers.progress = savedProgress;
  const admin = await w.adminData(env, NOW);
  assert.deepEqual([admin.sync[0].ok, admin.sync[0].trigger, admin.sync[0].error], [false, "cron", "progress: unexpected answer shape"]);
  assert.equal(admin.sync[1].ok, true);
  assert.equal(admin.quota.translations.of, 40);
  assert.deepEqual(admin.settings.morning, { on: true, hour: 8 });

  // Settings: validated, and they decide which push goes out at which hour.
  assert.equal(await w.setSettings(env, { morning: { hour: 24 } }), null);
  assert.equal(await w.setSettings(env, { nope: {} }), null);
  for (const key of ["__proto__", "toString", "constructor"]) assert.equal(await w.setSettings(env, JSON.parse(`{"${key}": {"on": true}}`)), null, key);
  assert.equal(await w.setSettings(env, { evening: { on: "yes" } }), null);
  assert.deepEqual((await w.setSettings(env, { morning: { hour: 7 } })).morning, { on: true, hour: 7 }, "a partial change keeps the rest");
  pushed.length = 0;
  sqlite.exec("DELETE FROM daily WHERE day >= '2026-11-18'");
  const istanbul = (day, hour) => Date.parse(`${day}T${String(hour - 3).padStart(2, "0")}:00:00Z`);
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-18", 8)), [], "the morning push follows its new hour");
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-18", 7)), ["morning"]);
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-18", 7)), [], "once a day");
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-18", 21)), ["evening"], "nothing read today and a streak to lose");
  assert.equal(pushed.at(-1).title, "Streak at risk");
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-18", 21)), []);
  sqlite.exec("INSERT OR REPLACE INTO days (day, pages, syncs) VALUES ('2026-11-19', 4, 1)");
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-19", 21)), [], "no evening push once today has been read");
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-21", 10)), [], "the digest waits for Sunday");
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-22", 10)), ["weekly"]);
  assert.match(pushed.at(-1).message, /days? read, \d+ pages?\.\n\d+ words? added, \d+ reviews?, \d+% right\.\n\d+ words? learned\./);
  await w.setSettings(env, { weekly: { on: false } });
  sqlite.exec("DELETE FROM daily WHERE day = '2026-11-29'");
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-29", 10)), [], "a switched-off push stays off");
  // The morning push says so when the reader has been quiet for days.
  sqlite.exec("DELETE FROM daily WHERE day = '2026-11-25'");
  assert.deepEqual(await w.notifications(env, istanbul("2026-11-25", 7)), ["morning"]);
  assert.match(pushed.at(-1).message, /Nothing synced from the reader for 6 days\./);

  // Export: everything that is his, never the token's hash.
  const all = await w.exportAll(env);
  assert.ok(all.cards.length && all.reviews.length && all.prestudy.length && all.sync_log.length);
  assert.ok(!JSON.stringify(all.settings).includes("token_hash"));
}

// ---- every private route refuses without the token; the manifest is public and neutral
{
  for (const [method, path] of [
    ["GET", "/api/reading/cards"], ["POST", "/api/reading/words"], ["POST", "/api/reading/words/edit"], ["POST", "/api/reading/words/delete"],
    ["POST", "/api/reading/audio"], ["GET", "/api/reading/sentences/mined"], ["GET", "/api/reading/progress"], ["GET", "/api/reading/admin"],
    ["POST", "/api/reading/admin/settings"], ["POST", "/api/reading/admin/token"], ["GET", "/api/reading/export.json"], ["POST", "/api/reading/prestudy"],
    ["GET", "/api/reading/books"], ["POST", "/api/reading/books"], ["GET", "/api/reading/sentences"], ["POST", "/api/reading/sync"],
  ]) {
    assert.equal((await call(method, path)).status, 404, `${method} ${path} needs the token`);
    assert.equal((await call(method, path, "x".repeat(64))).status, 404, `${method} ${path} refuses a wrong token`);
  }
  const manifest = await call("GET", "/api/reading/app.webmanifest");
  assert.equal(manifest.status, 200);
  const m = await manifest.json();
  assert.deepEqual([m.name, m.display, m.scope, m.start_url], ["Reading", "standalone", "/api/reading/", "/api/reading/app#today"]);
  assert.ok(!/word|vocab|learn|english|turkish/i.test(JSON.stringify(m)));
  // Sign-in attempts have their own, stricter limit.
  const shut = { limit: async () => ({ success: false }) };
  const login = await w.default.fetch(
    new Request("https://busahin.com/api/reading/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `token=${env.READING_TOKEN}` }),
    { ...env, PER_VISITOR: open, SITE_WIDE: open, LOGIN: shut },
    { waitUntil() {} },
  );
  assert.equal(login.status, 429);
}

// ---- rotating the token: the new one works, the old secret stops
{
  const rotated = await call("POST", "/api/reading/admin/token", env.READING_TOKEN);
  assert.equal(rotated.status, 200);
  const { token } = await rotated.json();
  assert.match(token, /^[0-9a-f]{64}$/);
  const fresh = rotated.headers.get("set-cookie");
  assert.match(fresh, /^reading_session=\d{10}\.[0-9a-f]{64}; Path=\/api\/reading;.*HttpOnly; SameSite=Strict/, "this browser gets a session signed with the new key");
  assert.ok(!fresh.includes(token));
  assert.equal((await call("GET", "/api/reading/admin", env.READING_TOKEN)).status, 404, "the old token no longer opens anything");
  assert.equal((await call("GET", "/api/reading/admin", token)).status, 200);
  assert.equal((await (await call("GET", "/api/reading/admin", token)).json()).token_rotated, true);
  sqlite.exec("DELETE FROM settings WHERE key = 'token_hash'");
  assert.equal((await call("GET", "/api/reading/admin", env.READING_TOKEN)).status, 200, "deleting the row brings the secret back (the documented recovery)");
}

// ---- a queued grade is only given up when the Worker says it can never apply
{
  const { dropGrade } = await import("./page.js");
  for (const [status, json, drop] of [[400, true, true], [409, true, true], [404, true, true], [404, false, false], [429, true, false], [500, true, false], [503, false, false], [undefined, false, false]])
    assert.equal(Boolean(dropGrade(status, json)), drop, `${status} ${json ? "json" : "empty"}`);
}

// ---- public answers: five minutes in the edge cache, never kept by the browser
{
  const stored = new Map();
  globalThis.caches = { default: { match: async (k) => stored.get(k.url)?.clone(), put: async (k, r) => void stored.set(k.url, r) } };
  const waits = [];
  const get = (path) => w.default.fetch(new Request(`https://busahin.com${path}`), { ...env, PER_VISITOR: open, SITE_WIDE: open }, { waitUntil: (p) => waits.push(p) });
  for (const path of ["/api/reading/summary", "/api/reading/today"]) {
    const miss = await get(path);
    await Promise.all(waits);
    assert.equal(miss.headers.get("cache-control"), "no-store", `${path} miss`);
    assert.equal(stored.get(`https://busahin.com${path}`).headers.get("cache-control"), "public, max-age=300", `${path} edge copy keeps five minutes`);
    const hit = await get(path);
    assert.equal(hit.headers.get("cache-control"), "no-store", `${path} hit`);
  }
  delete globalThis.caches;
}
assert.ok(fs.readFileSync(new URL("../../src/components/ReadingPage.astro", here), "utf8").includes('fetch(ENDPOINT, { cache: "no-store" })'), "the page asks the browser not to reuse an old answer");

// ---- a finished book without a note on the site gets a quiet reminder in the private app
{
  const { titleKey } = await import("../../src/lib/title-key.mjs");
  assert.equal(titleKey("Thé Remains: of the Day!"), titleKey("the remains of the day"));
  assert.equal(titleKey("Alice’s Adventures & Wonders"), "alice s adventures and wonders");
  sqlite.exec("DELETE FROM meta WHERE key = 'notes'");
  assert.deepEqual((await w.todayCard(env, NOW, true)).notes_to_write, [], "no reminder before the site's list has been read");
  answers.notes = JSON.stringify({ notes: [] });
  await w.pull(env, NOW + 30_000_000, "cron");
  assert.deepEqual((await w.todayCard(env, NOW, true)).notes_to_write, [{ document: "25f8abb4f4f5594f02f361726814fea1", title: "Foundryside" }]);
  answers.notes = JSON.stringify({ notes: [{ keys: [titleKey("FOUNDRYSIDE.")], href: "/reading/foundryside/", title: "Foundryside" }] });
  await w.pull(env, NOW + 30_100_000, "cron");
  assert.deepEqual((await w.todayCard(env, NOW, true)).notes_to_write, [], "written: the reminder goes");
  answers.notes = "<html>down</html>";
  const log = console.error;
  console.error = () => {};
  await w.pull(env, NOW + 30_200_000, "cron");
  console.error = log;
  assert.deepEqual((await w.todayCard(env, NOW, true)).notes_to_write, [], "a failed fetch keeps the last list");
  assert.ok(!("notes_to_write" in (await w.todayCard(env, NOW))), "never in public");
}

// ---- covers: copied from Hardcover into R2 only for books on the public page, with the recordings' guards
{
  const log = console.error;
  console.error = () => {};
  const REMAINS = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const MIDDLEMARCH = "0123456789abcdef0123456789abcdef";
  const FOUNDRYSIDE = "25f8abb4f4f5594f02f361726814fea1";
  const book = (d) => sqlite.prepare("SELECT cover_url, cover_key, cover_v, cover_checked_at, release_year, genres, series, series_position FROM books WHERE document = ?").get(d);
  const covers = () => [...bucket.keys()].filter((k) => k.startsWith("reading/covers/"));
  const fresh = () => (sqlite.exec("UPDATE books SET cover_v = NULL, cover_checked_at = NULL; DELETE FROM daily WHERE day = '2026-11-18'"), coverFetches.splice(0));
  for (const k of covers()) bucket.delete(k);

  assert.deepEqual(
    { ...book(MIDDLEMARCH), cover_key: undefined, cover_v: undefined, cover_checked_at: undefined },
    { cover_url: "https://assets.hardcover.app/edition/1/middlemarch.jpeg", cover_key: undefined, cover_v: undefined, cover_checked_at: undefined, release_year: 1871, genres: '["Classics"]', series: "Penguin Classics", series_position: 12 },
    "Hardcover's metadata is kept",
  );

  assert.ok(w.coverSource("https://assets.hardcover.app/edition/1/a.jpeg", env));
  for (const bad of ["http://assets.hardcover.app/a.jpeg", "https://evil.example/a.jpeg", "https://assets.hardcover.app.evil.example/a.jpeg", "https://u:p@assets.hardcover.app/a.jpeg", "https://assets.hardcover.app:8443/a.jpeg", "not a url", "data:image/png;base64,AA"])
    assert.equal(w.coverSource(bad, env), null, bad);
  assert.ok(w.coverSource("https://covers.example/a.jpg", { COVER_HOSTS: "covers.example, other.example" }), "the host list is configurable");
  assert.equal(w.coverSource("https://assets.hardcover.app/a.jpg", { COVER_HOSTS: "covers.example" }), null, "and replaces the default");

  const bytes = (...b) => new Uint8Array([...b, ...new Array(16).fill(0)]).buffer;
  assert.equal(w.imageType(JPEG.buffer), "image/jpeg");
  assert.equal(w.imageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  assert.equal(w.imageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ").buffer), "image/webp");
  assert.equal(w.imageType(new TextEncoder().encode("\0\0\0\x1cftypavif\0\0").buffer), "image/avif");
  for (const not of ["<svg xmlns='http://www.w3.org/2000/svg'/>", "<html><script>", "GIF89a......"]) assert.equal(w.imageType(new TextEncoder().encode(not).buffer), null, not);

  // One copy, for the one book on the page with a cover: never Middlemarch (paused, so not on the page).
  fresh();
  assert.equal(await w.syncCovers(env, NOW), 1);
  assert.deepEqual(coverFetches, ["https://assets.hardcover.app/edition/30373948/remains.jpeg"]);
  const remainsCover = book(REMAINS);
  assert.match(remainsCover.cover_key, /^reading\/covers\/[0-9a-f-]{36}$/, "a random key, so the address names no book");
  assert.match(remainsCover.cover_v, /^[0-9a-f]{12}$/);
  assert.deepEqual(covers(), [remainsCover.cover_key]);
  assert.equal(bucket.get(remainsCover.cover_key).opts.httpMetadata.contentType, "image/jpeg");
  assert.equal(book(MIDDLEMARCH).cover_v, null);
  const pub = await w.buildSummary(env, NOW);
  assert.equal(pub.reading.find((b) => b.title === "The Remains of the Day").cover, `https://files.busahin.com/${remainsCover.cover_key}?v=${remainsCover.cover_v}`, "served by the files Worker, versioned");
  assert.ok(!JSON.stringify(pub).includes("hardcover"), "Hardcover is never linked from the public page");
  assert.equal(await w.syncCovers(env, NOW), 0, "copied once");
  assert.equal(coverFetches.length, 1);

  // Hidden: the copy goes at once; shown again: it comes back under the same key.
  await w.setBook(env, { document: REMAINS, hidden: true }, NOW);
  assert.deepEqual([covers(), book(REMAINS).cover_v], [[], null]);
  assert.ok(!JSON.stringify(await w.buildSummary(env, NOW)).includes(remainsCover.cover_key));
  await w.setBook(env, { document: REMAINS, hidden: false }, NOW);
  assert.deepEqual([covers(), book(REMAINS).cover_key], [[remainsCover.cover_key], remainsCover.cover_key], "the same key, so a note linking the cover keeps working");
  // HIDE_TITLES takes a cover off too.
  await w.syncCovers({ ...env, HIDE_TITLES: "remains" }, NOW);
  assert.deepEqual(covers(), []);

  // The guards. Each failure leaves the book waiting a day.
  const tryWith = async (answer, at = NOW) => {
    fresh();
    coverAnswer = answer;
    await w.syncCovers(env, at);
    return { stored: covers().length, checked: book(REMAINS).cover_checked_at };
  };
  let read = false;
  const huge = () => ({ ok: true, status: 200, headers: new Headers({ "content-type": "image/jpeg", "content-length": "30000000" }), arrayBuffer: async () => ((read = true), JPEG.buffer) });
  let r = await tryWith(huge);
  assert.deepEqual([r.stored, read, r.checked > 0], [0, false, true], "30 MB is refused without reading it, and noted");
  r = await tryWith(() => new Response(null, { status: 302, headers: { location: "https://elsewhere.example/a.jpg" } }));
  assert.equal(r.stored, 0, "a redirect is not followed");
  r = await tryWith(() => new Response("<html>", { headers: { "content-type": "text/html", "content-length": "6" } }));
  assert.equal(r.stored, 0, "not an image by its headers");
  const svg = new TextEncoder().encode("<svg onload='alert(1)'/>");
  r = await tryWith(() => new Response(svg, { headers: { "content-type": "image/svg+xml", "content-length": String(svg.length) } }));
  assert.equal(r.stored, 0, "an SVG says image/ but is refused by its bytes");
  let streamed = 0;
  const endless = new ReadableStream({ pull: (c) => ((streamed += 65_536), streamed > 3_000_000 ? c.close() : c.enqueue(new Uint8Array(65_536))) });
  r = await tryWith(() => new Response(endless, { headers: { "content-type": "image/jpeg" } }));
  assert.equal(r.stored, 0, "no length: read only up to the cap, then refused");
  assert.ok(streamed < 1_200_000, "and the rest is never read");
  coverAnswer = () => new Response(JPEG, { headers: { "content-type": "image/jpeg", "content-length": String(JPEG.length) } });
  await w.syncCovers(env, NOW + 3_600_000);
  assert.equal(covers().length, 0, "a failed cover waits");
  await w.syncCovers(env, NOW + 86_400_000 + 60_000);
  assert.equal(covers().length, 1, "for a day");
  // A cover_url on another host, or plain http, is never fetched.
  for (const url of ["http://assets.hardcover.app/edition/1/a.jpeg", "https://evil.example/a.jpeg"]) {
    fresh();
    for (const k of covers()) bucket.delete(k);
    sqlite.prepare("UPDATE books SET cover_url = ? WHERE document = ?").run(url, REMAINS);
    const before = wikiCalls.length + requests.length;
    await w.syncCovers(env, NOW);
    assert.deepEqual([covers().length, coverFetches.length, wikiCalls.length + requests.length], [0, 0, before], url);
  }
  sqlite.prepare("UPDATE books SET cover_url = ? WHERE document = ?").run("https://assets.hardcover.app/edition/30373948/remains.jpeg", REMAINS);
  // The daily cap and the object cap.
  fresh();
  sqlite.exec("INSERT INTO daily (day, covers) VALUES ('2026-11-18', 50)");
  await w.syncCovers(env, NOW);
  assert.deepEqual([covers().length, coverFetches.length], [0, 0], "nothing past the daily cap");
  fresh();
  sqlite.exec("BEGIN");
  const fill = sqlite.prepare("INSERT INTO books (document, title, status, cover_key, cover_v) VALUES (?, 'x', 'finished', 'k', 'v')");
  for (let i = 0; i < 2000; i++) fill.run(`filler${i}`);
  sqlite.exec("COMMIT");
  await w.syncCovers({ ...env, FILES: { ...env.FILES, delete: async () => {} } }, NOW);
  assert.equal(coverFetches.length, 0, "nothing past the object cap");
  sqlite.exec("DELETE FROM books WHERE document LIKE 'filler%'");

  // A cover sent from the app, for a book on the page.
  fresh();
  await w.syncCovers(env, NOW);
  const upload = (document, body, type = "image/png", length = body?.byteLength) =>
    w.uploadCover(env, new Request(`https://busahin.com/api/reading/books/cover?document=${document}`, { method: "POST", headers: { "content-type": type, ...(length !== false ? { "content-length": String(length) } : {}) }, body }), NOW);
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const up = await upload(FOUNDRYSIDE, PNG);
  assert.match(up.cover, /^https:\/\/files\.busahin\.com\/reading\/covers\/[0-9a-f-]{36}\?v=[0-9a-f]{12}$/);
  assert.equal(bucket.get(book(FOUNDRYSIDE).cover_key).opts.httpMetadata.contentType, "image/png", "the type is the bytes', not the request's");
  assert.equal((await w.summary(env, NOW)).finished[0].cover, up.cover, "the public page has it at once");
  const again = await upload(FOUNDRYSIDE, JPEG, "image/jpeg");
  assert.equal(again.cover.split("?")[0], up.cover.split("?")[0], "a replacement keeps the key");
  assert.notEqual(again.cover, up.cover, "and changes the version");
  assert.equal(await upload(FOUNDRYSIDE, svg, "image/png"), null, "the bytes decide, not the content type");
  assert.equal(await upload(FOUNDRYSIDE, PNG, "text/plain"), null);
  assert.equal((await upload(FOUNDRYSIDE, PNG, "image/png", false)).status, 411);
  assert.equal((await upload(FOUNDRYSIDE, new Uint8Array(1_000_001))).status, 413);
  assert.deepEqual(await upload(MIDDLEMARCH, PNG), { error: "not on the page" }, "no copy for a book the page does not show");
  assert.equal(await upload("no-such-book", PNG), undefined);
  assert.equal(await upload("../../x", PNG), null);

  // A book gone from the reader takes its cover copy with it.
  const key = book(FOUNDRYSIDE).cover_key;
  const saved = answers.progress;
  const progressFewer = JSON.parse(saved);
  progressFewer.items = progressFewer.items.filter((i) => i.document !== FOUNDRYSIDE);
  answers.progress = JSON.stringify(progressFewer);
  await w.ingest(env, NOW + 31_000_000);
  assert.ok(!bucket.has(key), "no orphan in R2");
  answers.progress = saved;
  await w.ingest(env, NOW + 31_100_000);
  console.error = log;
}

// ---- book notes: drafts in D1, published to the site's repository through the GitHub contents API
{
  const yaml = (await import("js-yaml")).default;
  const REMAINS = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const FOUNDRYSIDE = "25f8abb4f4f5594f02f361726814fea1";
  // An offline GitHub: one branch, files by path, a SHA per version, the API's own refusals.
  const repo = new Map();
  const gh = [];
  let ghFails = false;
  let shaCount = 0;
  githubApi = async (url, init) => {
    const path = decodeURIComponent(url.pathname.replace("/repos/busahinku/busahinku.github.io/contents/", ""));
    const body = init.body ? JSON.parse(init.body) : null;
    gh.push({ method: init.method, path, url: url.href, body, auth: init.headers.authorization, redirect: init.redirect });
    if (ghFails) return new Response('{"message":"Server Error"}', { status: 500 });
    const file = repo.get(path);
    if (init.method === "GET") return file ? new Response(JSON.stringify({ path, sha: file.sha, type: "file" })) : new Response('{"message":"Not Found"}', { status: 404 });
    if (body.branch !== "main") return new Response("{}", { status: 422 });
    if (init.method === "PUT") {
      if (file ? body.sha !== file.sha : body.sha) return new Response('{"message":"sha"}', { status: file ? 409 : 422 });
      const sha = `sha${++shaCount}`;
      repo.set(path, { sha, content: new TextDecoder().decode(Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0))) });
      return new Response(JSON.stringify({ content: { path, sha } }), { status: file ? 200 : 201 });
    }
    if (init.method === "DELETE") {
      if (!file || body.sha !== file.sha) return new Response("{}", { status: file ? 409 : 404 });
      repo.delete(path);
      return new Response("{}");
    }
    return new Response("{}", { status: 405 });
  };
  const genv = { ...env, GITHUB_TOKEN: "github_pat_test_0123456789" };
  const front = (path) => {
    const [, fm, body] = repo.get(path).content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    return { fm: yaml.load(fm), body };
  };

  // Markdown only: raw HTML outside code is refused, autolinks and code are fine.
  for (const html of ["<script>alert(1)</script>", 'Text <img src=x onerror="alert(1)">', "</div>", "<iframe src=x>", "<a href=\"javascript:x\">x</a>", "<SCRIPT>", "<style>"])
    assert.ok(w.hasHtml(html), html);
  for (const fine of ["See <https://example.com> and <me@example.com>.", "a < b and c > d", "Use `<script>` in code.", "```html\n<script>x</script>\n```", "<!-- a comment -->", "x<3"])
    assert.ok(!w.hasHtml(fine), fine);

  // Drafts: validated, autosaved, one slug per book.
  const draft = { document: REMAINS, lang: "en", slug: "the-remains-of-the-day", title: "The Remains of the Day", author: "Kazuo Ishiguro", finished: "2026-11-10", description: "Dignity, and what it costs.", body: "Stevens drives west.\n\n## The road\n\nA *quiet* book." };
  for (const bad of [{ ...draft, slug: "../../package" }, { ...draft, slug: "a/b" }, { ...draft, slug: "Upper" }, { ...draft, slug: "-x" }, { ...draft, slug: "x".repeat(82) }, { ...draft, slug: "x.md" }, { ...draft, lang: "de" }, { ...draft, document: "../x" }, { ...draft, body: "x".repeat(100_001) }, { ...draft, body: 5 }, null, []])
    assert.equal(await w.saveNote(genv, bad, NOW), null, JSON.stringify(bad)?.slice(0, 60));
  assert.equal(await w.saveNote(genv, { ...draft, document: "0000000000000000000000000000beef" }, NOW), undefined, "only a book the reader knows");
  let note = await w.saveNote(genv, draft, NOW);
  assert.deepEqual([note.published, note.changed, note.url], [false, false, "https://busahin.com/reading/the-remains-of-the-day/"]);
  assert.equal((await w.saveNote(genv, { ...draft, finished: "2026-02-30" }, NOW)).finished, null, "not a real day: left empty");
  note = await w.saveNote(genv, draft, NOW);
  assert.deepEqual(await w.saveNote(genv, { ...draft, document: FOUNDRYSIDE }, NOW), { error: "slug taken" }, "another book's slug");
  // The Turkish note follows the book's slug when it is changed before publishing.
  await w.saveNote(genv, { ...draft, lang: "tr", title: "Günün Kalanı", body: "Stevens batıya gidiyor." }, NOW);
  await w.saveNote(genv, { ...draft, slug: "remains" }, NOW);
  assert.deepEqual(sqlite.prepare("SELECT lang, slug FROM notes ORDER BY lang").all().map((r) => [r.lang, r.slug]), [["en", "remains"], ["tr", "remains"]]);
  note = await w.saveNote(genv, draft, NOW);
  assert.equal((await w.getNote(genv, new Request(`https://busahin.com/api/reading/note?document=${REMAINS}`))).notes.tr.slug, "the-remains-of-the-day");

  // Frontmatter is written here: a pasted title with a line break, "---" and quotes stays one line of text.
  const hostile = { ...draft, title: 'Evil\n---\nlayout: "../../x"\ndraft: true "quoted" \\ title: yes', author: "A\r\nB", description: "--- # not yaml\n" };
  const cleaned = await w.saveNote(genv, hostile, NOW);
  assert.equal(cleaned.title, 'Evil --- layout: "../../x" draft: true "quoted" \\ title: yes');
  const file = w.noteFile({ ...cleaned, lang: "en", reader_title: "The Remains of the Day", cover: null });
  const [, fm] = file.match(/^---\n([\s\S]*?)\n---\n/);
  assert.equal(fm.split("\n").length, 7, "one line per field, nothing smuggled in");
  const parsed = yaml.load(fm);
  assert.deepEqual(Object.keys(parsed), ["title", "author", "finished", "description", "readerTitle", "lang", "translationKey"]);
  assert.deepEqual([parsed.title, parsed.author, parsed.description, parsed.translationKey], [cleaned.title, "A B", "--- # not yaml", "the-remains-of-the-day"]);
  assert.equal(file.indexOf("\n---\n", 4), file.indexOf("\n---\n\n"), "the body starts after the one closing fence");
  await w.saveNote(genv, draft, NOW);

  // Publishing needs the session cookie from the app's own origin: never a bearer token, never another site.
  const login = await site("POST", "/api/reading/login", { form: { token: env.READING_TOKEN } });
  const session = login.headers.get("set-cookie").split(";")[0];
  const send = (path, json, opts = {}) =>
    w.default.fetch(
      new Request(`https://busahin.com${path}`, { method: "POST", headers: { "content-type": "application/json", ...opts.headers }, body: JSON.stringify(json) }),
      { ...genv, PER_VISITOR: open, SITE_WIDE: open },
      { waitUntil() {} },
    );
  const asApp = { headers: { cookie: session, origin: "https://busahin.com" } };
  assert.equal((await send("/api/reading/note/publish", { document: REMAINS, lang: "en" }, { headers: { authorization: `Bearer ${env.READING_TOKEN}` } })).status, 403, "a script with the token cannot publish");
  assert.equal((await send("/api/reading/note/publish", { document: REMAINS, lang: "en" }, { headers: { cookie: session } })).status, 403, "no Origin, no publish");
  assert.equal((await send("/api/reading/note/publish", { document: REMAINS, lang: "en" }, { headers: { cookie: session, origin: "https://evil.example" } })).status, 404, "another origin's cookie is no session");
  assert.equal((await send("/api/reading/note/publish", { document: REMAINS, lang: "en" })).status, 404, "no session at all: the route does not exist");
  assert.equal(gh.length, 0, "none of those reached GitHub");

  // Create.
  let res = await send("/api/reading/note/publish", { document: REMAINS, lang: "en" }, asApp);
  assert.equal(res.status, 200);
  note = await res.json();
  assert.deepEqual([note.published, note.changed], [true, false]);
  const path = "src/content/books/the-remains-of-the-day.md";
  assert.deepEqual(gh.map((g) => [g.method, g.path]), [["GET", path], ["GET", path.replace(".md", ".mdx")], ["PUT", path]]);
  assert.ok(gh.every((g) => g.auth === "Bearer github_pat_test_0123456789" && g.redirect === "manual"));
  assert.ok(gh[0].url.endsWith("?ref=main"));
  assert.deepEqual([gh[2].body.message, gh[2].body.branch, gh[2].body.sha], ["Reading note: publish the-remains-of-the-day (en)", "main", undefined]);
  let { fm: meta, body } = front(path);
  assert.deepEqual(meta, { title: draft.title, author: draft.author, finished: "2026-11-10", description: draft.description, cover: meta.cover, about: "Stevens drives west.\n\nA butler remembers.", aboutFromHardcover: true, lang: "en", translationKey: "the-remains-of-the-day" }, "the book's description goes with the note, credited");
  assert.match(meta.cover, /^https:\/\/files\.busahin\.com\/reading\/covers\/[0-9a-f-]{36}\?v=[0-9a-f]{12}$/, "the cover copy, never Hardcover's");
  assert.equal(body, "Stevens drives west.\n\n## The road\n\nA *quiet* book.\n");

  // The slug is fixed once published.
  note = await w.saveNote(genv, { ...draft, slug: "renamed", body: draft.body + "\n\nMore." }, NOW);
  assert.deepEqual([note.slug, note.changed], ["the-remains-of-the-day", true], "edited: changes not published yet");

  // Update, with the file's SHA.
  gh.length = 0;
  note = await (await send("/api/reading/note/publish", { document: REMAINS, lang: "en" }, asApp)).json();
  assert.deepEqual(gh.map((g) => g.method), ["GET", "PUT"]);
  assert.deepEqual([gh[1].body.message, gh[1].body.sha], ["Reading note: update the-remains-of-the-day (en)", "sha1"]);
  assert.ok(front(path).body.endsWith("More.\n"));
  assert.equal(note.changed, false);

  // Changed on GitHub since: refused unless forced. A file that was never ours: never overwritten.
  repo.set(path, { sha: "by-hand", content: "---\ntitle: x\n---\n" });
  await w.saveNote(genv, { ...draft, body: "Third." }, NOW);
  res = await send("/api/reading/note/publish", { document: REMAINS, lang: "en" }, asApp);
  assert.deepEqual([res.status, (await res.json()).error], [409, "changed"]);
  note = await (await send("/api/reading/note/publish", { document: REMAINS, lang: "en", force: true }, asApp)).json();
  assert.equal(front(path).body, "Third.\n");
  repo.set("src/content/books/foundryside.md", { sha: "hand", content: "---\ntitle: Foundryside\n---\n" });
  await w.saveNote(genv, { ...draft, document: FOUNDRYSIDE, slug: "foundryside", title: "Foundryside", author: "Robert Jackson Bennett", body: "Keys." }, NOW);
  res = await send("/api/reading/note/publish", { document: FOUNDRYSIDE, lang: "en", force: true }, asApp);
  assert.deepEqual([res.status, (await res.json()).error, repo.get("src/content/books/foundryside.md").sha], [409, "exists", "hand"], "even forced");
  repo.delete("src/content/books/foundryside.md");
  repo.set("src/content/books/foundryside.mdx", { sha: "mdx", content: "---\n---\n" });
  res = await send("/api/reading/note/publish", { document: FOUNDRYSIDE, lang: "en" }, asApp);
  assert.equal((await res.json()).error, "exists", "nor shadowed by a hand-written .mdx of the same name");
  repo.delete("src/content/books/foundryside.mdx");

  // Refused before GitHub: incomplete, raw HTML.
  gh.length = 0;
  await w.saveNote(genv, { ...draft, document: FOUNDRYSIDE, slug: "foundryside", title: "Foundryside", author: "", body: "Keys." }, NOW);
  assert.equal((await (await send("/api/reading/note/publish", { document: FOUNDRYSIDE, lang: "en" }, asApp)).json()).error, "incomplete");
  await w.saveNote(genv, { ...draft, document: FOUNDRYSIDE, slug: "foundryside", title: "Foundryside", author: "R. J. Bennett", body: "Keys <script>alert(1)</script>" }, NOW);
  assert.equal((await (await send("/api/reading/note/publish", { document: FOUNDRYSIDE, lang: "en" }, asApp)).json()).error, "html");
  assert.equal(gh.length, 0);

  // Turkish lives under tr/, with the same translation key.
  note = await (await send("/api/reading/note/publish", { document: REMAINS, lang: "tr" }, asApp)).json();
  ({ fm: meta } = front("src/content/books/tr/the-remains-of-the-day.md"));
  assert.deepEqual([meta.lang, meta.translationKey, meta.title, meta.readerTitle, note.url], ["tr", "the-remains-of-the-day", "Günün Kalanı", "The Remains of the Day", "https://busahin.com/tr/reading/the-remains-of-the-day/"]);

  // Unpublish deletes the file with its SHA; the draft stays.
  gh.length = 0;
  note = await (await send("/api/reading/note/unpublish", { document: REMAINS, lang: "tr" }, asApp)).json();
  assert.deepEqual(gh.map((g) => [g.method, g.body?.message, g.body?.sha]), [["GET", undefined, undefined], ["DELETE", "Reading note: unpublish the-remains-of-the-day (tr)", "sha4"]]);
  assert.ok(!repo.has("src/content/books/tr/the-remains-of-the-day.md"));
  assert.deepEqual([note.published, note.title], [false, "Günün Kalanı"]);
  assert.equal((await (await send("/api/reading/note/unpublish", { document: REMAINS, lang: "tr" }, asApp)).json()).error, "not published");

  // Only ever a note's path, only ever on main.
  assert.ok(gh.every((g) => /^src\/content\/books\/(tr\/)?[a-z0-9][a-z0-9-]*\.mdx?$/.test(g.path)));

  // A GitHub failure says so, without the token; no token, no publishing; and a daily cap.
  ghFails = true;
  res = await send("/api/reading/note/publish", { document: REMAINS, lang: "en" }, asApp);
  const failure = await res.text();
  assert.deepEqual([res.status, JSON.parse(failure)], [502, { error: "github", reason: "GitHub: HTTP 500" }]);
  assert.ok(!failure.includes("github_pat"));
  ghFails = false;
  assert.deepEqual(await w.publishNote(env, { document: REMAINS, lang: "en" }, NOW), { error: "no token" });
  sqlite.exec("UPDATE daily SET publishes = 20 WHERE day = '2026-11-18'");
  assert.deepEqual(await w.publishNote(genv, { document: REMAINS, lang: "en" }, NOW), { error: "daily limit" });
  sqlite.exec("UPDATE daily SET publishes = 0 WHERE day = '2026-11-18'");

  // Size caps at the door: no length, or more than the route reads.
  const noLen = await w.default.fetch(new Request("https://busahin.com/api/reading/note", { method: "POST", headers: { cookie: session, origin: "https://busahin.com" }, body: "{}" }), { ...genv, PER_VISITOR: open, SITE_WIDE: open }, { waitUntil() {} });
  assert.equal(noLen.status, 411);
  const big = JSON.stringify({ ...draft, body: "x".repeat(400_001) });
  const tooBig = await w.default.fetch(new Request("https://busahin.com/api/reading/note", { method: "POST", headers: { cookie: session, origin: "https://busahin.com", "content-length": String(big.length) }, body: big }), { ...genv, PER_VISITOR: open, SITE_WIDE: open }, { waitUntil() {} });
  assert.equal(tooBig.status, 400);

  // The Books screen sees each book's notes.
  const listed = (await w.booksList(genv)).books.find((b) => b.document === REMAINS);
  assert.deepEqual(listed.notes, { en: "published", tr: "draft" });
  assert.deepEqual([listed.release_year, listed.genres, listed.on_page], [1989, ["Fiction", "Historical"], true]);
  sqlite.exec("DELETE FROM notes");
}

// ---- a second device: Readest's progress and highlights arrive through Sync with fields CrossPoint always fills left empty
{
  const PIRANESI = "6a1d0c2f9e8b7a6d5c4b3a2918070605";
  const saved = { progress: answers.progress, clippings: answers.clippings };
  const progress = JSON.parse(saved.progress);
  progress.items.push(...readest.progress);
  const clippings = JSON.parse(saved.clippings);
  clippings.items.push(...readest.clippings);
  answers.progress = JSON.stringify(progress);
  answers.clippings = JSON.stringify(clippings);
  sqlite.exec("DELETE FROM day_devices");
  const out = await w.ingest(env, NOW + 32_000_000);
  assert.ok(out.changed.includes("progress") && out.changed.includes("clippings"));
  const book = { ...sqlite.prepare("SELECT title, device, device_id, percentage, page_count FROM books WHERE document = ?").get(PIRANESI) };
  assert.deepEqual(book, { title: "Piranesi", device: "Readest", device_id: "readest", percentage: 0.4, page_count: null }, "a book only the phone has read");
  const clips = sqlite.prepare("SELECT id, kind, term, chapter, created_at FROM clippings WHERE document = ? ORDER BY id").all(PIRANESI);
  assert.deepEqual(clips.map((c) => [c.id, c.kind, c.term, c.chapter]), [["aa11bb22cc33dd44", "word", "vestibule", null], ["aa11bb22cc33dd45", "sentence", null, null], ["aa11bb22cc33dd46", "word", "tides", null]], "no chapter, no para, a line break or no date: still split the same way");
  assert.equal(clips[2].created_at, null);
  assert.ok(sqlite.prepare("SELECT 1 FROM cards WHERE term = 'vestibule'").get(), "a word highlighted on the phone becomes a card");
  assert.deepEqual(sqlite.prepare("SELECT day, device FROM day_devices WHERE device = 'Readest'").all().map((r) => ({ ...r })), [{ day: w.dayOf(1795010400 * 1000), device: "Readest" }], "the day counts for the phone");
  const pub = await w.buildSummary(env, NOW + 32_000_000);
  assert.ok(!JSON.stringify(pub).includes("Readest") && !JSON.stringify(pub).includes("device"), "the public page says nothing about devices");
  answers.progress = saved.progress;
  answers.clippings = saved.clippings;
  await w.ingest(env, NOW + 32_100_000);
}

// ---- descriptions, a book's history and devices, linked apps, cover candidates, status and dates
{
  const log = console.error;
  console.error = () => {};
  const REMAINS = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const FOUNDRYSIDE = "25f8abb4f4f5594f02f361726814fea1";
  const q = (url) => new Request(`https://busahin.com${url}`);

  assert.equal(w.aboutText("A\r\n\n\n\nB\tc\u0007 d e"), "A\n\nB c d e");
  assert.equal(w.aboutText(5), null);
  sqlite.exec("DELETE FROM about");
  assert.ok((await w.refreshAbout(env, NOW)) >= 1);
  await w.refreshAbout(env, NOW); // three a run
  assert.deepEqual({ ...sqlite.prepare("SELECT description, manual FROM about WHERE document = ?").get(REMAINS) }, { description: "Stevens drives west.\n\nA butler remembers.", manual: 0 });
  assert.equal(sqlite.prepare("SELECT description FROM about WHERE document = ?").get(FOUNDRYSIDE).description, null, "Sync's 404: kept as none");
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM about WHERE document = '0123456789abcdef0123456789abcdef'").get().n, 0, "only books on the public page are asked about");
  const calls = requests.length;
  await w.refreshAbout(env, NOW + 86_400_000);
  assert.equal(requests.length, calls, "and not again for a month");
  const listed = (await w.booksList(env)).books.find((b) => b.document === REMAINS);
  assert.deepEqual([listed.description, listed.description_manual, listed.device], ["Stevens drives west.\n\nA butler remembers.", false, "CrossPoint"]);

  const history = await w.bookHistory(env, q(`/api/reading/books/history?document=${REMAINS}`));
  assert.deepEqual(history.reading_days, ["2026-11-16", "2026-11-17"], "only real days");
  assert.deepEqual(history.days, [{ day: "2026-11-16", pages: 20, syncs: 2 }, { day: "2026-11-17", pages: 5, syncs: 1 }]);
  assert.deepEqual(history.devices.map((d) => [d.device, d.percentage]), [["CrossPoint", 0.62], ["Readest", 0.6]]);
  assert.equal(await w.bookHistory(env, q("/api/reading/books/history?document=../x")), null);

  const linked = await w.connectors(env);
  assert.deepEqual(linked.connectors.map((c) => [c.name, c.status, c.pending, c.dead]), [["Readest", "ok", 2, 1], ["Hardcover", "ok", 0, 0]], "only linked apps");
  assert.match(linked.connectors[0].errors[0].message, /not found/);
  assert.ok(!JSON.stringify(linked).includes('"account"'), "the account names stay in Sync");

  // Candidates: only those on an allowed https host are offered, and one is copied through the guarded path.
  const cands = await w.coverCandidates(env, q(`/api/reading/books/candidates?document=${FOUNDRYSIDE}`));
  assert.deepEqual(cands.items.map((c) => new URL(c.url).host), ["is3-ssl.mzstatic.com", "covers.openlibrary.org"]);
  const real = globalThis.fetch;
  const hops = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    if (!/(mzstatic\.com|openlibrary\.org|archive\.org|evil\.example)$/.test(url.host)) return real(input, init);
    hops.push(url.host);
    assert.equal(init.redirect, "manual");
    // Open Library's real chain (checked by hand): covers.openlibrary.org, archive.org, an ia mirror with no length.
    if (url.host === "covers.openlibrary.org") return new Response(null, { status: 302, headers: { location: "https://archive.org/download/olcovers24/olcovers24-L.zip/240727-L.jpg" } });
    if (url.host === "archive.org") return new Response(null, { status: 302, headers: { location: answersHop } });
    return new Response(JPEG, { headers: { "content-type": "image/jpeg" } });
  };
  let answersHop = "https://ia800603.us.archive.org/view_archive.php?archive=/35/items/olcovers24/olcovers24-L.zip&file=240727-L.jpg";
  sqlite.prepare("UPDATE books SET cover_v = NULL WHERE document = ?").run(FOUNDRYSIDE);
  let picked = await w.pickCover(env, { document: FOUNDRYSIDE, url: cands.items[1].url }, NOW);
  assert.match(picked.cover, /^https:\/\/files\.busahin\.com\/reading\/covers\//);
  assert.deepEqual(hops, ["covers.openlibrary.org", "archive.org", "ia800603.us.archive.org"], "two redirects, each to an allowed host, by hand");
  for (const [hop, why] of [["https://evil.example/x.jpg", "a hop off the list"], ["http://ia800603.us.archive.org/x.jpg", "a hop to plain http"], ["https://evilus.archive.org/x.jpg", "a look-alike host"]]) {
    answersHop = hop;
    assert.equal((await w.pickCover(env, { document: FOUNDRYSIDE, url: cands.items[1].url }, NOW)).error, "cover", why);
  }
  assert.equal(await w.pickCover(env, { document: FOUNDRYSIDE, url: "https://evil.example/cover.jpg" }, NOW), null, "never a URL off the list");
  assert.deepEqual(await w.pickCover(env, { document: "0123456789abcdef0123456789abcdef", url: cands.items[0].url }, NOW), { error: "not on the page" });
  picked = await w.pickCover(env, { document: FOUNDRYSIDE, url: cands.items[0].url }, NOW);
  assert.ok(picked.cover);
  globalThis.fetch = real;
  assert.ok(w.coverSource("https://ia600100.us.archive.org/a.jpg", env) && !w.coverSource("https://us.archive.org.evil.example/a.jpg", env) && !w.coverSource("https://.us.archive.org/a.jpg", env));

  // Status and dates go to Sync; a book marked did-not-finish leaves the public list after the pull that follows.
  syncWrites.length = 0;
  const saved = answers.progress;
  const answersAfter = JSON.parse(saved);
  answersAfter.items.find((i) => i.document === REMAINS).status = "dnf";
  answers.progress = JSON.stringify(answersAfter);
  const row = await w.setStatus(env, { document: REMAINS, status: "dnf", finished_date: null }, NOW + 33_000_000);
  assert.deepEqual(syncWrites, [{ path: `/api/v1/documents/${REMAINS}/status`, body: { status: "dnf" } }, { path: `/api/v1/documents/${REMAINS}/dates`, body: { finished_date: null } }]);
  assert.equal(row.status, "dnf");
  const pub = await w.summary(env, NOW + 33_000_000);
  assert.ok(!pub.reading.some((b) => b.title === "The Remains of the Day") && !pub.finished.some((b) => b.title === "The Remains of the Day"), "did not finish: on neither public list");
  for (const bad of [{ document: REMAINS, status: "abandoned" }, { document: REMAINS, start_date: "2026-02-30" }, { document: REMAINS }, { document: "../x", status: "paused" }])
    assert.equal(await w.setStatus(env, bad, NOW), null, JSON.stringify(bad));
  answers.progress = saved;
  await w.pull(env, NOW + 33_100_000, "manual");

  // Through the router: a Sync failure is a 502 that names the status, nothing more.
  const private_ = (path) => w.default.fetch(new Request(`https://busahin.com${path}`, { headers: { authorization: `Bearer ${env.READING_TOKEN}` } }), { ...env, PER_VISITOR: open, SITE_WIDE: open }, { waitUntil() {} });
  assert.equal((await private_(`/api/reading/books/history?document=${REMAINS}`)).status, 200);
  const down = await private_("/api/reading/connectors?x").then(async (r) => [r.status, await r.json()]);
  assert.equal(down[0], 200);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => (new URL(input).pathname === "/api/v1/connectors" ? new Response("nope", { status: 503 }) : realFetch(input, init));
  const failed = await private_("/api/reading/connectors");
  assert.deepEqual([failed.status, await failed.json()], [502, { error: "sync", reason: "/api/v1/connectors: HTTP 503" }]);
  globalThis.fetch = realFetch;
  assert.equal((await call("GET", "/api/reading/connectors")).status, 404, "private, like every other route");

  // The Progress screen: days by device, and the days both were used.
  sqlite.exec("DELETE FROM day_devices; INSERT INTO day_devices VALUES ('2026-11-16', 'CrossPoint'), ('2026-11-17', 'CrossPoint'), ('2026-11-17', 'Readest'), ('2026-11-18', 'Readest')");
  assert.deepEqual((await w.progress(env, NOW)).devices, { days: [{ device: "CrossPoint", days: 2 }, { device: "Readest", days: 2 }], both: 1, since: "2026-11-16" });

  // The app may show candidates before one is copied: its CSP lists the cover hosts, nothing more.
  const login2 = await site("POST", "/api/reading/login", { form: { token: env.READING_TOKEN } });
  const appCsp = (await site("GET", "/api/reading/app", { cookie: login2.headers.get("set-cookie").split(";")[0] })).headers.get("content-security-policy");
  assert.match(appCsp, /img-src 'self' data: https:\/\/files\.busahin\.com https:\/\/assets\.hardcover\.app .*https:\/\/covers\.openlibrary\.org https:\/\/archive\.org https:\/\/\*\.us\.archive\.org;/);
  console.error = log;
}

// ---- schema.sql is what the upgrades make: every column an upgrade adds is in a fresh install, the same way
for (const f of fs.readdirSync(new URL("upgrades/", here)))
  for (const [, table, column, decl] of fs.readFileSync(new URL(`upgrades/${f}`, here), "utf8").matchAll(/^ALTER TABLE (\w+) ADD COLUMN (\w+) ([^;]+);/gm)) {
    const col = sqlite.prepare(`SELECT type, "notnull", dflt_value FROM pragma_table_info('${table}') WHERE name = ?`).get(column);
    assert.ok(col, `${f}: ${table}.${column} is in schema.sql`);
    assert.equal(`${col.type}${col.notnull ? " NOT NULL" : ""}${col.dflt_value !== null ? ` DEFAULT ${col.dflt_value}` : ""}`, decl, `${table}.${column}`);
  }

// ---- Workers reject fetch redirect "error" (Node accepts it, so only this catches it)
for (const f of fs.readdirSync(here).filter((f) => f.endsWith(".js")))
  assert.ok(!/redirect:\s*["']error["']/.test(fs.readFileSync(new URL(f, here), "utf8")), `${f} uses redirect "error"`);

// ---- no em dashes in what the Worker says
for (const f of ["index.js", "page.js"]) assert.ok(!fs.readFileSync(new URL(f, here), "utf8").includes("\u2014"), f);
// ...and no leftover merge conflict anywhere in the Worker.
for (const f of fs.readdirSync(here).filter((f) => /\.(js|mjs|toml|sql|md)$/.test(f) && !/^(dict|examples)\.sql$/.test(f)))
  assert.ok(!/^(<{7}|>{7}) /m.test(fs.readFileSync(new URL(f, here), "utf8")), `conflict marker in ${f}`);

console.log("reading checks pass");
