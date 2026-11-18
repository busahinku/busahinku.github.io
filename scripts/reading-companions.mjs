// Uploads the per-book word lists ("<book> - Words.json", made on this Mac)
// to the reading Worker, one request per book. Importing a book again
// replaces its list, so it is safe to run whenever the files change.
//
//   READING_TOKEN=... node scripts/reading-companions.mjs [folder]
//
// The folder defaults to ~/Documents/xteink-x4pro/companions and is searched
// recursively. READING_URL points it at another Worker (local wrangler dev:
// http://localhost:8787); it defaults to https://busahin.com.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const folder = process.argv[2] ?? path.join(os.homedir(), "Documents", "xteink-x4pro", "companions");
const base = (process.env.READING_URL ?? "https://busahin.com").replace(/\/$/, "");
const token = process.env.READING_TOKEN;
if (!token) {
  console.error("Set READING_TOKEN (the token of the private reading page).");
  process.exit(1);
}

const files = fs
  .readdirSync(folder, { recursive: true })
  .filter((f) => f.endsWith(".json"))
  .sort();
if (!files.length) {
  console.error(`No .json word lists under ${folder}`);
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const list = JSON.parse(fs.readFileSync(path.join(folder, file), "utf8"));
  if (typeof list.book !== "string" || !Array.isArray(list.words)) {
    console.log(`skipped  ${file}: not a word list`);
    continue;
  }
  const res = await fetch(`${base}/api/reading/prestudy`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ book: list.book, words: list.words }),
  });
  const answer = await res.json().catch(() => ({}));
  if (res.ok) console.log(`imported ${answer.book}: ${answer.words} words${answer.skipped ? `, ${answer.skipped} skipped` : ""}`);
  else (failed++, console.log(`failed   ${file}: HTTP ${res.status} ${answer.error ?? ""}`));
}
process.exit(failed ? 1 : 0);
