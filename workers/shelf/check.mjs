// node workers/shelf/check.mjs: the shelf offline, with an in-memory bucket and a
// fake network. Covers auth on every route, the OPDS feeds as the reader's parser
// reads them, the URL guard, a built article's EPUB structure, upload validation,
// and how long extraction and packing take on a large page.
import assert from "node:assert/strict";
import { handle, navigationFeed, acquisitionFeed, basicCredentials, sameSecret, firstUrl } from "./index.js";
import { LIMITS, allowedUrl, guardedFetch, extract, privateAddress } from "./article.js";
import { buildEpub, crc32, inspectEpub, readEntry, readZip, zip } from "./epub.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const USER = "reader";
const PASSWORD = "correct-horse-battery-staple";
const AUTH = `Basic ${btoa(`${USER}:${PASSWORD}`)}`;

// ---- fakes ----

function fakeBucket() {
  const objects = new Map();
  const bucket = {
    ops: 0,
    objects,
    async put(key, value, options = {}) {
      bucket.ops++;
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(await new Response(value).arrayBuffer());
      objects.set(key, { key, bytes, size: bytes.length, httpMetadata: options.httpMetadata ?? {}, customMetadata: options.customMetadata ?? {}, uploaded: new Date() });
    },
    async head(key) {
      bucket.ops++;
      return objects.get(key) ?? null;
    },
    async get(key, options = {}) {
      bucket.ops++;
      const object = objects.get(key);
      if (!object) return null;
      let range;
      const header = options.range?.get?.("range");
      if (header) {
        const [, start, end] = header.match(/bytes=(\d+)-(\d*)/);
        range = { offset: Number(start), length: (end ? Number(end) + 1 : object.size) - Number(start) };
      }
      const bytes = range ? object.bytes.subarray(range.offset, range.offset + range.length) : object.bytes;
      return {
        ...object,
        range,
        body: new Blob([bytes]).stream(),
        httpEtag: '"etag"',
        writeHttpMetadata: (headers) => object.httpMetadata.contentType && headers.set("content-type", object.httpMetadata.contentType),
      };
    },
    async delete(keys) {
      bucket.ops++;
      for (const key of [keys].flat()) objects.delete(key);
    },
    async list({ prefix = "", limit = 1000, cursor }) {
      bucket.ops++;
      const keys = [...objects.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = keys.slice(start, start + limit).map((k) => objects.get(k));
      const truncated = start + limit < keys.length;
      return { objects: page, truncated, cursor: truncated ? String(start + limit) : undefined };
    },
  };
  return bucket;
}

function fakeLimiter(limit) {
  const counts = new Map();
  return { limit: async ({ key }) => ({ success: (counts.set(key, (counts.get(key) ?? 0) + 1), counts.get(key) <= limit) }) };
}

function fakeEnv(overrides = {}) {
  let budget = 0;
  return {
    SHELF_USER: USER,
    SHELF_PASSWORD: PASSWORD,
    SHELF: fakeBucket(),
    AUTH_ATTEMPTS: fakeLimiter(300),
    BUDGET: { idFromName: () => "id", get: () => ({ fetch: async () => new Response(null, { status: ++budget <= (overrides.budget ?? 1e9) ? 200 : 429 }) }) },
    ...overrides,
  };
}

// A fake internet: url -> () => Response. Unknown URLs fail like a dead host.
function fakeNet(routes) {
  return async (url, init) => {
    const route = routes[url];
    if (!route) throw new TypeError("fetch failed");
    return route(init);
  };
}
const publicDns = async () => ["93.184.216.34"];
const html = (body, headers = {}) => () => new Response(body, { headers: { "content-type": "text/html; charset=utf-8", ...headers } });

const request = (path, { method = "GET", auth = AUTH, headers = {}, body } = {}) =>
  new Request(`https://busahin.com${path}`, { method, body, duplex: "half", headers: { ...(auth ? { authorization: auth } : {}), ...headers } });

// ---- the reader's OPDS 1.x parser, transcribed ----
// freeink-sdk libs/network/Opds/src/OpdsParser.cpp at the commit CrossPoint 2.0.0
// pins (5e94fe7): an <entry> becomes a row only with a title and an href; it is a
// book when a link has an acquisition rel and type exactly application/epub+zip,
// navigation when a link's type contains application/atom+xml; covers come from
// rel http://opds-spec.org/image; paging from a feed-level rel="next"; at most 62
// entries are kept. The XML must be well formed, since expat stops at an error.
function wellFormed(xml) {
  const stack = [];
  const body = xml.replace(/^<\?xml[^>]*\?>/, "").replace(/<!DOCTYPE[^>]*>/i, "");
  for (const [, closing, name, , selfClosing] of body.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/g)) {
    if (selfClosing) continue;
    if (!closing) stack.push(name);
    else assert.equal(stack.pop(), name, `closing ${name}`);
  }
  assert.equal(stack.length, 0, "unclosed elements");
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(body), "bare ampersand");
}
const RANK = (rel) => (rel.includes("opds-spec.org/acquisition") ? (rel.includes("/open-access") ? 3 : rel.includes("/sample") ? -1 : rel.includes("/buy") ? 0 : 2) : -1);
function readerParse(xml) {
  wellFormed(xml);
  const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map((m) => [m[1], m[2].replace(/&amp;/g, "&")]));
  const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const outside = xml.replace(/<entry>[\s\S]*?<\/entry>/g, "");
  const next = [...outside.matchAll(/<link\b[^>]*>/g)].map((m) => attrs(m[0])).find((a) => a.rel === "next")?.href ?? "";
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 62).map(([, inner]) => {
    const entry = { type: "navigation", title: unescape(inner.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""), author: unescape(inner.match(/<author><name>([\s\S]*?)<\/name><\/author>/)?.[1] ?? ""), href: "", cover: "" };
    for (const link of [...inner.matchAll(/<link\b[^>]*>/g)].map((m) => attrs(m[0]))) {
      if (RANK(link.rel ?? "") >= 0 && link.type === "application/epub+zip") Object.assign(entry, { type: "book", href: link.href });
      else if ((link.type ?? "").includes("application/atom+xml") && entry.type !== "book") entry.href = link.href;
      else if ((link.rel ?? "").includes("opds-spec.org/image") && (!link.rel.includes("/thumbnail") || !entry.cover)) entry.cover = link.href;
    }
    return entry;
  });
  return { next, entries: entries.filter((e) => e.title && e.href) };
}

