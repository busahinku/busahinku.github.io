// The shelf: a private OPDS catalogue for Burak's e-reader at
// https://busahin.com/api/shelf/opds, the EPUBs behind it, and a small page at
// https://busahin.com/api/shelf/ to add an article by URL, upload a book or
// delete one. Nothing here is public and nothing on the site links to it.
//
// Every route needs HTTP Basic auth (the reader's OPDS client speaks Basic, not
// Digest). Credentials are the SHELF_USER and SHELF_PASSWORD secrets, compared
// in constant time. Every request that carries credentials, right or wrong,
// counts against a per-visitor limit before the compare, so a visitor over it
// gets 429 whatever the password and learns nothing from the answer.
// Files live in their own R2 bucket, `busahin-shelf`, which has no public URL
// and is bound to no other Worker, so the only way to a file is through here.
//
// Free plan only, and it can never become a bill: a Durable Object counts
// authenticated requests and stops at DAILY_REQUESTS a day, which keeps R2
// operations far below the free monthly allowance, and the shelf refuses new
// files past MAX_ITEMS or MAX_BYTES, far below the free storage.
import { buildEpub, inspectEpub, esc } from "./epub.js";
import { LIMITS, decodeHtml, extract, guardedFetch, imageType } from "./article.js";

const SITE = "https://busahin.com";
const BASE = "/api/shelf";
const DAILY_REQUESTS = 3000;
const MAX_ITEMS = 1000;
const MAX_BYTES = 2 * 1024 ** 3;
const MAX_UPLOAD = 25 * 1024 ** 2;
const PAGE_SIZE = 60; // the reader keeps at most 62 entries of a feed
const ID = /^\d{13}-[0-9a-f]{8}$/;

const encoder = new TextEncoder();
const PRIVATE_HEADERS = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};
const respond = (body, status = 200, headers = {}) => new Response(body, { status, headers: { ...PRIVATE_HEADERS, ...headers } });
const json = (body, status = 200) => respond(JSON.stringify(body), status, { "content-type": "application/json; charset=utf-8" });

// ---- auth ----

async function digest(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

// Constant time: both sides are hashed to the same length, then every byte is compared.
export async function sameSecret(a, b) {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// "user:password" from an Authorization header, or null.
export function basicCredentials(header) {
  const match = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(header || "");
  if (!match) return null;
  try {
    const text = new TextDecoder().decode(Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0)));
    return text.includes(":") ? text : null;
  } catch {
    return null;
  }
}

// The empty body matters: the reader treats an empty 401 as a plain Basic
// challenge and retries with the stored username and password.
const challenge = () => respond(null, 401, { "www-authenticate": 'Basic realm="Shelf", charset="UTF-8"' });

// A cross-site form or fetch must not ride on the browser's remembered credentials.
export function crossSite(request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (origin !== null && origin !== SITE) || (fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none");
}

export class DailyBudget {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    const limit = Number(new URL(request.url).searchParams.get("limit")) || 0;
    const day = new Date().toISOString().slice(0, 10);
    const count = (await this.storage.get("day")) === day ? ((await this.storage.get("count")) ?? 0) : 0;
    if (count >= limit) return new Response("spent", { status: 429 });
    await this.storage.put({ day, count: count + 1 });
    return new Response("ok");
  }
}

async function withinBudget(env) {
  const stub = env.BUDGET.get(env.BUDGET.idFromName("shelf"));
  return (await stub.fetch(`https://budget/?limit=${DAILY_REQUESTS}`)).ok;
}

// ---- the catalogue ----

const itemKey = (id) => `items/${id}.epub`;
const coverKey = (id) => `covers/${id}`;
// Newest first for free: R2 lists keys in ascending order, so the key starts with time counted backwards.
const newId = (now = Date.now()) => `${String(9999999999999 - now).padStart(13, "0")}-${crypto.randomUUID().slice(0, 8)}`;

