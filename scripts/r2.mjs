// Large files live in the R2 bucket behind https://files.busahin.com instead of
// the repo, so git history stays small. Every upload is recorded in
// src/data/files.json (size + content hash); the site reads that at build time
// to link a file, and the hash in the URL busts caches when the file changes.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

export const BUCKET = "busahin-files";
const MANIFEST = "src/data/files.json";

// Mutable files (a course PDF that grows every week) are cached briefly at a
// bare URL; photos never change under the same key.
export const SHORT = "public, max-age=3600";
export const FOREVER = "public, max-age=31536000, immutable";

export function wrangler(args) {
  return execFileSync("npx", ["--yes", "wrangler@4.146.0", ...args], { stdio: ["ignore", "pipe", "pipe"] });
}

export function upload(key, file, contentType, cacheControl = SHORT) {
  const data = fs.readFileSync(file);
  const entry = { bytes: data.length, v: createHash("sha256").update(data).digest("hex").slice(0, 10) };
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (manifest[key]?.v === entry.v) return manifest[key];
  try {
    wrangler(["r2", "object", "put", `${BUCKET}/${key}`, `--file=${file}`, `--content-type=${contentType}`, `--cache-control=${cacheControl}`, "--remote"]);
  } catch (err) {
    throw new Error(`R2 upload of ${key} failed. Is wrangler logged in (npx wrangler login)?\n${err.stderr ?? err.message}`);
  }
  manifest[key] = entry;
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + "\n");
  return entry;
}