// ---- 1. the URL guard ----

for (const bad of [
  "ftp://example.com/x", "file:///etc/passwd", "javascript:alert(1)", "data:text/html,hi",
  "http://localhost/", "http://LOCALHOST./", "http://app.localhost/", "http://printer.local/", "http://intranet/", "http://db.internal/",
  "http://127.0.0.1/", "http://127.1/", "http://2130706433/", "http://0x7f.0.0.1/", "http://0/", "http://10.0.0.1/", "http://100.64.0.1/",
  "http://169.254.169.254/latest/meta-data/", "http://172.16.0.1/", "http://192.168.1.1/", "http://198.18.0.1/", "http://224.0.0.1/",
  "http://[::1]/", "http://[::]/", "http://[::ffff:127.0.0.1]/", "http://[::ffff:7f00:1]/", "http://[fd00::1]/", "http://[fe80::1]/", "http://[64:ff9b::a00:1]/", "http://[2002:c0a8:101::1]/",
  "https://user:pass@example.com/", "https://example.com:8443/", "https://busahin.com/api/shelf/", "https://files.busahin.com/x",
]) assert.equal(allowedUrl(bad), null, bad);
for (const good of ["https://example.com/a?b=c", "http://example.org/", "http://93.184.216.34/", "https://[2606:4700::1111]/"]) assert.ok(allowedUrl(good), good);
assert.ok(privateAddress("10.1.2.3") && privateAddress("fc00::1") && !privateAddress("1.1.1.1") && !privateAddress("2606:4700::1111"));

