// Copies every file the site keeps in R2 to this Mac, because R2 is storage,
// not a backup: the photo originals live nowhere else online.
//   npm run backup                    -> ~/Documents/busahin.com files
//   npm run backup -- /Volumes/Drive  -> any folder
// A file already there with the same content hash is skipped.
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BUCKET, wrangler } from "./r2.mjs";

const target = path.resolve(process.argv[2] ?? path.join(os.homedir(), "Documents", "busahin.com files"));
const manifest = JSON.parse(fs.readFileSync("src/data/files.json", "utf8"));
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 10);

let fetched = 0;
for (const [key, { v }] of Object.entries(manifest)) {
  const file = path.join(target, key);
  if (fs.existsSync(file) && hash(file) === v) continue;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  wrangler(["r2", "object", "get", `${BUCKET}/${key}`, `--file=${file}`, "--remote"]);
  if (hash(file) !== v) throw new Error(`${key} downloaded but its content does not match the manifest`);
  fetched += 1;
}
console.log(`${Object.keys(manifest).length} files in R2, ${fetched} downloaded, all present in ${target}`);
