// "Send an article to the reader": fetch a page safely, keep its readable text.
//
// The fetch is guarded because the URL comes from outside: http and https on the
// default ports only, no IP literal or host name that points inside a network,
// every redirect hop checked again, the host's DNS answers checked too, and a
// cap on time and bytes. Workers cannot reach private networks anyway; this is
// the second lock, not the only one.
//
// Extraction is a single pass of a small tag scanner instead of a DOM: a DOM
// for a large page costs more CPU than the free plan's ten milliseconds.
import { decodeEntities } from "./epub.js";

// Images are not re-encoded, only stored, so their bytes are what costs CPU (one
// CRC pass each): a cover and two pictures of up to 300 KB keep it near 1.5 ms.
export const LIMITS = { pageBytes: 2 << 20, imageBytes: 300 << 10, images: 2, hops: 4, imageHops: 2, timeout: 10000 };
const USER_AGENT = "Mozilla/5.0 (compatible; ShelfReader/1.0; +personal e-reader)";

// ---- the guard ----

function ipv4(host) {
  const parts = host.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) < 256)) return null;
  return parts.map(Number);
}

function privateV4([a, b, c]) {
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

// IPv6 in any spelling: expand "::", read an embedded IPv4 tail, then test the prefixes.
function privateV6(host) {
  let text = host.toLowerCase().split("%")[0];
  const tail = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const v4 = ipv4(tail[1]);
    if (!v4) return true;
    text = text.slice(0, -tail[1].length) + ((v4[0] << 8) | v4[1]).toString(16) + ":" + ((v4[2] << 8) | v4[3]).toString(16);
  }
  const [head, rest] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = rest ? rest.split(":") : [];
  if (text.split("::").length > 2) return true;
  const groups = rest === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return true;
  const n = groups.map((g) => parseInt(g, 16));
  if (n.slice(0, 7).every((g) => g === 0)) return true; // :: and ::1
  if (n.slice(0, 5).every((g) => g === 0) && (n[5] === 0xffff || n[5] === 0)) return privateV4([n[6] >> 8, n[6] & 255, n[7] >> 8]); // v4-mapped or -compatible
  if (n[0] === 0x64 && n[1] === 0xff9b) return privateV4([n[6] >> 8, n[6] & 255, n[7] >> 8]); // NAT64
  if (n[0] === 0x2002) return privateV4([n[1] >> 8, n[1] & 255, n[2] >> 8]); // 6to4
  return (n[0] & 0xfe00) === 0xfc00 || (n[0] & 0xffc0) === 0xfe80 || (n[0] & 0xff00) === 0xff00 || (n[0] === 0x2001 && n[1] === 0x0db8) || n[0] === 0x0100;
}

export function privateAddress(address) {
  const v4 = ipv4(address);
  return v4 ? privateV4(v4) : privateV6(address);
}

const BLOCKED_HOST = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|home\.arpa|localdomain|busahin\.com)$/i;

// The URL if it may be fetched, otherwise null. Only the shape is checked here.
export function allowedUrl(input) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return null;
  // An IP literal (WHATWG URL already turned 0x7f.1 and 2130706433 into dotted form).
  if (ipv4(host) || host.includes(":")) return privateAddress(host) ? null : url;
  if (!host.includes(".") || BLOCKED_HOST.test(host)) return null;
  return url;
}

// DNS over HTTPS, so a public-looking name that resolves inside a network is refused too.
export async function dohResolve(host) {
  const ask = async (type) => {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("dns");
    const body = await response.json();
    return (body.Answer ?? []).filter((a) => a.type === 1 || a.type === 28).map((a) => a.data);
  };
  const [a, aaaa] = await Promise.all([ask("A"), ask("AAAA")]);
  return [...a, ...aaaa];
}

async function hostIsPublic(url, resolve, cache) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (ipv4(host) || host.includes(":")) return true; // literals were checked by allowedUrl
  if (!cache.has(host)) cache.set(host, resolve(host).then((addresses) => addresses.length > 0 && !addresses.some(privateAddress), () => false));
  return cache.get(host);
}