const fetchOpts = { types: ["text/html"], maxBytes: 1000, hops: 2 };
const rejects = (promise, code) => assert.rejects(promise, (e) => e.message === code, code);
// A public name that resolves to a private address.
await rejects(guardedFetch("https://sneaky.example/", { ...fetchOpts, resolve: async () => ["10.0.0.5"], fetcher: fakeNet({ "https://sneaky.example/": html("x") }) }), "url");
await rejects(guardedFetch("https://nowhere.example/", { ...fetchOpts, resolve: async () => [], fetcher: fakeNet({}) }), "url");
await rejects(guardedFetch("https://mixed.example/", { ...fetchOpts, resolve: async () => ["93.184.216.34", "::1"], fetcher: fakeNet({}) }), "url");
// Redirects: into an internal address, into a private-resolving host, too many, and a fine one.
const redirect = (to) => () => new Response(null, { status: 302, headers: { location: to } });
await rejects(guardedFetch("https://a.example/", { ...fetchOpts, resolve: publicDns, fetcher: fakeNet({ "https://a.example/": redirect("http://169.254.169.254/") }) }), "url");
await rejects(
  guardedFetch("https://a.example/", { ...fetchOpts, resolve: async (h) => (h === "evil.example" ? ["127.0.0.1"] : ["93.184.216.34"]), fetcher: fakeNet({ "https://a.example/": redirect("https://evil.example/") }) }),
  "url",
);
await rejects(guardedFetch("https://a.example/", { ...fetchOpts, resolve: publicDns, fetcher: fakeNet({ "https://a.example/": redirect("/b"), "https://a.example/b": redirect("/c"), "https://a.example/c": redirect("/d") }) }), "redirects");
const ok = await guardedFetch("https://a.example/", { ...fetchOpts, resolve: publicDns, fetcher: fakeNet({ "https://a.example/": redirect("/b"), "https://a.example/b": html("<p>fine</p>") }) });
assert.equal(ok.url.href, "https://a.example/b");
assert.equal(decoder.decode(ok.bytes), "<p>fine</p>");
// Size: declared too large, and too large while streaming with no declared length.
await rejects(guardedFetch("https://a.example/", { ...fetchOpts, resolve: publicDns, fetcher: fakeNet({ "https://a.example/": html("x", { "content-length": "5000" }) }) }), "size");
const endless = () =>
  new Response(new ReadableStream({ pull: (c) => c.enqueue(encoder.encode("a".repeat(300))) }), { headers: { "content-type": "text/html" } });
await rejects(guardedFetch("https://a.example/", { ...fetchOpts, resolve: publicDns, fetcher: fakeNet({ "https://a.example/": endless }) }), "size");
await rejects(guardedFetch("https://a.example/", { ...fetchOpts, resolve: publicDns, fetcher: fakeNet({ "https://a.example/": () => new Response("{}", { headers: { "content-type": "application/json" } }) }) }), "type");
await rejects(guardedFetch("https://a.example/", { ...fetchOpts, resolve: publicDns, fetcher: fakeNet({ "https://a.example/": () => new Response("no", { status: 404, headers: { "content-type": "text/html" } }) }) }), "status");
// Node does not keep the process alive for AbortSignal.timeout; the interval does.
const hang = (url, init) =>
  new Promise((_, reject) => {
    const alive = setInterval(() => {}, 10);
    init.signal.addEventListener("abort", () => (clearInterval(alive), reject(init.signal.reason)));
  });
await rejects(guardedFetch("https://a.example/", { ...fetchOpts, resolve: publicDns, fetcher: hang, timeout: 50 }), "timeout");

assert.equal(firstUrl("A great read https://example.com/post?id=1 via app"), "https://example.com/post?id=1");
assert.equal(firstUrl("nothing here"), "");

// ---- 2. extraction and the article EPUB ----

const paragraph = (n) => `<p>Paragraph ${n} of the essay says something worth reading on paper, with an &amp; and a &mdash; and caf&#233; in it.</p>`;
const ARTICLE = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Fallback title</title>
<meta property="og:title" content="On Reading &amp; Paper">
<meta name="author" content="Ada Writer"><meta property="og:site_name" content="The Example Review">
<meta property="article:published_time" content="2026-11-02T08:00:00Z">
<meta property="og:image" content="/cover.jpg">
<script>var nav = "<p>not text</p>";</script><style>p { color: red }</style></head>
<body><header class="site-header"><nav><a href="/">Home</a> <a href="/about">About the menu</a></nav></header>
<article><h1>On Reading &amp; Paper</h1>
${Array.from({ length: 12 }, (_, i) => paragraph(i + 1)).join("\n")}
<figure><img src="/pic.jpg" alt="A desk"><figcaption>The desk.</figcaption></figure>
<h2>A section</h2><ul><li>First point</li><li>Second point</li></ul>
<blockquote>A quoted line.</blockquote><pre>code  stays
  as is</pre>