function toItem(object) {
  const m = object.customMetadata ?? {};
  return {
    id: object.key.slice(6, -5),
    title: m.title || "Untitled",
    author: m.author || "",
    kind: m.kind === "article" ? "article" : "book",
    site: m.site || "",
    date: m.date || "",
    source: m.source || "",
    added: m.added || object.uploaded?.toISOString?.() || "",
    cover: m.cover || "",
    size: object.size,
  };
}

async function listItems(env, { cursor, limit = PAGE_SIZE } = {}) {
  const listed = await env.SHELF.list({ prefix: "items/", limit, cursor: cursor || undefined, include: ["customMetadata"] });
  return { items: listed.objects.map(toItem), cursor: listed.truncated ? listed.cursor : null };
}

const FEED_TYPE = "application/atom+xml;profile=opds-catalog";
const FEEDS = {
  all: { title: "Everything, newest first", keep: () => true },
  articles: { title: "Articles", keep: (item) => item.kind === "article" },
  books: { title: "Books", keep: (item) => item.kind === "book" },
};

const feed = ({ id, title, self, kind, updated, links = "", entries }) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
<id>${esc(id)}</id>
<title>${esc(title)}</title>
<updated>${esc(updated)}</updated>
<author><name>Shelf</name></author>
<link rel="self" href="${esc(self)}" type="${FEED_TYPE};kind=${kind}"/>
<link rel="start" href="${BASE}/opds" type="${FEED_TYPE};kind=navigation"/>
${links}${entries.join("\n")}
</feed>`;

export function navigationFeed(now = new Date()) {
  const updated = now.toISOString();
  return feed({
    id: "urn:busahin:shelf",
    title: "Shelf",
    self: `${BASE}/opds`,
    kind: "navigation",
    updated,
    entries: Object.entries(FEEDS).map(
      ([name, { title }]) => `<entry>
<title>${esc(title)}</title>
<id>urn:busahin:shelf:${name}</id>
<updated>${updated}</updated>
<link rel="subsection" href="${BASE}/opds/${name}" type="${FEED_TYPE};kind=acquisition"/>
</entry>`,
    ),
  });
}

// items: one listed page, already newest first. next: the cursor for the page after, if any.
export function acquisitionFeed(name, items, next, now = new Date()) {
  const self = `${BASE}/opds/${name}`;
  const entries = items.filter(FEEDS[name].keep).map((item) => {
    const summary = [item.kind === "article" ? item.site || "Article" : "Book", item.date || item.added.slice(0, 10)].filter(Boolean).join(", ");
    const cover = item.cover
      ? `<link rel="http://opds-spec.org/image" type="${esc(item.cover)}" href="${BASE}/cover/${item.id}"/>
<link rel="http://opds-spec.org/image/thumbnail" type="${esc(item.cover)}" href="${BASE}/cover/${item.id}"/>`
      : "";
    return `<entry>
