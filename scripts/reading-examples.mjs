// Builds workers/reading/examples.sql: a few short English example sentences
// with their Turkish translation for each dictionary word, and the frequency
// rank of the 15,000 commonest English words (counted over every English
// sentence), both from Tatoeba
// (https://tatoeba.org, CC BY 2.0 FR; the private words page credits it and
// links each sentence). Run scripts/reading-dict.mjs first: only words in the
// dictionary get examples. Neither the downloads nor the SQL are committed.
//
//   node scripts/reading-examples.mjs              download, then write the SQL
//   node scripts/reading-examples.mjs <dir>        use the three .tsv.bz2 files already there
//
// Then load it (DEPLOY.md), on a different day from the dictionary:
//   npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/examples.sql --config workers/reading/wrangler.toml
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const BASE = "https://downloads.tatoeba.org/exports/per_language";
const FILES = ["eng/eng-tur_links.tsv.bz2", "eng/eng_sentences.tsv.bz2", "tur/tur_sentences.tsv.bz2"];
const DICT = new URL("../workers/reading/dict.sql", import.meta.url);
const OUT = new URL("../workers/reading/examples.sql", import.meta.url);
const PER_WORD = 3;
// D1's free plan writes 100,000 rows a day; the dictionary takes about half of a
// day on its own, so the examples stay under this on a day of their own.
const MAX_ROWS = 40_000;
const RANKED = 15_000; // plus these frequency ranks: 55,000 rows on the day they load

async function source(arg) {
  if (arg) return arg;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tatoeba-"));
  for (const f of FILES) {
    console.log(`Downloading ${BASE}/${f}`);
    const res = await fetch(`${BASE}/${f}`);
    if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
    fs.writeFileSync(path.join(dir, path.basename(f)), Buffer.from(await res.arrayBuffer()));
  }
  return dir;
}

/** Each tab-separated line of a .bz2 file, decompressed by the system's bzcat. */
async function* lines(file) {
  const child = spawn("bzcat", [file], { stdio: ["ignore", "pipe", "inherit"] });
  for await (const line of readline.createInterface({ input: child.stdout, crlfDelay: Infinity })) yield line.split("\t");
}

// The dictionary's words (headwords and inflected forms), read back from dict.sql.
function dictWords() {
  if (!fs.existsSync(DICT)) throw new Error("run node scripts/reading-dict.mjs first");
  const words = new Set();
  for (const m of fs.readFileSync(DICT, "utf8").matchAll(/^\('((?:[^']|'')*)', /gm)) words.add(m[1].replace(/''/g, "'"));
  return words;
}

// A clean example: a whole sentence of 4 to 12 words, no digits, quotes,
// brackets or em dashes (the site uses none), ending like a sentence.
const clean = (s) => /^[A-Z][^0-9"“”()\[\]{}<>#@/\\|_*~\u2014]{10,90}[.?!]$/.test(s) && s.split(" ").length >= 4 && s.split(" ").length <= 12;
const tokens = (s) => s.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];

const dir = await source(process.argv[2]);
const file = (f) => path.join(dir, path.basename(f));
const words = dictWords();

const pairs = new Map(); // English id -> Turkish ids
for await (const [en, tr] of lines(file(FILES[0]))) {
  if (!pairs.has(en)) pairs.set(en, []);
  pairs.get(en).push(tr);
}
const turkish = new Map();
const wantTr = new Set([...pairs.values()].flat());
for await (const [id, , text] of lines(file(FILES[2]))) if (wantTr.has(id) && text && text.length <= 120) turkish.set(id, text.trim());

// Candidates per word: the word itself, as written, in a clean sentence that has a Turkish translation.
// Every English sentence also counts towards each word's frequency.
const byWord = new Map();
const frequency = new Map();
let usable = 0;
for await (const [id, , text] of lines(file(FILES[1]))) {
  if (text) for (const tok of new Set(tokens(text))) frequency.set(tok, (frequency.get(tok) ?? 0) + 1);
  const trIds = pairs.get(id);
  if (!trIds || !text || !clean(text)) continue;
  const tr = trIds.map((t) => turkish.get(t)).filter(Boolean).sort((a, b) => a.length - b.length)[0];
  if (!tr) continue;
  usable++;
  const toks = tokens(text);
  const grams = new Set([...toks, ...toks.slice(1).map((t, i) => `${toks[i]} ${t}`), ...toks.slice(2).map((t, i) => `${toks[i]} ${toks[i + 1]} ${t}`)]);
  for (const g of grams) {
    if (!words.has(g)) continue;
    if (!byWord.has(g)) byWord.set(g, []);
    byWord.get(g).push({ id: Number(id), en: text, tr });
  }
}

// Closest to seven words first, then the oldest id (Tatoeba's older sentences are the most reviewed).
const score = (e) => Math.abs(e.en.split(" ").length - 7) * 1e9 + e.id;
let picked = [...byWord].map(([word, list]) => {
  const seen = new Set();
  const best = list.sort((a, b) => score(a) - score(b)).filter((e) => !seen.has(e.en) && !seen.has(e.tr) && seen.add(e.en).add(e.tr)).slice(0, PER_WORD);
  return { word, best, count: list.length };
});
// Over the cap, drop the most frequent words first: nobody looks up "the".
let rows = picked.reduce((s, p) => s + p.best.length, 0);
picked.sort((a, b) => a.count - b.count);
let dropped = 0;
while (rows > MAX_ROWS) {
  rows -= picked.pop().best.length;
  dropped++;
}

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const flat = picked.flatMap((p) => p.best.map((e) => [p.word, e]));
const out = [
  "-- Generated by scripts/reading-examples.mjs from Tatoeba (https://tatoeba.org), CC BY 2.0 FR.",
  "-- Do not edit or commit; run the script again instead.",
  "DELETE FROM examples;",
];
for (let i = 0; i < flat.length; i += 500)
  out.push(
    "INSERT OR REPLACE INTO examples (word, id, en, tr) VALUES\n" + flat.slice(i, i + 500).map(([w, e]) => `(${q(w)}, ${e.id}, ${q(e.en)}, ${q(e.tr)})`).join(",\n") + ";",
  );
const ranked = [...frequency].sort((a, b) => b[1] - a[1]).slice(0, RANKED);
out.push("DELETE FROM ranks;");
for (let i = 0; i < ranked.length; i += 1000)
  out.push("INSERT OR REPLACE INTO ranks (word, rank) VALUES\n" + ranked.slice(i, i + 1000).map(([w], j) => `(${q(w)}, ${i + j + 1})`).join(",\n") + ";");
fs.writeFileSync(OUT, out.join("\n") + "\n");
console.log(
  `${usable} usable sentence pairs; ${picked.length} words get ${flat.length} examples (${dropped} most frequent words dropped for the cap); ${ranked.length} frequency ranks; ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB -> workers/reading/examples.sql`,
);
