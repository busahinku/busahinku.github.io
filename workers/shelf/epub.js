// EPUB in and out for the shelf, with no dependencies.
// Out: a store-only zip (nothing is compressed, so building one costs a CRC pass
// and a copy, which is what keeps it inside the free plan's CPU allowance).
// In: enough of a zip reader to check an uploaded EPUB and read its title,
// author and cover; deflated entries go through the runtime's DecompressionStream.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

export function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

// files: [{ name, data: string | Uint8Array }], in order. Every entry is stored.
export function zip(files, date = new Date()) {
  const time = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1);
  const day = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(data);
    // The UTF-8 flag on every name but mimetype, which must be plain.
    const flags = file.name === "mimetype" ? 0 : 0x0800;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 10, true);
    local.setUint16(6, flags, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, time, true);
    local.setUint16(12, day, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 10, true);
    entry.setUint16(8, flags, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, time, true);
    entry.setUint16(14, day, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((n, part) => n + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  parts.push(...central, new Uint8Array(end.buffer));

  const out = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

// The central directory as a Map of name -> entry; throws "not-epub" on anything odd.
export function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not-epub");
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  let at = view.getUint32(end + 16, true);
  // 0xffff and 0xffffffff mean ZIP64, which no EPUB under the size cap needs.
  if (count === 0xffff || at === 0xffffffff || at + size > end) throw new Error("not-epub");
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50) throw new Error("not-epub");
    const nameLength = view.getUint16(at + 28, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    entries.set(name, {
      flags: view.getUint16(at + 8, true),
      method: view.getUint16(at + 10, true),
      compressed: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true),
      offset: view.getUint32(at + 42, true),
    });
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return entries;
}

// One entry's bytes, refusing anything larger than `max` once unpacked.
export async function readEntry(bytes, entry, max) {
  if (!entry || entry.size > max || entry.flags & 1) throw new Error("not-epub");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (entry.offset + 30 > bytes.length || view.getUint32(entry.offset, true) !== 0x04034b50) throw new Error("not-epub");
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const data = bytes.subarray(start, start + entry.compressed);
  if (data.length !== entry.compressed) throw new Error("not-epub");
  if (entry.method === 0) return data;
  if (entry.method !== 8) throw new Error("not-epub");
  const chunks = [];
  let total = 0;
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) throw new Error("not-epub");
      chunks.push(value);
    }
  } catch {
    throw new Error("not-epub");
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (all, code) => {
    if (code[0] !== "#") return EXTRA_ENTITIES[code] ?? ENTITIES[code.toLowerCase()] ?? all;
    const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "";
  });
}
// Named typography that turns up in article HTML. Anything else stays as written.
const EXTRA_ENTITIES = {
  mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d",
  laquo: "\u00ab", raquo: "\u00bb", middot: "\u00b7", bull: "\u2022", copy: "\u00a9", reg: "\u00ae", trade: "\u2122",
  times: "\u00d7", deg: "\u00b0", thinsp: "\u2009", ensp: "\u2002", emsp: "\u2003", shy: "",
};