<div class="share-buttons">Share on everything</div>
<img src="https://tracker.example/pixel.gif" width="1" height="1">
</article>
<aside>Related stories you will not miss</aside>
<section id="comments"><p>First comment!</p></section>
<footer>Copyright and cookie notice</footer></body></html>`;

// A real (tiny) JPEG and PNG by their first bytes.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(200).fill(7), 0xff, 0xd9]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(100).fill(1)]);
const image = (bytes, type) => () => new Response(bytes, { headers: { "content-type": type } });
const articleNet = fakeNet({
  "https://example.com/essay": html(ARTICLE),
  "https://example.com/cover.jpg": image(JPEG, "image/jpeg"),
  "https://example.com/pic.jpg": image(PNG, "image/png"),
});

const extracted = extract(ARTICLE, new URL("https://example.com/essay"));
assert.equal(extracted.title, "On Reading & Paper");
assert.equal(extracted.author, "Ada Writer");
assert.equal(extracted.site, "The Example Review");
assert.equal(extracted.date, "2026-11-02");
assert.equal(extracted.lang, "en-GB");
const allText = extracted.blocks.map((b) => b.text ?? "").join("\n");
assert.ok(allText.includes("Paragraph 12") && allText.includes("caf\u00e9") && allText.includes("& and a \u2014"));
assert.ok(allText.includes("First point") && allText.includes("A quoted line.") && allText.includes("code  stays\n  as is"));
for (const noise of ["not text", "About the menu", "Related stories", "First comment", "cookie notice", "Share on everything", "color: red"]) assert.ok(!allText.includes(noise), noise);
assert.ok(!extracted.blocks.some((b) => b.kind === "h" && b.text === "On Reading & Paper"), "the h1 repeats the title page");
assert.deepEqual(extracted.blocks.filter((b) => b.kind === "img").map((b) => b.src), ["https://example.com/pic.jpg"]);
// A page with no <article> or <main> still gives its body, without the chrome.
const plain = extract(`<html><body><div class="menu">Menu items</div><div>${paragraph(1).repeat(8)}</div><div class="footer-links">Links</div></body></html>`, new URL("https://x.example/"));
assert.ok(plain.blocks.length >= 1 && !plain.blocks.some((b) => /Menu items|Links/.test(b.text)));

const env = fakeEnv();
const added = await handle(request("/api/shelf/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: "Read this https://example.com/essay" }) }), env, { fetcher: articleNet, resolve: publicDns });
assert.equal(added.status, 200, await added.clone().text());
const { id: articleId, title } = await added.json();
assert.equal(title, "On Reading & Paper");
const stored = env.SHELF.objects.get(`items/${articleId}.epub`);
assert.equal(stored.customMetadata.kind, "article");
assert.equal(stored.customMetadata.author, "Ada Writer");
assert.equal(stored.customMetadata.source, "https://example.com/essay");
assert.equal(env.SHELF.objects.get(`covers/${articleId}`).httpMetadata.contentType, "image/jpeg");

// EPUB structure, checked from the bytes.
async function assertValidEpub(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50, "starts with a local file header");
  assert.equal(view.getUint16(8, true), 0, "mimetype is stored");
  assert.equal(view.getUint16(28, true), 0, "mimetype has no extra field");
  assert.equal(decoder.decode(bytes.subarray(30, 38)), "mimetype", "mimetype comes first");
  assert.equal(decoder.decode(bytes.subarray(38, 58)), "application/epub+zip");
  const entries = readZip(bytes);
  for (const [name, entry] of entries) {
    assert.equal(entry.method, 0, `${name} stored`);
    const data = await readEntry(bytes, entry, 1 << 22);
    const local = new DataView(bytes.buffer, bytes.byteOffset + entry.offset);
    assert.equal(local.getUint32(14, true), crc32(data), `${name} crc`);
  }
  const read = async (name) => decoder.decode(await readEntry(bytes, entries.get(name), 1 << 22));
  const container = await read("META-INF/container.xml");
  wellFormed(container);
  const opfPath = container.match(/full-path="([^"]+)"/)[1];
  const opf = await read(opfPath);
  wellFormed(opf);
  for (const required of ["<dc:identifier", "<dc:title>", "<dc:language>", 'property="dcterms:modified"', 'properties="nav"', "<spine>"]) assert.ok(opf.includes(required), required);
  const dir = opfPath.slice(0, opfPath.lastIndexOf("/") + 1);
  const manifest = new Map([...opf.matchAll(/<item id="([^"]+)" href="([^"]+)" media-type="([^"]+)"/g)].map((m) => [m[1], { href: m[2], type: m[3] }]));
  for (const { href, type } of manifest.values()) {
    assert.ok(entries.has(dir + href), `manifest file ${href} is in the zip`);
    if (type === "application/xhtml+xml") wellFormed(await read(dir + href));
  }
  for (const [, idref] of opf.matchAll(/<itemref idref="([^"]+)"/g)) assert.ok(manifest.has(idref), `spine ${idref}`);
  return { entries, opf, read, dir };
}
const built = await assertValidEpub(stored.bytes);
const text = await built.read(`${built.dir}text.xhtml`);
assert.ok(text.includes("Paragraph 12") && text.includes("https://example.com/essay"));
assert.ok(text.includes('<img src="images/1.png"') && built.entries.has("OEBPS/images/1.png") && built.entries.has("OEBPS/images/cover.jpg"));
assert.ok(!built.entries.has("OEBPS/images/2.png"), "the tracking pixel is not fetched");
assert.ok(built.opf.includes('properties="cover-image"'));
const titlePage = await built.read(`${built.dir}title.xhtml`);
assert.ok(titlePage.includes("Ada Writer") && titlePage.includes("The Example Review") && titlePage.includes("2026-11-02"));
// The upload check accepts what the shelf builds.
assert.deepEqual(
  (({ title, author, language }) => ({ title, author, language }))(await inspectEpub(stored.bytes)),
  { title: "On Reading & Paper", author: "Ada Writer", language: "en-GB" },
);

// Pages the shelf refuses.
const refuse = async (routes, code) => {
  const response = await handle(request("/api/shelf/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: Object.keys(routes)[0] }) }), fakeEnv(), { fetcher: fakeNet(routes), resolve: publicDns });
  assert.equal((await response.json()).error, code, code);
};
await refuse({ "https://example.com/app": html("<html><body><div id=root></div><script>render()</script></body></html>") }, "empty");
await refuse({ "https://example.com/big": html("x", { "content-length": String(3 << 20) }) }, "size");
await refuse({ "http://127.0.0.1/": html("x") }, "url");

// Hostile markup stays linear: an opener with no end stops the scan instead of
// being retried from every later "<", and text before it is kept.
for (const unit of ['<a "', "<!--", "<![CDATA[", "<?x ", "<div hidden>", "<script>", "<div>", "</ul><div>", "<a <b <c "]) {
  const hostile = `<p>${"word ".repeat(100)}</p>` + unit.repeat(Math.ceil(200_000 / unit.length));
  const started = performance.now();
  const blocks = extract(hostile, new URL("https://example.com/")).blocks;
  const took = performance.now() - started;
  assert.ok(took < 250, `${JSON.stringify(unit)} repeated to 200 KB took ${took.toFixed(0)} ms`);
  assert.ok(blocks.some((b) => b.text?.startsWith("word word")), `${JSON.stringify(unit)}: the text before it is kept`);
}
// A stray "<" in text is text, not the end of the page.
assert.ok(extract(`<p>${"a < b and c <= d ".repeat(30)}</p><p>still here</p>`, new URL("https://example.com/")).blocks.some((b) => b.text === "still here"));

// ---- 3. auth on every route ----

const ROUTES = [
  ["GET", "/api/shelf/"], ["GET", "/api/shelf"], ["GET", "/api/shelf/opds"], ["GET", "/api/shelf/opds/all"], ["GET", "/api/shelf/opds/books"],
  ["GET", `/api/shelf/file/${articleId}.epub`], ["GET", `/api/shelf/cover/${articleId}`], ["HEAD", `/api/shelf/file/${articleId}.epub`],
  ["POST", "/api/shelf/add"], ["POST", "/api/shelf/upload"], ["POST", "/api/shelf/delete"], ["GET", "/api/shelf/nope"],
];
for (const [method, path] of ROUTES) {
  const opsBefore = env.SHELF.ops;
  for (const auth of [null, "Basic " + btoa(`${USER}:wrong-password-here`), "Basic " + btoa(`${USER}x:${PASSWORD}`), "Basic !!!", `Bearer ${PASSWORD}`, "Basic " + btoa(USER + PASSWORD)]) {
    const response = await handle(request(path, { method, auth, headers: { "cf-connecting-ip": `198.51.100.${ROUTES.findIndex((r) => r[1] === path && r[0] === method)}` } }), env);
    assert.equal(response.status, 401, `${method} ${path} with ${auth}`);
    assert.match(response.headers.get("www-authenticate"), /^Basic realm="Shelf"/);
    assert.equal(await response.text(), "", "an empty 401 body, which the reader reads as a Basic challenge");
  }
  assert.equal(env.SHELF.ops, opsBefore, `${method} ${path}: no bucket access without auth`);
}
// Past the per-visitor limit every credentialed request is refused, the right password
// included, and the limiter is asked before the password is compared.
const guesser = { ...env, AUTH_ATTEMPTS: fakeLimiter(3) };
const guesses = [];
for (const password of ["g1", "g2", "g3", "g4", PASSWORD]) guesses.push((await handle(request("/api/shelf/opds", { auth: "Basic " + btoa(`${USER}:${password}`), headers: { "cf-connecting-ip": "203.0.113.9" } }), guesser)).status);
assert.deepEqual(guesses, [401, 401, 401, 429, 429]);
// Another visitor is unaffected.
assert.equal((await handle(request("/api/shelf/opds", { headers: { "cf-connecting-ip": "203.0.113.10" } }), guesser)).status, 200);
// Not configured, or a short password: closed.
assert.equal((await handle(request("/api/shelf/opds"), fakeEnv({ SHELF_PASSWORD: undefined }))).status, 503);
assert.equal((await handle(request("/api/shelf/opds", { auth: "Basic " + btoa("reader:short") }), fakeEnv({ SHELF_PASSWORD: "short" }))).status, 503);
// Outside /api/shelf the Worker answers nothing.
assert.equal((await handle(request("/api/shelfish"), env)).status, 404);
// A cross-site form cannot use the browser's remembered credentials.
for (const headers of [{ origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }]) {
  assert.equal((await handle(request("/api/shelf/delete", { method: "POST", headers: { ...headers, "content-type": "application/x-www-form-urlencoded" }, body: `id=${articleId}` }), env)).status, 403);
}
assert.ok(env.SHELF.objects.has(`items/${articleId}.epub`));
// The daily ceiling.
const spent = fakeEnv({ budget: 0 });
assert.equal((await handle(request("/api/shelf/opds"), spent)).status, 429);
assert.equal(spent.SHELF.ops, 0);
assert.ok(await sameSecret("a:b", "a:b"));
assert.ok(!(await sameSecret("a:b", "a:c")));
assert.equal(basicCredentials("Basic " + btoa("\u00e7:p:q".replace(/./g, (c) => String.fromCharCode(...encoder.encode(c))))), "\u00e7:p:q");

// ---- 4. upload validation ----

const upload = async (bytes, name = "book.epub", e = env) => {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "application/epub+zip" }), name);
  const encoded = new Response(form); // as a browser sends it: a multipart body with its length
  const body = await encoded.arrayBuffer();
  const headers = { accept: "application/json", "content-type": encoded.headers.get("content-type"), "content-length": String(body.byteLength) };
  return handle(request("/api/shelf/upload", { method: "POST", body, headers }), e);
};

// An EPUB as other tools write it: deflated entries, OPF in a subfolder, an EPUB 2 cover meta.
async function deflatedZip(files) {
  const stored = [];
  for (const file of files) {
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    if (file.name === "mimetype") stored.push({ ...file, data, method: 0, packed: data });
    else stored.push({ ...file, data, method: 8, packed: new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer()) });
  }
  // Reuse the stored writer for the layout, then patch method and sizes.
  const out = zip(stored.map((f) => ({ name: f.name, data: f.packed })));
  const view = new DataView(out.buffer);
  for (const [name, entry] of readZip(out)) {
    const f = stored.find((s) => s.name === name);
    view.setUint16(entry.offset + 8, f.method, true);
    view.setUint32(entry.offset + 14, crc32(f.data), true);
    view.setUint32(entry.offset + 22, f.data.length, true);
  }
  let at = out.length - 22 - [...readZip(out).keys()].reduce((n, k) => n + 46 + encoder.encode(k).length, 0);
  for (const f of stored) {
    view.setUint16(at + 10, f.method, true);
    view.setUint32(at + 16, crc32(f.data), true);
    view.setUint32(at + 24, f.data.length, true);
    at += 46 + encoder.encode(f.name).length;
  }
  return out;
}
const CONTAINER = `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
const OPF = `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>K\u00fcrk Mantolu Madonna</dc:title><dc:creator opf:role="aut">Sabahattin Ali</dc:creator><dc:language>tr</dc:language><meta name="cover" content="cov"/></metadata><manifest><item id="cov" href="../Images/c%C3%B6ver.jpg" media-type="image/jpeg"/><item id="t" href="t.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="t"/></spine></package>`;
const book = (extra = [], opf = OPF) =>
  deflatedZip([
    { name: "mimetype", data: "application/epub+zip" },
    { name: "META-INF/container.xml", data: CONTAINER },
    { name: "OPS/package.opf", data: opf },
    { name: "OPS/t.xhtml", data: "<html><body><p>Hi</p></body></html>" },
    { name: "Images/c\u00f6ver.jpg", data: JPEG },
    ...extra,
  ]);

