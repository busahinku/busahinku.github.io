// Builds workers/reading/dict.sql, the English to Turkish dictionary the
// reading Worker looks words up in, from WikDict's StarDict export:
//   https://download.wikdict.com/dictionaries/stardict/wikdict-en-tr.zip
// WikDict is built from Wiktionary by Karl Bartel and is CC BY-SA 4.0; the site
// credits it wherever a gloss is shown. Neither the download nor the SQL is
// committed (the SQL is in .gitignore).
//
//   node scripts/reading-dict.mjs              download, then write the SQL
//   node scripts/reading-dict.mjs <dir|zip>    use a copy you already have
//
// Then load it (DEPLOY.md):
//   npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/dict.sql --config workers/reading/wrangler.toml
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SOURCE = "https://download.wikdict.com/dictionaries/stardict/wikdict-en-tr.zip";
const OUT = new URL("../workers/reading/dict.sql", import.meta.url);
const MAX_TR = 4; // Turkish glosses kept per word

async function stardictDir(arg) {
  if (arg && fs.statSync(arg).isDirectory()) return findIfo(arg);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wikdict-"));
  let zip = arg;
  if (!zip) {
    zip = path.join(tmp, "wikdict-en-tr.zip");
    console.log(`Downloading ${SOURCE}`);
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  }
  execFileSync("unzip", ["-oq", zip, "-d", tmp]);
  return findIfo(tmp);
}

function findIfo(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true }))
    if (entry.name === "stardict.ifo") return entry.parentPath ?? entry.path;
  throw new Error(`no stardict.ifo under ${dir}`);
}

const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'" })[e]).replace(/\s*\u2014\s*/g, ", ").replace(/\s+/g, " ").trim(); // the site has no em dashes, glosses included

/**
 * One entry's small HTML: an optional line of IPA in grey, then senses, each
 * with a part of speech in green, an English gloss as bare text and the Turkish
 * translations as tag-free <div>s.
 */
function parseEntry(html) {
  const ipa = [...html.matchAll(/<font color="gray">([^<]+)<\/font>/g)].map((m) => decode(m[1]).replace(/^\[|\]$/g, "")).find((s) => /\p{L}/u.test(s)) ?? null;
  const pos = html.match(/<font class="grammar"[^>]*>([^<]+)<\/font>/)?.[1] ?? null;
  const tr = [...html.matchAll(/<div>([^<]+)<\/div>/g)].map((m) => decode(m[1])).filter(Boolean);
  const rest = html
    .replace(/^<div>\/<font color="gray">[\s\S]*?<br>/, "")
    .replace(/<font[^>]*>[^<]*<\/font>/g, "")
    .replace(/<div>[^<]*<\/div>/g, "");
  const def = rest.split(/<[^>]+>/).map(decode).find(Boolean) ?? null;
  return { ipa, pos: pos && decode(pos), def: def && def.slice(0, 200), tr };
}

function readIndex(buffer, withSize) {
  const out = [];
  for (let i = 0; i < buffer.length; ) {
    const end = buffer.indexOf(0, i);
    const word = buffer.toString("utf8", i, end);
    if (withSize) {
      out.push({ word, offset: buffer.readUInt32BE(end + 1), size: buffer.readUInt32BE(end + 5) });
      i = end + 9;
    } else {
      out.push({ word, index: buffer.readUInt32BE(end + 1) });
      i = end + 5;
    }
  }
  return out;
}

function build(dir) {
  const ifo = fs.readFileSync(path.join(dir, "stardict.ifo"), "utf8");
  if (/idxoffsetbits=64/.test(ifo)) throw new Error("64-bit offsets are not handled");
  if (!/sametypesequence=h/.test(ifo)) throw new Error("expected HTML entries (sametypesequence=h)");
  const dict = fs.readFileSync(path.join(dir, "stardict.dict"));
  const idx = readIndex(fs.readFileSync(path.join(dir, "stardict.idx")), true);

  // A headword can have several entries (noun, verb): merge them, first one first.
  const words = new Map();
  const keys = idx.map(({ word, offset, size }) => {
    const key = word.toLowerCase().trim();
    if (!key || key.startsWith("-") || key.length > 60) return null;
    const e = parseEntry(dict.toString("utf8", offset, offset + size));
    const have = words.get(key) ?? { ipa: null, pos: null, def: null, tr: [] };
    have.ipa ??= e.ipa;
    have.pos ??= e.pos;
    have.def ??= e.def;
    for (const t of e.tr) if (!have.tr.includes(t)) have.tr.push(t);
    words.set(key, have);
    return key;
  });

  // Inflected forms (houses -> house) share their headword's entry.
  let forms = 0;
  const synPath = path.join(dir, "stardict.syn");
  if (fs.existsSync(synPath))
    for (const { word, index } of readIndex(fs.readFileSync(synPath), false)) {
      const key = word.toLowerCase().trim();
      const head = keys[index];
      if (!key || key.startsWith("-") || key.length > 60 || !head || words.has(key)) continue;
      words.set(key, words.get(head));
      forms++;
    }

  const rows = [...words].filter(([, e]) => e.tr.length);
  return { rows, forms, headwords: words.size - forms };
}

const q = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

const dir = await stardictDir(process.argv[2]);
const { rows, forms, headwords } = build(dir);
const lines = [
  "-- Generated by scripts/reading-dict.mjs from WikDict en-tr (https://www.wikdict.com/), CC BY-SA 4.0.",
  "-- Do not edit or commit; run the script again instead.",
  "DELETE FROM dict;",
];
for (let i = 0; i < rows.length; i += 500)
  lines.push(
    "INSERT OR REPLACE INTO dict (word, ipa, pos, def, tr) VALUES\n" +
      rows
        .slice(i, i + 500)
        .map(([word, e]) => `(${[word, e.ipa, e.pos, e.def, e.tr.slice(0, MAX_TR).join(", ")].map(q).join(", ")})`)
        .join(",\n") +
      ";",
  );
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`${rows.length} rows (${headwords} headwords, ${forms} inflected forms), ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB -> workers/reading/dict.sql`);
