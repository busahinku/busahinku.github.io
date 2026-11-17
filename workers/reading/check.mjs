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
  requests.push({ url, headers: init.headers });
  const name = { "/healthz": "healthz", "/api/v1/progress": "progress", "/api/v1/stats/activity": "activity", "/api/v1/stats/overview": "overview", "/api/v1/clippings": "clippings" }[url.pathname];
  return name ? new Response(answers[name]) : new Response('{"code":2001,"message":"Unauthorized"}', { status: 401 });
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
assert.deepEqual(s.finished, [{ title: "Foundryside", author: "Robert Jackson Bennett", started: "2026-10-20", finished: "2026-10-30", days: 11 }]);
assert.deepEqual(Object.keys(s).sort(), ["days", "finished", "reading", "streak", "time", "today", "updated_at"], "nothing about words in public");
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
assert.equal((await call("GET", "/api/reading/today", "wrong")).status, 401, "a wrong token is refused, not served the public card");
for (const [method, path] of [["GET", "/api/reading/cards.csv"], ["GET", "/api/reading/sentences"], ["POST", "/api/reading/sync"], ["POST", "/api/reading/review"]])
  assert.equal((await call(method, path)).status, 401, `${method} ${path} needs the token`);
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
  assert.equal((await call("POST", "/api/reading/sync")).status, 401, "never without the token");
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
    assert.equal((await call(method, path)).status, 401, `${method} ${path} needs the token`);
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
  return new Response(new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]), { headers: { "content-type": "audio/mpeg" } });
}
const bucket = new Map();
env.FILES = { put: async (key, bytes, opts) => bucket.set(key, { bytes, opts }) };

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
  if (form) headers["content-type"] = "application/x-www-form-urlencoded";
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
assert.ok(page.includes('name="token"') && !/\b(words?|vocab\w*|turkish|english)\b/i.test(page.replace(/<style[\s\S]*?<\/style>/, "")), "the sign-in page says nothing about what is behind it");
res = await site("POST", "/api/reading/login", { form: { token: "wrong" } });
assert.equal(res.status, 401);
res = await site("POST", "/api/reading/login", { form: { token: env.READING_TOKEN } });
assert.equal(res.status, 303);
const setCookie = res.headers.get("set-cookie");
assert.match(setCookie, /^reading_token=t{40}; Path=\/api\/reading; Max-Age=31536000; HttpOnly; SameSite=Strict; Secure$/);
const cookie = setCookie.split(";")[0];
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
assert.equal((await site("POST", "/api/reading/words", { cookie, origin: "https://evil.example", json: { term: "x" } })).status, 401, "a cookie from another site's form never counts");
assert.equal((await site("POST", "/api/reading/words/delete", { cookie, json: { term: "ubiquitous" } })).status, 409);
assert.equal((await site("POST", "/api/reading/words/delete", { cookie, json: { term: "nothing here" } })).status, 404);
assert.equal((await site("GET", "/api/reading/cards", { cookie: "reading_token=nope" })).status, 401);
res = await site("POST", "/api/reading/logout", { cookie });
assert.match(res.headers.get("set-cookie"), /^reading_token=; Path=\/api\/reading; Max-Age=0/);
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
    assert.equal((await call(method, path)).status, 401, `${method} ${path} needs the token`);
    assert.equal((await call(method, path, "x".repeat(64))).status, 401, `${method} ${path} refuses a wrong token`);
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
  assert.match(rotated.headers.get("set-cookie"), new RegExp(`^reading_token=${token}; Path=/api/reading;.*HttpOnly; SameSite=Strict`));
  assert.equal((await call("GET", "/api/reading/admin", env.READING_TOKEN)).status, 401, "the old token no longer opens anything");
  assert.equal((await call("GET", "/api/reading/admin", token)).status, 200);
  assert.equal((await (await call("GET", "/api/reading/admin", token)).json()).token_rotated, true);
  sqlite.exec("DELETE FROM settings WHERE key = 'token_hash'");
  assert.equal((await call("GET", "/api/reading/admin", env.READING_TOKEN)).status, 200, "deleting the row brings the secret back (the documented recovery)");
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