const info = await inspectEpub(await book());
assert.equal(info.title, "K\u00fcrk Mantolu Madonna");
assert.equal(info.author, "Sabahattin Ali");
assert.equal(info.cover.type, "image/jpeg");
assert.deepEqual(info.cover.bytes, JPEG);
const uploaded = await upload(await book());
assert.equal(uploaded.status, 200, await uploaded.clone().text());
const uploadedId = (await uploaded.json()).id;
assert.equal(env.SHELF.objects.get(`items/${uploadedId}.epub`).customMetadata.kind, "book");
assert.ok(env.SHELF.objects.has(`covers/${uploadedId}`));

const expectUpload = async (bytes, status, error) => {
  const response = await upload(bytes);
  assert.equal(response.status, status, error);
  assert.equal((await response.json()).error, error);
};
await expectUpload(encoder.encode("<html>not a book</html>".repeat(10)), 415, "not-epub");
await expectUpload(new Uint8Array(0), 400, "missing");
await expectUpload(zip([{ name: "a.txt", data: "x".repeat(200) }]), 415, "not-epub"); // a zip, not an EPUB
await expectUpload(zip([{ name: "mimetype", data: "application/zip" }, { name: "x", data: "x".repeat(200) }]), 415, "not-epub");
await expectUpload(await book([], OPF.replace("<package", "<pkg").replace("</package>", "</pkg>")), 415, "not-epub");
await expectUpload((await book()).subarray(0, 400), 415, "not-epub"); // truncated
await expectUpload(await book([{ name: "META-INF/rights.xml", data: "<rights/>" }]), 415, "drm");
await expectUpload(await book([{ name: "META-INF/encryption.xml", data: '<encryption><EncryptedData><EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/></EncryptedData></encryption>' }]), 415, "drm");
assert.equal((await upload(await book([{ name: "META-INF/encryption.xml", data: '<encryption><EncryptedData><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></EncryptedData></encryption>' }]))).status, 200, "font obfuscation is not DRM");
const tooBig = await handle(request("/api/shelf/upload", { method: "POST", body: "x", headers: { "content-length": String(30 << 20), accept: "application/json" } }), env);
assert.equal(tooBig.status, 413);
// A body without a declared length is refused before it is read.
const unsized = await handle(request("/api/shelf/upload", { method: "POST", body: new Blob([await book()]).stream(), headers: { accept: "application/json" } }), env);
assert.equal(unsized.status, 411);
assert.equal((await unsized.json()).error, "length");
// A zip bomb: a small entry claiming to unpack far past the cap is refused before inflating.
await expectUpload(await book([], OPF.padEnd(OPF.length + (2 << 20), " ")), 415, "not-epub");