<title>${esc(item.title)}</title>
<id>urn:busahin:shelf:${item.id}</id>
<updated>${esc(item.added || now.toISOString())}</updated>
${item.author ? `<author><name>${esc(item.author)}</name></author>` : ""}
<summary type="text">${esc(summary)}</summary>
<link rel="http://opds-spec.org/acquisition/open-access" type="application/epub+zip" href="${BASE}/file/${item.id}.epub"/>
${cover}
</entry>`;
  });
  return feed({
    id: `urn:busahin:shelf:${name}`,
    title: FEEDS[name].title,
    self,
    kind: "acquisition",
    updated: items[0]?.added || now.toISOString(),
    links: next ? `<link rel="next" href="${self}?cursor=${encodeURIComponent(next)}" type="${FEED_TYPE};kind=acquisition"/>\n` : "",
    entries,
  });
}

// ---- files ----

async function serveFile(request, env, key, filename) {
  // Range support, because the reader resumes a broken download with one.
  let object;
  try {
    object = await env.SHELF.get(key, { range: request.headers });
  } catch {
    return respond(null, 416);
  }
  if (!object) return respond("Not found", 404);
  const headers = new Headers(PRIVATE_HEADERS);
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  if (filename) {
    const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
    headers.set("content-disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  }
  const range = object.range;
  if (range && request.headers.has("range")) {
    const offset = range.offset ?? object.size - range.suffix;
    const length = range.length ?? object.size - offset;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("content-length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("content-length", String(object.size));
  return new Response(object.body, { headers });
}

const fileName = (item) => `${(item.author ? `${item.author} - ${item.title}` : item.title).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").slice(0, 100).trim() || "book"}.epub`;

async function hasRoom(env, adding) {
  const listed = await env.SHELF.list({ prefix: "items/", limit: MAX_ITEMS });
  const used = listed.objects.reduce((n, o) => n + o.size, 0);
  return !listed.truncated && listed.objects.length < MAX_ITEMS && used + adding <= MAX_BYTES;
}

async function store(env, { epub, cover, meta }) {
  const id = newId();
  const customMetadata = { ...meta, added: new Date().toISOString(), ...(cover ? { cover: cover.type } : {}) };
  // R2 allows 2 KB of custom metadata; these caps keep it under that even in three-byte characters.
  const caps = { title: 160, author: 120, site: 80, source: 500 };
  for (const key of Object.keys(customMetadata)) customMetadata[key] = String(customMetadata[key]).slice(0, caps[key] ?? 40);
  if (cover) await env.SHELF.put(coverKey(id), cover.bytes, { httpMetadata: { contentType: cover.type } });
  await env.SHELF.put(itemKey(id), epub, { httpMetadata: { contentType: "application/epub+zip" }, customMetadata });
  return id;
}

// ---- adding an article ----

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/pjpeg"];

async function fetchImage(src, cache, deps) {
  try {
    const { bytes } = await guardedFetch(src, { types: IMAGE_TYPES, maxBytes: LIMITS.imageBytes, hops: LIMITS.imageHops, cache, ...deps });
    const type = imageType(bytes);
    return type ? { type, bytes } : null;
  } catch {
    return null;
  }
}

// Fetches, extracts and builds. Returns { epub, cover, meta } or throws Error(code).
export async function articleToEpub(input, deps = {}) {
  const cache = new Map();
  const page = await guardedFetch(input, { types: ["text/html", "application/xhtml+xml"], maxBytes: LIMITS.pageBytes, hops: LIMITS.hops, cache, ...deps });
  const article = extract(decodeHtml(page.bytes, page.charset), page.url);
  const textLength = article.blocks.reduce((n, b) => n + (b.text?.length ?? 0), 0);
  if (textLength < 200) throw new Error("empty");

  const sources = [...new Set(article.blocks.filter((b) => b.kind === "img").map((b) => b.src))].slice(0, LIMITS.images);
  const [coverImage, ...fetched] = await Promise.all([article.image ? fetchImage(article.image, cache, deps) : null, ...sources.map((src) => fetchImage(src, cache, deps))]);
  const images = new Map();
  fetched.forEach((image, i) => image && images.set(sources[i], { ...image, name: `images/${i + 1}.${image.type === "image/png" ? "png" : "jpg"}` }));
  const cover = coverImage ? { ...coverImage, name: `images/cover.${coverImage.type === "image/png" ? "png" : "jpg"}` } : null;
  // Only the images that were kept, and no more than a long read needs.
  let budget = 600000;
  const blocks = article.blocks.filter((b) => (b.kind === "img" ? images.has(b.src) : (budget -= b.text.length) > 0));

  const date = article.date || new Date().toISOString().slice(0, 10);
  const epub = buildEpub({ ...article, id: crypto.randomUUID(), date, source: page.url.href, blocks, images, cover });
  return {
    epub,
    cover,
    meta: { title: article.title, author: article.author || article.site, kind: "article", site: article.site, date, source: page.url.href },
  };
}

// The first http(s) URL in whatever a share sheet sent ("Title https://...").
export const firstUrl = (text) => String(text || "").match(/https?:\/\/[^\s<>"']+/i)?.[0] || "";

// ---- the page ----

const MESSAGES = {
  added: "Added to the shelf.",
  uploaded: "Uploaded to the shelf.",
  deleted: "Deleted.",
  url: "That address can't be fetched. Only public http and https pages work.",
  timeout: "The page took too long to answer.",
  size: "The page is larger than 2 MB.",
  type: "That link isn't a web page.",
  status: "The site answered with an error.",
  redirects: "The link redirects too many times.",
  fetch: "The page couldn't be fetched.",
  empty: "I couldn't find readable text on that page.",
  "not-epub": "That file isn't an EPUB.",
  drm: "That EPUB is DRM-protected, so the reader couldn't open it anyway.",
  big: "Files are limited to 25 MB.",
  length: "The upload didn't say its size. Send it from the form, or with a Content-Length header.",
  full: "The shelf is full: 1,000 items or 2 GB. Delete something first.",
  missing: "Nothing to do: the form was empty.",
  budget: "Today's allowance is used up. It resets at midnight UTC.",
};

const STYLE = `
@font-face { font-family: "Merriweather"; src: url("/fonts/Merriweather-normal-tr.woff2") format("woff2"); font-weight: 300 700; font-display: swap; }
:root { --bg: #ffffff; --text: #0f172a; --muted: #475569; --accent: #2563eb; --border: #e2e8f0; color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { --bg: #0a0a0b; --text: #fafafa; --muted: #d4d4d8; --accent: #ef4444; --border: #27272a; } }
@media (monochrome) { :root { --bg: #fff; --text: #000; --muted: #000; --accent: #000; --border: #4a4a4a; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 380 1rem/1.6 "Merriweather", Georgia, serif; font-variation-settings: "opsz" 18; }
main { max-width: 42rem; margin: 0 auto; padding: 3rem 1rem 4rem; }
h1 { font-size: clamp(2rem, 6vw, 2.75rem); font-weight: 600; font-variation-settings: "opsz" 72; line-height: 1.15; margin: 0 0 2rem; }
h2 { font-size: 1.15rem; font-weight: 600; margin: 2.5rem 0 0.75rem; }
form.row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
input[type=url], input[type=file] { flex: 1 1 16rem; min-width: 0; font: inherit; font-size: 1rem; color: inherit; background: transparent; border: 0; border-bottom: 1px solid var(--border); padding: 0.5rem 0; }
input[type=url]:focus { outline: none; border-bottom-color: var(--accent); }
button { font: inherit; font-size: 0.9rem; color: var(--accent); background: none; border: 1px solid currentColor; border-radius: 0.25rem; padding: 0.45rem 0.9rem; cursor: pointer; min-height: 2.75rem; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.note { margin: 0 0 1.5rem; padding: 0.75rem 0; border-top: 1px solid var(--text); border-bottom: 1px solid var(--text); }
ol { list-style: none; margin: 0; padding: 0; counter-reset: item; }
li { counter-increment: item; display: grid; grid-template-columns: 2.25rem 1fr auto; gap: 0 0.75rem; align-items: baseline; padding: 0.8rem 0; border-bottom: 1px dashed var(--border); }
li::before { content: counter(item, decimal-leading-zero); color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
.title { font-weight: 600; overflow-wrap: anywhere; }
.meta { grid-column: 2; color: var(--muted); font-size: 0.85rem; overflow-wrap: anywhere; }
li form { grid-row: 1 / span 2; grid-column: 3; }
li button { color: var(--muted); border-color: var(--border); }
a { color: var(--accent); }
.hint, .empty { color: var(--muted); font-size: 0.9rem; }
`;

const formatSize = (bytes) => (bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)}\u00a0MB` : `${Math.max(1, Math.round(bytes / 1024))}\u00a0KB`);

export function shelfPage({ items, cursor, message, prefill }) {
  const rows = items.map((item) => {
    const meta = [item.kind === "article" ? item.site || "Article" : item.author || "Book", item.date || item.added.slice(0, 10), formatSize(item.size)].filter(Boolean).join(", ");
    const source = item.source ? ` <a href="${esc(item.source)}" rel="noreferrer">source</a>` : "";
    return `<li><span class="title">${esc(item.title)}</span><form method="post" action="${BASE}/delete"><input type="hidden" name="id" value="${item.id}"><button type="submit" aria-label="Delete ${esc(item.title)}">Delete</button></form><span class="meta">${esc(meta)}${source}</span></li>`;
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Shelf</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>Shelf</h1>
${message ? `<p class="note" role="status">${esc(message)}</p>` : ""}
<h2>Send an article</h2>
<form class="row" method="post" action="${BASE}/add">
<input type="url" name="url" required placeholder="https://" value="${esc(prefill)}" aria-label="Article address" autocomplete="off">
<button type="submit">Add</button>
</form>
<h2>Upload an EPUB</h2>
<form class="row" method="post" action="${BASE}/upload" enctype="multipart/form-data">
<input type="file" name="file" accept=".epub,application/epub+zip" required aria-label="EPUB file">
<button type="submit">Upload</button>
</form>
<p class="hint">Up to 25 MB, DRM-free. On the reader, the catalogue is ${esc(SITE + BASE)}/opds.</p>
<h2>On the shelf</h2>
${rows.length ? `<ol>\n${rows.join("\n")}\n</ol>` : `<p class="empty">Nothing yet.</p>`}
${cursor ? `<p><a href="${BASE}/?cursor=${encodeURIComponent(cursor)}">Older</a></p>` : ""}
</main>
</body>
</html>`;
}

const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

// ---- routes ----

// Form posts from the page go back to it; anything else (a Shortcut, curl) gets JSON.
function done(request, result, status = 200) {
  const wantsJson = /json/.test(request.headers.get("accept") || "") || /json/.test(request.headers.get("content-type") || "");
  if (wantsJson) return json(result, result.error ? status : 200);
  const query = result.error ? `e=${encodeURIComponent(result.error)}` : `m=${encodeURIComponent(result.done)}`;
  return respond(null, 303, { location: `${BASE}/?${query}` });
}

async function readInput(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return (await request.json().catch(() => ({}))) ?? {};
  if (type.includes("form")) return Object.fromEntries(await request.formData());
  return { url: await request.text() };
}

async function route(request, env, deps) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "GET" || request.method === "HEAD") {
    if (path === BASE) {
      const { items, cursor } = await listItems(env, { cursor: url.searchParams.get("cursor"), limit: 100 });
      const message = MESSAGES[url.searchParams.get("m") || url.searchParams.get("e")] || "";
      return respond(shelfPage({ items, cursor, message, prefill: firstUrl(url.searchParams.get("url")) }), 200, {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": PAGE_CSP,
      });
    }
    if (path === `${BASE}/opds`) return respond(navigationFeed(), 200, { "content-type": `${FEED_TYPE};kind=navigation; charset=utf-8` });
    const feedName = path.startsWith(`${BASE}/opds/`) ? path.slice(BASE.length + 6) : "";
    if (Object.hasOwn(FEEDS, feedName)) {
      const { items, cursor } = await listItems(env, { cursor: url.searchParams.get("cursor") });
      return respond(acquisitionFeed(feedName, items, cursor), 200, { "content-type": `${FEED_TYPE};kind=acquisition; charset=utf-8` });
    }
    const file = path.match(/^\/api\/shelf\/file\/(\d{13}-[0-9a-f]{8})\.epub$/);
    if (file) {
      const head = await env.SHELF.head(itemKey(file[1]));
      if (!head) return respond("Not found", 404);
      return serveFile(request, env, itemKey(file[1]), fileName(toItem(head)));
    }
    const cover = path.match(/^\/api\/shelf\/cover\/(\d{13}-[0-9a-f]{8})$/);
    if (cover) return serveFile(request, env, coverKey(cover[1]));
    return respond("Not found", 404);
  }

  if (request.method !== "POST") return respond(null, 405, { allow: "GET, HEAD, POST" });

  if (path === `${BASE}/add`) {
    const input = await readInput(request);
    const target = firstUrl(input.url ?? input.text);
    if (!target) return done(request, { error: "missing" }, 400);
    if (!(await hasRoom(env, 2 << 20))) return done(request, { error: "full" }, 507);
    try {
      const built = await articleToEpub(target, deps);
      const id = await store(env, built);
      return done(request, { done: "added", id, title: built.meta.title });
    } catch (error) {
      const code = MESSAGES[error.message] ? error.message : "fetch";
      if (!MESSAGES[error.message]) console.error(error);
      return done(request, { error: code }, 422);
    }
  }

  if (path === `${BASE}/upload`) {
    // Without a declared size the body would be read whole before it could be measured.
    const length = request.headers.get("content-length");
    if (length === null) return done(request, { error: "length" }, 411);
    if (!(Number(length) <= MAX_UPLOAD + 64 * 1024)) return done(request, { error: "big" }, 413);
    let bytes;
    let name = "";
    const type = request.headers.get("content-type") || "";
    if (type.includes("multipart/form-data")) {
      const file = (await request.formData()).get("file");
      if (!file || typeof file === "string") return done(request, { error: "missing" }, 400);
      if (file.size > MAX_UPLOAD) return done(request, { error: "big" }, 413);
      name = file.name || "";
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      bytes = new Uint8Array(await request.arrayBuffer());
      name = url.searchParams.get("name") || "";
    }
    if (bytes.length > MAX_UPLOAD) return done(request, { error: "big" }, 413);
    if (!bytes.length) return done(request, { error: "missing" }, 400);
    let info;
    try {
      info = await inspectEpub(bytes);
    } catch (error) {
      return done(request, { error: error.message === "drm" ? "drm" : "not-epub" }, 415);
    }
    if (!(await hasRoom(env, bytes.length))) return done(request, { error: "full" }, 507);
    const title = info.title || name.replace(/\.epub$/i, "") || "Untitled";
    const id = await store(env, { epub: bytes, cover: info.cover, meta: { title, author: info.author, kind: "book" } });
    return done(request, { done: "uploaded", id, title });
  }

  if (path === `${BASE}/delete`) {
    const input = await readInput(request);
    const id = String(input.id || "");
    if (!ID.test(id)) return done(request, { error: "missing" }, 400);
    await env.SHELF.delete([itemKey(id), coverKey(id)]);
    return done(request, { done: "deleted", id });
  }

  return respond("Not found", 404);
}