// Text for XML: escaped, and without the control characters XML 1.0 forbids.
export const esc = (text) =>
  String(text ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const tagText = (xml, tag) => {
  const match = xml.match(new RegExp(`<(?:[a-z]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[a-z]+:)?${tag}>`, "i"));
  return match ? decodeEntities(match[1].replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim() : "";
};
const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return match ? decodeEntities(match[2] ?? match[3]) : "";
};

const FONT_OBFUSCATION = new Set(["http://www.idpf.org/2008/embedding", "http://ns.adobe.com/pdf/enc#RC"]);
const COVER_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

// Checks that bytes are a DRM-free EPUB and reads what the catalogue shows.
// Throws Error("not-epub") or Error("drm").
export async function inspectEpub(bytes) {
  if (bytes.length < 100 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) throw new Error("not-epub");
  const entries = readZip(bytes);
  const text = async (name, max = 1 << 20) => decoder.decode(await readEntry(bytes, entries.get(name), max));

  if ((await text("mimetype", 100)).trim() !== "application/epub+zip") throw new Error("not-epub");
  if (entries.has("META-INF/rights.xml") || entries.has("META-INF/license.lcpl")) throw new Error("drm");
  if (entries.has("META-INF/encryption.xml")) {
    const algorithms = [...(await text("META-INF/encryption.xml")).matchAll(/Algorithm\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
    if (algorithms.some((a) => !FONT_OBFUSCATION.has(a))) throw new Error("drm");
  }
  const rootfile = (await text("META-INF/container.xml")).match(/<rootfile\b[^>]*>/i);
  const opfPath = rootfile ? attr(rootfile[0], "full-path") : "";
  if (!opfPath || !entries.has(opfPath)) throw new Error("not-epub");
  const opf = await text(opfPath);
  if (!/<package\b/i.test(opf)) throw new Error("not-epub");

  const items = [...opf.matchAll(/<item\b[^>]*>/gi)].map((m) => ({ id: attr(m[0], "id"), href: attr(m[0], "href"), type: attr(m[0], "media-type"), props: attr(m[0], "properties") }));
  const coverMeta = [...opf.matchAll(/<meta\b[^>]*>/gi)].find((m) => attr(m[0], "name") === "cover");
  const coverItem =
    items.find((item) => /(^|\s)cover-image(\s|$)/.test(item.props)) ?? items.find((item) => coverMeta && item.id === attr(coverMeta[0], "content"));
  let cover = null;
  if (coverItem) {
    const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
    let path = base + coverItem.href;
    try {
      path = decodeURIComponent(path);
    } catch {}
    // Resolve ../ the way a reader would.
    const parts = [];
    for (const part of path.split("/")) part === ".." ? parts.pop() : part !== "." && parts.push(part);
    path = parts.join("/");
    const type = COVER_TYPES[path.split(".").pop().toLowerCase()];
    if (type && entries.has(path)) {
      try {
        cover = { type, bytes: await readEntry(bytes, entries.get(path), 1 << 20) };
      } catch {
        cover = null;
      }
    }
  }
  return { title: tagText(opf, "title"), author: tagText(opf, "creator"), language: tagText(opf, "language"), cover };
}

const STYLE = `body { margin: 0 4%; line-height: 1.5; }
h1 { font-size: 1.6em; line-height: 1.25; margin: 30% 0 0.6em; }
h2, h3, h4 { line-height: 1.3; margin: 1.4em 0 0.4em; }
p { margin: 0 0 0.8em; }
blockquote { margin: 0 0 0.8em 1.2em; font-style: italic; }
pre { white-space: pre-wrap; font-size: 0.85em; }
figure { margin: 1em 0; text-align: center; }
img { max-width: 100%; }
.meta { margin: 0 0 0.3em; }
.caption, .source { font-size: 0.85em; }
.source { margin-top: 2em; border-top: 1px solid; padding-top: 0.6em; }`;

const page = (lang, title, body) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${esc(lang)}" lang="${esc(lang)}">
<head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${body}
</body>
</html>`;

const BLOCK = {
  h: (b) => `<h${b.level}>${esc(b.text)}</h${b.level}>`,
  p: (b) => `<p>${esc(b.text)}</p>`,
  li: (b) => `<p>\u2022 ${esc(b.text)}</p>`,
  quote: (b) => `<blockquote><p>${esc(b.text)}</p></blockquote>`,
  pre: (b) => `<pre>${esc(b.text)}</pre>`,
  caption: (b) => `<p class="caption">${esc(b.text)}</p>`,
};

// article: { id, title, author, site, date (YYYY-MM-DD), lang, source, blocks,
// images: Map(original url -> { name, type, bytes }), cover: { name, type, bytes } | null }
export function buildEpub(article, now = new Date()) {
  const { id, title, author, site, date, lang, source, blocks, images, cover } = article;
  const byline = [author, site].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i);
  const used = [];
  const body = blocks
    .map((block) => {
      if (block.kind !== "img") return BLOCK[block.kind](block);
      const image = images.get(block.src);
      if (!image) return "";
      used.push(image);
      return `<figure><img src="${esc(image.name)}" alt="${esc(block.alt)}"/></figure>`;
    })
    .join("\n");
  const titlePage = page(lang, title, `<h1>${esc(title)}</h1>\n${byline.map((line) => `<p class="meta">${esc(line)}</p>`).join("\n")}\n<p class="meta">${esc(date)}</p>`);
  const text = page(lang, title, `${body}\n<p class="source">Source: <a href="${esc(source)}">${esc(source)}</a></p>`);
  const nav = page(lang, title, `<nav epub:type="toc" id="toc"><ol><li><a href="title.xhtml">${esc(title)}</a></li><li><a href="text.xhtml">Text</a></li></ol></nav>`);
  const media = [...(cover ? [{ ...cover, cover: true }] : []), ...used];
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${esc(lang)}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:uuid:${esc(id)}</dc:identifier>
<dc:title>${esc(title)}</dc:title>
${byline.length ? `<dc:creator>${esc(byline[0])}</dc:creator>` : ""}
${site ? `<dc:publisher>${esc(site)}</dc:publisher>` : ""}
<dc:language>${esc(lang)}</dc:language>
<dc:date>${esc(date)}</dc:date>
<dc:source>${esc(source)}</dc:source>
<meta property="dcterms:modified">${now.toISOString().slice(0, 19)}Z</meta>
${cover ? `<meta name="cover" content="cover"/>` : ""}
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="style" href="style.css" media-type="text/css"/>
<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
<item id="text" href="text.xhtml" media-type="application/xhtml+xml"/>
${media.map((m, i) => `<item id="${m.cover ? "cover" : `img${i}`}" href="${esc(m.name)}" media-type="${m.type}"${m.cover ? ` properties="cover-image"` : ""}/>`).join("\n")}
</manifest>
<spine>
<itemref idref="title"/>
<itemref idref="text"/>
</spine>
</package>`;
  return zip(
    [
      { name: "mimetype", data: "application/epub+zip" },
      {
        name: "META-INF/container.xml",
        data: `<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
      },
      { name: "OEBPS/content.opf", data: opf },
      { name: "OEBPS/nav.xhtml", data: nav },
      { name: "OEBPS/style.css", data: STYLE },
      { name: "OEBPS/title.xhtml", data: titlePage },
      { name: "OEBPS/text.xhtml", data: text },
      ...media.map((m) => ({ name: `OEBPS/${m.name}`, data: m.bytes })),
    ],
    now,
  );
}