// ---- 5. the feeds, as the reader parses them ----

const nav = readerParse(navigationFeed());
assert.deepEqual(nav.entries.map((e) => [e.type, e.href]), [["navigation", "/api/shelf/opds/all"], ["navigation", "/api/shelf/opds/articles"], ["navigation", "/api/shelf/opds/books"]]);

const feedResponse = await handle(request("/api/shelf/opds/all"), env);
assert.match(feedResponse.headers.get("content-type"), /^application\/atom\+xml;profile=opds-catalog;kind=acquisition/);
const all = readerParse(await feedResponse.text());
assert.equal(all.entries.length, 3); // the article and two uploads
assert.ok(all.entries.every((e) => e.type === "book" && /^\/api\/shelf\/file\/\d{13}-[0-9a-f]{8}\.epub$/.test(e.href)));
assert.deepEqual(
  all.entries.map((e) => e.title).slice(-1),
  ["On Reading & Paper"],
  "newest first, so the first thing added is last",
);
assert.equal(all.entries.at(-1).author, "Ada Writer");
assert.equal(all.entries.at(-1).cover, `/api/shelf/cover/${articleId}`);
assert.equal(readerParse(await (await handle(request("/api/shelf/opds/articles"), env)).text()).entries.length, 1);
assert.equal(readerParse(await (await handle(request("/api/shelf/opds/books"), env)).text()).entries.length, 2);