// deps: test seams for check.mjs (a fake fetch and DNS resolver). Production passes none.
export async function handle(request, env, deps = {}) {
  const path = new URL(request.url).pathname;
  if (path !== BASE && !path.startsWith(`${BASE}/`)) return respond("Not found", 404);
  // Refuse to run open: no secrets, or a password short enough to guess, means no shelf.
  if (!env.SHELF_USER || !env.SHELF_PASSWORD || env.SHELF_PASSWORD.length < 16) return respond("Not configured", 503);

  const given = basicCredentials(request.headers.get("authorization"));
  if (given === null) return challenge();
  // Before the compare, so a limited visitor cannot tell a right password from a wrong one.
  const { success } = await env.AUTH_ATTEMPTS.limit({ key: request.headers.get("cf-connecting-ip") || "unknown" });
  if (!success) return respond("Too many attempts", 429, { "retry-after": "60" });
  if (!(await sameSecret(given, `${env.SHELF_USER}:${env.SHELF_PASSWORD}`))) return challenge();

  if (request.method === "POST" && crossSite(request)) return respond("Forbidden", 403);
  if (!(await withinBudget(env))) return request.method === "POST" ? done(request, { error: "budget" }, 429) : respond("Daily limit reached", 429);
  return route(request, env, deps);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      // Most likely a free allowance is spent for the day.
      console.error(error);
      return respond("Unavailable", 503);
    }
  },
};