// Fetches a URL through the guard. Returns { url, type, bytes } or throws Error(code).
export async function guardedFetch(input, { types, maxBytes, hops, resolve = dohResolve, cache = new Map(), fetcher = fetch, timeout = LIMITS.timeout }) {
  let url = allowedUrl(input);
  const signal = AbortSignal.timeout(timeout);
  for (let hop = 0; ; hop++) {
    if (!url) throw new Error("url");
    if (!(await hostIsPublic(url, resolve, cache))) throw new Error("url");
    let response;
    try {
      response = await fetcher(url.href, {
        redirect: "manual",
        signal,
        headers: { "user-agent": USER_AGENT, accept: types.join(", ") + ", */*;q=0.1" },
      });
    } catch {
      throw new Error(signal.aborted ? "timeout" : "fetch");
    }
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      response.body?.cancel();
      if (hop >= hops) throw new Error("redirects");
      try {
        url = allowedUrl(new URL(response.headers.get("location"), url));
      } catch {
        url = null;
      }
      continue;
    }
    if (!response.ok) {
      response.body?.cancel();
      throw new Error("status");
    }
    const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!types.includes(type)) {
      response.body?.cancel();
      throw new Error("type");
    }
    if (Number(response.headers.get("content-length") || 0) > maxBytes) {
      response.body?.cancel();
      throw new Error("size");
    }
    const chunks = [];
    let total = 0;
    const reader = response.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
          reader.cancel();
          throw new Error("size");
        }
        chunks.push(value);
      }
    } catch (error) {
      throw new Error(error.message === "size" ? "size" : signal.aborted ? "timeout" : "fetch");
    }
    const bytes = new Uint8Array(total);
    let at = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, at);
      at += chunk.length;
    }
    return { url, type, bytes, charset: (response.headers.get("content-type") || "").match(/charset=["']?([\w-]+)/i)?.[1] };
  }
}

// ---- extraction ----

// Skipped whole: the scanner jumps to the matching end tag without reading inside.
const SKIP = new Set(["script", "style", "noscript", "template", "svg", "math", "nav", "aside", "footer", "form", "button", "select", "iframe", "object", "dialog", "canvas", "video", "audio", "textarea"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const TEXT_BLOCKS = { p: "p", li: "li", dd: "p", dt: "p", blockquote: "quote", pre: "pre", figcaption: "caption", h1: "h", h2: "h", h3: "h", h4: "h", h5: "h", h6: "h", td: "p", th: "p" };
// Containers: they end a run of text, and their class or id can mark content or noise.
// Inline tags (a, em, span) are not tracked at all.
const FRAMES = new Set(["div", "section", "article", "main", "header", "ul", "ol", "dl", "table", "tr", "figure", "details", "summary", "address", "center"]);
const CONTENT_HINT = /^(entry-content|post-content|post-body|article-body|article-content|article__body|story-body|content-body|prose|markdown-body|rich-text)$/i;
const NOISE_HINT = /^(?:.*[-_])?(comments?|related|share|sharing|social|newsletter|subscribe|subscription|sidebar|promo|advert|ads?|sponsored|cookie|consent|banner|popup|modal|breadcrumbs?|menu|navbar|nav|footer|masthead|paywall|recirc|more-stories|catlinks|navbox|printfooter)(?:[-_].*)?$/i;

const ATTRS = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
function parseAttrs(text) {
  const attrs = {};
  if (!text) return attrs;
  for (const m of text.matchAll(ATTRS)) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  return attrs;
}
const HINT_ATTRS = /\b(class|id|role|itemprop)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const HIDDEN = /(?:^|\s)hidden(?:[\s=/]|$)|aria-hidden\s*=\s*["']?true/i;

// Tags as an unrolled loop, so a stray quote costs one scan, never a backtracking blow-up.
// Sticky: it is tried only where a "<" is, and a "<" it cannot read is either stray
// text ("a < b") or an opener with no end, where scanning stops (see extract).
const TOKEN = /<[!?][^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)([^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*)>/y;
const OPENER = /<\/?[a-zA-Z]|<[!?]/y;
const RAW = [["<!--", "-->"], ["<![CDATA[", "]]>"]];
const MAX_DEPTH = 256;

// html: string, base: URL. Returns { title, author, site, date, lang, image, blocks }.
// A block is { kind: "p" | "li" | "quote" | "pre" | "caption" | "h", level?, text } or { kind: "img", src, alt }.
export function extract(html, base) {
  const meta = {};
  const stack = []; // open containers: { name, noise, content, article, main }
  let noise = 0, content = 0, inArticle = 0, inMain = 0;
  const blocks = [];
  let textKind = null; // innermost open text block
  let level = 2;
  let buffer = "";
  let firstH1 = "";
  let firstTime = "";

  const flush = () => {
    const raw = textKind === "pre" ? buffer.replace(/^\n+|\s+$/g, "") : buffer.replace(/\s+/g, " ").trim();
    buffer = "";
    if (!raw) return;
    const text = decodeEntities(raw);
    const kind = textKind ?? "p";
    if (kind === "h" && level === 1 && !firstH1) firstH1 = text;
    blocks.push({ kind, level: kind === "h" ? Math.min(Math.max(level, 2), 4) : undefined, text, article: inArticle > 0 || content > 0, main: inMain > 0, noise: noise > 0 });
  };

  // Where the element opened just before `from` ends, counting nested ones of
  // the same name; -1 if it never closes (then nothing is skipped).
  // Script, style and textarea hold raw text, so only their end tag counts.
  const endOf = (name, from) => {
    const raw = name === "script" || name === "style" || name === "textarea";
    const tags = new RegExp(raw ? `<(/)${name}\\s*>` : `<(/?)${name}\\b[^>]*>`, "gi");
    tags.lastIndex = from;
    let depth = 1;
    for (let m; (m = tags.exec(html)); ) {
      if (m[1]) {
        if (--depth === 0) return tags.lastIndex;
      } else if (!m[0].endsWith("/>")) depth++;
    }
    return -1;
  };

  const open = (name, rawAttrs) => {
    const frame = { name, noise: false, content: false, article: name === "article", main: name === "main" };
    if (rawAttrs) {
      for (const m of rawAttrs.matchAll(HINT_ATTRS)) {
        const key = m[1].toLowerCase();
        const value = m[2] ?? m[3] ?? m[4];
        if (key === "role") {
          frame.noise ||= value === "navigation" || value === "complementary";
          frame.main ||= value === "main";
        } else if (key === "itemprop") frame.content ||= value === "articleBody";
        else
          for (const token of value.split(/\s+/)) {
            frame.noise ||= NOISE_HINT.test(token);
            frame.content ||= CONTENT_HINT.test(token);
          }
      }
    }
    stack.push(frame);
    if (frame.noise) noise++;
    if (frame.content) content++;
    if (frame.article) inArticle++;
    if (frame.main) inMain++;
  };
  const close = (name) => {
    const at = stack.findLastIndex((f) => f.name === name);
    if (at < 0) return;
    for (const frame of stack.splice(at)) {
      if (frame.noise) noise--;
      if (frame.content) content--;
      if (frame.article) inArticle--;
      if (frame.main) inMain--;
    }
  };

  // An opener with no end (a comment without "-->", a tag without ">", an element
  // that never closes) swallows the rest of the page in a browser too, so the scan
  // stops there. Retrying from every later "<" instead is quadratic on hostile markup.
  let last = 0;
  let at = 0;
  const stop = (lt) => {
    buffer += html.slice(last, lt);
    last = html.length;
  };
  scan: for (;;) {
    const lt = html.indexOf("<", at);
    if (lt < 0) break;
    for (const [begin, end] of RAW) {
      if (!html.startsWith(begin, lt)) continue;
      const endAt = html.indexOf(end, lt + begin.length);
      if (endAt < 0) {
        stop(lt);
        break scan;
      }
      buffer += html.slice(last, lt);
      last = at = endAt + end.length;
      continue scan;
    }
    TOKEN.lastIndex = lt;
    const match = TOKEN.exec(html);
    if (!match) {
      OPENER.lastIndex = lt;
      if (OPENER.test(html)) {
        stop(lt);
        break;
      }
      at = lt + 1; // a stray "<" in the text
      continue;
    }
    buffer += html.slice(last, lt);
    last = at = TOKEN.lastIndex;
    const [, closing, rawName, rawAttrs] = match;
    if (!rawName) continue; // comment, doctype, CDATA
    const name = rawName.toLowerCase();

    if (closing) {
      if (TEXT_BLOCKS[name]) {
        flush();
        textKind = null;
      } else if (FRAMES.has(name)) {
        flush();
        close(name);
      }
      continue;
    }

    if (name === "title" && !meta.titleTag) {
      const end = html.indexOf("<", last);
      meta.titleTag = decodeEntities(html.slice(last, end < 0 ? html.length : end)).replace(/\s+/g, " ").trim();
    }
    const selfClosing = rawAttrs.endsWith("/");
    if (SKIP.has(name) || (name === "header" && inArticle === 0 && content === 0) || (rawAttrs && HIDDEN.test(rawAttrs))) {
      if (VOID.has(name) || selfClosing) continue;
      flush();
      const end = endOf(name, last);
      if (end < 0) {
        last = html.length;
        break;
      }
      last = at = end;
      continue;
    }

    if (name === "meta" || name === "html" || name === "link" || name === "time") {
      const attrs = parseAttrs(rawAttrs);
      if (name === "meta") {
        const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
        if (key && attrs.content && !(key in meta)) meta[key] = attrs.content.trim();
      } else if (name === "html") meta.lang = attrs.lang || attrs["xml:lang"] || "";
      else if (name === "time") firstTime ||= attrs.datetime || "";
      continue;
    }
    if (name === "br") {
      buffer += textKind === "pre" ? "\n" : " ";
      continue;
    }
    if (name === "img") {
      flush();
      const attrs = parseAttrs(rawAttrs);
      const src = attrs.src && !attrs.src.startsWith("data:") ? attrs.src : attrs["data-src"] || attrs["data-original"] || "";
      const tiny = Number(attrs.width) > 0 && Number(attrs.width) < 40;
      if (src && !tiny) {
        try {
          blocks.push({ kind: "img", src: new URL(src, base).href, alt: attrs.alt || "", article: inArticle > 0 || content > 0, main: inMain > 0, noise: noise > 0 });
        } catch {}
      }
      continue;
    }
    if (TEXT_BLOCKS[name]) {
      flush();
      textKind = TEXT_BLOCKS[name];
      if (textKind === "h") level = Number(name[1]);
      continue;
    }
    if (name === "hr") flush();
    else if (FRAMES.has(name) && !selfClosing) {
      flush();
      // ponytail: deeper containers are ignored, so close() never walks a huge stack; real pages stay far below.
      if (stack.length < MAX_DEPTH) open(name, rawAttrs);
    }
  }
  if (last < html.length) buffer += html.slice(last);
  flush();

  // The article if it has one, then <main>, then the whole body; noise only if
  // nothing else is left.
  const length = (list) => list.reduce((n, b) => n + (b.text?.length ?? 0), 0);
  const choose = (list) => {
    for (const pick of [(b) => b.article, (b) => b.main, () => true]) {
      const chosen = list.filter(pick);
      if (length(chosen) >= 400) return chosen;
    }
    return list;
  };
  let chosen = choose(blocks.filter((b) => !b.noise));
  if (length(chosen) < 400) chosen = choose(blocks);

  const site = (meta["og:site_name"] || base.hostname.replace(/^www\./, "")).slice(0, 120);
  const title = withoutSiteName(meta["og:title"] || meta["twitter:title"] || meta.titleTag || firstH1 || base.hostname, site, base.hostname).slice(0, 200);
  // The page's own h1 repeats the title page; drop it.
  const first = chosen.findIndex((b) => b.kind !== "img");
  if (first >= 0 && chosen[first].kind === "h" && chosen[first].text === (firstH1 || title)) chosen.splice(first, 1);

  const author = [meta.author, meta["article:author"], meta["parsely-author"], meta["dc.creator"], meta["twitter:creator"]].find((a) => a && !/^(https?:|@)/i.test(a)) || "";
  const date = (meta["article:published_time"] || meta["datepublished"] || meta["date"] || meta["dc.date"] || meta["pubdate"] || firstTime || "").slice(0, 10);
  let image = "";
  try {
    if (meta["og:image"]) image = new URL(meta["og:image"], base).href;
  } catch {}
  return {
    title,
    author: author.slice(0, 120),
    site,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    lang: /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(meta.lang || "") ? meta.lang : "en",
    image,
    blocks: chosen.map(({ kind, level, text, src, alt }) => (kind === "img" ? { kind, src, alt } : kind === "h" ? { kind, level, text } : { kind, text })),
  };
}

// "Title | Aeon Essays" and "Title - Wikipedia" lose the site name: anything
// after a pipe if it is short, after a dash only if it names the site.
export function withoutSiteName(title, site, host) {
  const match = title.match(/^(.{12,}?)\s+(\||-|\u2013|\u2014|\u00b7)\s+([^|]{1,40})$/);
  if (!match) return title.trim();
  const squash = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const tail = squash(match[3]);
  const named = tail && (squash(site).includes(tail) || squash(host).includes(tail));
  return match[2] === "|" || named ? match[1].trim() : title.trim();
}

// Text in the page's own encoding (header first, then a <meta charset>).
export function decodeHtml(bytes, charset) {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
  const declared = charset || head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] || "utf-8";
  try {
    return new TextDecoder(declared).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

// JPEG and PNG only, judged by their first bytes rather than what the server says.
export function imageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  return null;
}