// Paging: 130 items is three pages of 60, linked by rel="next", within the reader's 62.
const many = Array.from({ length: 130 }, (_, i) => ({ id: `${String(i).padStart(13, "0")}-0000000${i % 10}`, title: `Item <${i}> & "co"`, author: "", kind: "book", site: "", date: "", source: "", added: "2026-11-18T00:00:00Z", cover: "", size: 1 }));
const page1 = readerParse(acquisitionFeed("all", many.slice(0, 60), "60"));
assert.equal(page1.entries.length, 60);
assert.equal(page1.entries[0].title, 'Item <0> & "co"');
assert.equal(page1.next, "/api/shelf/opds/all?cursor=60");
assert.equal(readerParse(acquisitionFeed("all", many.slice(120), null)).next, "");

// Downloads: the whole file, and a resumed range.
const download = await handle(request(`/api/shelf/file/${articleId}.epub`), env);
assert.equal(download.status, 200);
assert.equal(download.headers.get("content-type"), "application/epub+zip");
assert.match(download.headers.get("content-disposition"), /^attachment; filename="Ada Writer - On Reading & Paper.epub"/);
assert.deepEqual(new Uint8Array(await download.arrayBuffer()), stored.bytes);
const part = await handle(request(`/api/shelf/file/${articleId}.epub`, { headers: { range: "bytes=0-3" } }), env);
assert.equal(part.status, 206);
assert.equal(part.headers.get("content-range"), `bytes 0-3/${stored.size}`);
assert.deepEqual([...new Uint8Array(await part.arrayBuffer())], [0x50, 0x4b, 3, 4]);
assert.equal((await handle(request("/api/shelf/file/0000000000000-00000000.epub"), env)).status, 404);
assert.equal((await handle(request("/api/shelf/file/../../etc.epub"), env)).status, 404);

