import manifest from "../data/files.json";

/** R2 bucket behind a Cloudflare custom domain; see scripts/r2.mjs. */
export const FILES_ORIGIN = "https://files.busahin.com";

interface Entry {
  bytes: number;
  v: string;
}

/** A file uploaded with scripts/r2.mjs, or undefined if it never was. */
export function remoteFile(key: string) {
  const entry = (manifest as Record<string, Entry>)[key];
  return entry && { url: `${FILES_ORIGIN}/${key}?v=${entry.v}`, bytes: entry.bytes };
}
