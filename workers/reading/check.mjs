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
assert.equal(t1.books.find((b) => b.document === "ffeeddccbbaa99887766554433221100").title, "Klara and the Sun - Kazuo Ishiguro", "no metadata: the file name stands in");
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
assert.equal(changes() - before, 4, "only the four raw rows' fetched_at");
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
assert.deepEqual(
  s.reading.map((b) => b.title),
  ["The Remains of the Day", "Klara and the Sun - Kazuo Ishiguro"],
  "paused and finished books are not in progress; newest first",
);
const remains = s.reading[0];
// 0.22 of the book over the last 14 days (it was started 18 days ago).
assert.equal(remains.percent, 62);
assert.equal(remains.percent_per_day, 1.6);
assert.equal(remains.pages_per_day, 4.1);
assert.equal(remains.forecast, "2026-12-13");
assert.equal(remains.started, "2026-11-01");
const klara = s.reading[1];
assert.equal(klara.pages_per_day, null, "no page count, no pages a day");
assert.equal(klara.percent_per_day, 1.7, "0.05 over the three days since it was started");
assert.deepEqual(s.finished, [{ title: "Foundryside", author: "Robert Jackson Bennett", started: "2026-10-20", finished: "2026-10-30", days: 11 }]);
assert.deepEqual(s.words, { collected: 5, learned: 0 });
assert.equal(s.time, null, "CrossPoint uploads no reading time");
assert.ok(s.updated_at > 0);
const sJson = JSON.stringify(s);
for (const secret of ["hum of the house", "boats against", "TR:", "Chapter"]) assert.ok(!sJson.includes(secret), `summary leaks "${secret}"`);

// ---- word of the day: chosen once, kept all day, rotates the next
const day1 = await w.todayCard(env, NOW);
assert.equal(day1.streak, 8);
assert.equal(day1.word.term, s.word.term, "summary and today agree");
assert.deepEqual(await w.todayCard(env, NOW + 3_600_000), day1);
const day2 = await w.todayCard(env, NOW + 86_400_000);
assert.notEqual(day2.word.term, day1.word.term, "a new day shows a word not shown yet");
// "abandoned" is looked up under its headword.
sqlite.exec("UPDATE daily SET term = 'abandoned' WHERE day = '2026-11-21'");
sqlite.exec("INSERT OR IGNORE INTO daily (day, term) VALUES ('2026-11-21', 'abandoned')");
const abandoned = await w.todayCard(env, Date.parse("2026-11-21T07:00:00Z"));
assert.deepEqual(abandoned.word, { term: "abandoned", ipa: "əˈbæn.dən", tr: "bırakmak, kovmak", def: "to give up control of, surrender" });

// ---- reviews
assert.equal(await w.review(env, { term: "nope", grade: "good" }, NOW), undefined);
assert.equal(await w.review(env, { term: "mellow", grade: "maybe" }, NOW), null);
assert.equal(await w.review(env, { term: 42, grade: "good" }, NOW), null);
let card = await w.review(env, { term: "Mellow", grade: "good" }, NOW);
assert.deepEqual({ ...card }, { term: "mellow", box: 2, due: "2026-11-20", reviews: 1, lapses: 0 });
for (let i = 0; i < 3; i++) card = await w.review(env, { term: "mellow", grade: "good" }, NOW);
assert.equal(card.box, 5);
assert.equal(card.due, "2026-12-04");
assert.equal((await w.summary(env, NOW)).words.learned, 1);
card = await w.review(env, { term: "mellow", grade: "again" }, NOW);
assert.deepEqual([card.box, card.due, card.lapses], [1, "2026-11-19", 1]);

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
assert.equal((await w.summary(env, NOW)).words.collected, 4);
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

// ---- no em dashes in what the Worker says
assert.ok(!fs.readFileSync(new URL("index.js", here), "utf8").includes("\u2014"));

console.log("reading checks pass");