// The page lists everything, escaped, and deleting removes the file and its cover.
const page = await handle(request("/api/shelf/?m=added&url=" + encodeURIComponent("https://example.com/x\"><script>")), env);
const pageHtml = await page.text();
assert.match(page.headers.get("content-security-policy"), /default-src 'none'/);
assert.ok(pageHtml.includes("On Reading &amp; Paper") && pageHtml.includes("Added to the shelf.") && !pageHtml.includes("<script>"));
assert.ok(!/\u2014/.test(pageHtml), "no em dashes");
const deleted = await handle(request("/api/shelf/delete", { method: "POST", headers: { origin: "https://busahin.com", "content-type": "application/x-www-form-urlencoded" }, body: `id=${articleId}` }), env);
assert.equal(deleted.status, 303);
assert.equal(deleted.headers.get("location"), "/api/shelf/?m=deleted");
assert.ok(!env.SHELF.objects.has(`items/${articleId}.epub`) && !env.SHELF.objects.has(`covers/${articleId}`));

// ---- 6. time on a large page ----
// Extraction and packing are the only CPU-heavy work (fetching waits, and waiting
// is free). The free plan allows 10 ms of CPU per request.
const bigPage = `<html><head><title>Long</title>${"<script>" + "x".repeat(200000) + "</script>"}</head><body><nav>${"<a href=/>link</a>".repeat(2000)}</nav><article>${Array.from({ length: 1500 }, (_, i) => `<div class="para"><p class="x" data-a="1">${paragraph(i)} <a href="/n${i}">a <em>link</em></a></p></div>`).join("")}</article>${'<div class="comment"><p>comment</p></div>'.repeat(2000)}</body></html>`;
const pictures = Array.from({ length: LIMITS.images + 1 }, (_, n) => ({ src: `https://example.com/${n}.jpg`, name: `images/${n}.jpg`, type: "image/jpeg", bytes: new Uint8Array(LIMITS.imageBytes).fill(n) }));
const images = new Map(pictures.slice(1).map((p) => [p.src, p]));
const runs = [];
for (let i = 0; i < 7; i++) {
  const start = performance.now();
  const a = extract(bigPage, new URL("https://example.com/long"));
  buildEpub({ ...a, id: "x", date: "2026-11-18", source: "https://example.com/long", blocks: [...a.blocks, ...[...images.keys()].map((src) => ({ kind: "img", src, alt: "" }))], images, cover: pictures[0] });
  runs.push(performance.now() - start);
}
console.log(
  `extract and pack a ${(bigPage.length / 1024 / 1024).toFixed(1)} MB page with a cover and ${LIMITS.images} pictures of ${LIMITS.imageBytes >> 10} KB: ` +
    `first run ${runs[0].toFixed(1)} ms, then ${Math.min(...runs.slice(1)).toFixed(1)} ms (Node ${process.version}; the free plan allows 10 ms)`,
);

console.log("shelf checks pass");
