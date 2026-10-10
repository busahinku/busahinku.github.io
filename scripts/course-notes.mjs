// Course notes pipeline. One source, two outputs:
//   src/content/courses/<slug>.mdx  is the web page (Astro renders it)
//                                   and becomes the typeset notes.pdf here.
// Both PDFs go to R2 (scripts/r2.mjs), not the repo.
//
//   npm run notes -- pages <slug> <export.pdf>
//     Uploads a compressed copy of the handwritten export and renders only the
//     pages that are new or changed since the last build, so transcription never
//     re-reads a page it has already done.
//   npm run notes -- build <slug>
//     Compiles figures and the LaTeX notes, uploads the PDF, then records the
//     pages as done.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import yaml from "js-yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { upload } from "./r2.mjs";

const [cmd, slug, exportPdf] = process.argv.slice(2);
const mdxPath = `src/content/courses/${slug}.mdx`;
const pagesPath = `src/content/courses/${slug}.pages`;
const assetDir = `src/assets/courses/${slug}`;
const cache = `node_modules/.cache/course-notes/${slug}`;

const run = (bin, args, opts = {}) =>
  execFileSync(bin, args.map(String), { stdio: ["ignore", "pipe", "pipe"], ...opts });
const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

async function pages() {
  if (!exportPdf || !fs.existsSync(exportPdf)) die("usage: npm run notes -- pages <slug> <export.pdf>");
  fs.rmSync(`${cache}/pages`, { recursive: true, force: true });
  fs.mkdirSync(`${cache}/pages`, { recursive: true });
  // Readers get the compressed copy. Hashes always come from the raw export:
  // recompressing a compressed file shifts pixels and would flag every page.
  const served = `${cache}/handwritten.pdf`;
  try {
    run("gs", ["-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite", "-dPDFSETTINGS=/ebook", "-dOmitInfoDate", "-dOmitID", "-dOmitXMP", `-sOutputFile=${served}`, exportPdf]);
    if (fs.statSync(served).size >= fs.statSync(exportPdf).size) fs.copyFileSync(exportPdf, served);
  } catch {
    fs.copyFileSync(exportPdf, served);
  }
  upload(`courses/${slug}/handwritten.pdf`, served, "application/pdf", undefined, { pages: pageCount(served) });

  // A tiny grayscale render per page is enough to notice any added stroke.
  run("pdftoppm", ["-r", 40, "-gray", exportPdf, `${cache}/pages/h`]);
  const thumbs = fs.readdirSync(`${cache}/pages`).filter((f) => f.startsWith("h-")).sort();
  const hashes = thumbs.map((f) =>
    createHash("sha1").update(fs.readFileSync(`${cache}/pages/${f}`)).digest("hex").slice(0, 16),
  );
  const known = fs.existsSync(pagesPath) ? fs.readFileSync(pagesPath, "utf8").split("\n").filter(Boolean) : [];
  const todo = hashes.flatMap((h, i) => (h === known[i] ? [] : [i + 1]));
  fs.writeFileSync(`${cache}/pending`, hashes.join("\n") + "\n");

  // Pages to read: 120 dpi keeps small annotations legible, and trimming the
  // empty paper around the writing is what keeps half-empty pages cheap.
  const images = [];
  for (const p of todo) {
    const raw = `${cache}/pages/raw`;
    run("pdftoppm", ["-r", 120, "-png", "-singlefile", "-f", p, "-l", p, exportPdf, raw]);
    const out = `${cache}/pages/p${String(p).padStart(2, "0")}.jpg`;
    await sharp(`${raw}.png`).trim({ threshold: 40 }).jpeg({ quality: 82 }).toFile(out);
    images.push(out);
  }

  console.log(`${slug}: ${hashes.length} pages in the export, ${known.length} done before.`);
  const fresh = todo.filter((p) => p > known.length);
  const changed = todo.filter((p) => p <= known.length);
  if (fresh.length) console.log(`new:     ${fresh.join(", ")}`);
  if (changed.length) console.log(`changed: ${changed.join(", ")}`);
  if (hashes.length < known.length) console.log(`removed: pages ${hashes.length + 1} to ${known.length} are gone from the export`);
  console.log(images.length ? `read only these:\n${images.join("\n")}` : "nothing new to transcribe");
}

function build() {
  if (!fs.existsSync(mdxPath)) die(`no ${mdxPath}`);
  const [, front, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(fs.readFileSync(mdxPath, "utf8")) ?? die("missing frontmatter");
  const meta = yaml.load(front);
  const tex = path.resolve(cache, "tex");
  fs.mkdirSync(tex, { recursive: true });

  // Figures: one TikZ source gives the PDF the notes include and the SVG the page shows.
  for (const f of fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : []) {
    if (!f.endsWith(".tex")) continue;
    const name = f.slice(0, -4);
    latex(["-pdf", `-outdir=${tex}`, path.resolve(assetDir, f)], `${tex}/${name}.log`);
    run("pdftocairo", ["-svg", `${tex}/${name}.pdf`, `${assetDir}/${name}.svg`]);
  }

  const [, code = "", name = meta.title] = /^([A-Z]{2,}\s?\d{3,}[A-Z]?):\s*(.+)$/.exec(meta.title) ?? [];
  const date = new Date(meta.updatedDate ?? meta.pubDate);
  const fill = {
    title: esc(meta.title),
    code: esc(code),
    name: esc(name),
    author: esc(meta.author ?? "Burak Sahin Kucuk"),
    term: term(new Date(meta.pubDate)),
    updated: date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
    url: `https://busahin.com/courses/${slug}/`,
    site: `busahin.com/courses/${slug}`,
    // Same course, same cover art: the random walks are seeded from the slug.
    seed: [...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 99991, 7),
    body: toLatex(body),
  };
  fill.lists = fill.body.includes("\\begin{definition}")
    ? "\\listoftheorems[ignoreall, show={definition}, title={Definitions}]"
    : "";
  fill.summary = summary.some((w) => w.defs.length || w.keys.length)
    ? `\\notessummary{\n${summary
        .filter((w) => w.defs.length || w.keys.length)
        .map((w) =>
          [
            `\\notessummaryweek{${w.title}}`,
            ...w.defs.map((d) => `\\notessummarydef{${d.title}}{${d.content}}`),
            w.keys.length ? `\\begin{itemize}\n${w.keys.map((k) => `\\item ${k}`).join("\n")}\n\\end{itemize}` : "",
          ].join("\n"),
        )
        .join("\n\n")}\n}`
    : "";
  fill.answers = answers.length
    ? `\\notesanswers{\n${answers.map((a) => `\\notesanswer{${a.id}}{${a.answer}}`).join("\n")}\n}`
    : "";
  const template = fs.readFileSync("scripts/course-notes.tex", "utf8");
  fs.writeFileSync(`${tex}/notes.tex`, template.replace(/<<(\w+)>>/g, (_, k) => fill[k]));
  // Stamp the PDF with the notes' own date, not the build time, so an unchanged
  // course builds to the same bytes and is not uploaded again.
  process.env.SOURCE_DATE_EPOCH = String(Math.floor(date.getTime() / 1000));
  process.env.FORCE_SOURCE_DATE = "1";
  latex(["-lualatex", "notes.tex"], `${tex}/notes.log`, tex);
  const { bytes } = upload(`courses/${slug}/notes.pdf`, `${tex}/notes.pdf`, "application/pdf", undefined, {
    pages: pageCount(`${tex}/notes.pdf`),
  });

  if (fs.existsSync(`${cache}/pending`)) fs.renameSync(`${cache}/pending`, pagesPath);
  console.log(`${tex}/notes.pdf (${Math.round(bytes / 1024)} KB), uploaded`);
}

function pageCount(pdf) {
  return Number(/Pages:\s+(\d+)/.exec(run("pdfinfo", [pdf]).toString())?.[1]) || undefined;
}

function latex(args, log, cwd) {
  try {
    // kaobook is vendored in scripts/kaobook, and an optional scripts/cover-logo.pdf
    // is found the same way.
    const env = { ...process.env, TEXINPUTS: `${path.resolve("scripts")}//:` };
    run("latexmk", ["-interaction=nonstopmode", "-halt-on-error", "-quiet", "-bibtex-", ...args], { cwd, env });
  } catch {
    // Print the first TeX error with a little context instead of the whole log.
    const lines = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\n") : [];
    const at = lines.findIndex((l) => l.startsWith("!"));
    die(`LaTeX failed, ${log}:\n${(at < 0 ? lines.slice(-20) : lines.slice(at, at + 8)).join("\n")}`);
  }
}

// METU terms: fall runs September to January, spring February to June.
function term(d) {
  const m = d.getUTCMonth() + 1;
  const y = d.getUTCFullYear();
  return m === 1 ? `Fall ${y - 1}` : m >= 9 ? `Fall ${y}` : m <= 6 ? `Spring ${y}` : `Summer ${y}`;
}

// ---------------------------------------------------------------------------
// MDX to LaTeX. Covers what CONTENT-GUIDE.md allows in course notes; anything
// else is reported and left out of the PDF rather than guessed at.

const CALLOUT_ENV = {
  definition: "definition",
  example: "example",
  tip: "keyidea",
  warning: "caution",
  danger: "caution",
  note: "aside",
  info: "aside",
  success: "aside",
};

let footnotes = new Map();
// Gathered while converting: each week's key ideas (repeated in a recap before
// its exercises) and every exercise answer (printed at the back of the book).
let recap = [];
let answers = [];
// Every week's definitions and key points again, for the summary sheet.
let summary = [];

function toLatex(source) {
  const tree = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkMath).parse(source);
  footnotes = new Map(tree.children.filter((n) => n.type === "footnoteDefinition").map((n) => [n.identifier, n]));
  recap = [];
  answers = [];
  summary = [];
  const body = blocks(tree.children);
  return [body, flushRecap()].filter(Boolean).join("\n\n");
}

function blocks(nodes) {
  return nodes.map(node).filter(Boolean).join("\n\n");
}

function inline(nodes) {
  return nodes.map(node).join("");
}

function plain(n) {
  return n.value ?? (n.children ?? []).map(plain).join("");
}

function esc(s) {
  const special = { "\\": "\\textbackslash{}", "^": "\\textasciicircum{}", "~": "\\textasciitilde{}" };
  return s
    .replace(/(^|[\s([{])"/g, "$1\u201c")
    .replace(/"/g, "\u201d")
    .replace(/(^|[\s([{])'/g, "$1\u2018")
    .replace(/'/g, "\u2019")
    .replace(/[\\{}$&#^_%~]/g, (c) => special[c] ?? `\\${c}`);
}

// ==marked== text, the same syntax the site's remarkMark turns into <mark>.
function text(value) {
  return value
    .split(/==([^=]+)==/g)
    .map((part, i) => (i % 2 ? `\\notesmark{${esc(part)}}` : esc(part)))
    .join("");
}

function attrs(n) {
  return Object.fromEntries(
    n.attributes.filter((a) => a.type === "mdxJsxAttribute").map((a) => [a.name, typeof a.value === "string" ? a.value : ""]),
  );
}

function node(n) {
  switch (n.type) {
    case "text":
      return text(n.value);
    case "strong": {
      // A short bold phrase is a term being introduced: it goes in the index.
      const term = plain(n).trim();
      const indexed = /^[\p{L}\p{N}' -]{2,40}$/u.test(term) && term.split(/\s+/).length <= 4;
      return `\\textbf{${inline(n.children)}}${indexed ? `\\index{${term.toLowerCase()}}` : ""}`;
    }
    case "emphasis":
      return `\\emph{${inline(n.children)}}`;
    case "delete":
      return `\\notesstrike{${inline(n.children)}}`;
    case "inlineCode":
      return `\\texttt{${esc(n.value)}}`;
    case "inlineMath":
      return `$${n.value}$`;
    case "break":
      return "\\newline\n";
    case "link":
      return `\\href{${n.url.replace(/[\\#%]/g, "\\$&")}}{${inline(n.children)}}`;
    case "footnoteReference":
      return `\\footnote{${blocks(footnotes.get(n.identifier)?.children ?? [])}}`;
    case "mdxJsxTextElement":
      return inline(n.children);
    case "paragraph":
      return n.children.length === 1 && n.children[0].type === "image" ? figure(n.children[0]) : inline(n.children);
    case "heading":
      return heading(n);
    case "list":
      return list(n);
    case "table":
      return table(n);
    case "blockquote":
      return `\\begin{quote}\n${blocks(n.children)}\n\\end{quote}`;
    case "code":
      return `\\begin{verbatim}\n${n.value}\n\\end{verbatim}`;
    case "math":
      return `\\[\n${n.value}\n\\]`;
    case "thematicBreak":
      return "\\notesbreak";
    case "image":
      return figure(n);
    case "mdxJsxFlowElement":
      return component(n);
    case "footnoteDefinition":
    case "mdxjsEsm":
    case "html":
      return "";
    default:
      console.warn(`left out of the PDF: ${n.type}`);
      return "";
  }
}

function heading(n) {
  const kids = [...n.children];
  let week = null;
  const first = kids[0];
  const m = first?.type === "text" && /^Week (\d+):\s*/.exec(first.value);
  if (n.depth === 2 && m) {
    week = Number(m[1]);
    kids[0] = { ...first, value: first.value.slice(m[0].length) };
  }
  let title = inline(kids);
  // Math in a heading cannot go into the PDF bookmarks, so give them plain text.
  if (title.includes("$")) title = `\\texorpdfstring{${title}}{${esc(plain({ children: kids }).trim())}}`;
  // The week's key points come before its exercises, or before the next week.
  const before = n.depth <= 2 || /^(check yourself|exercises)/i.test(plain(n)) ? flushRecap() : "";
  const pre = before ? `${before}\n\n` : "";
  // Each template decides what opening a week looks like.
  if (n.depth <= 2) {
    summary.push({ title: week ? `Week~${week}: ${title}` : title, defs: [], keys: [] });
    return pre + (week ? `\\notesweek{${week}}{${title}}` : `\\chapter{${title}}`);
  }
  const cmd = ["section", "subsection", "subsubsection"][n.depth - 3] ?? "paragraph";
  return `${pre}\\${cmd}{${title}}`;
}

function flushRecap() {
  if (!recap.length) return "";
  const out = `\\begin{notesrecap}\n\\begin{itemize}\n${recap.map((r) => `\\item ${r}`).join("\n")}\n\\end{itemize}\n\\end{notesrecap}`;
  recap = [];
  return out;
}

function list(n) {
  const env = n.ordered ? "enumerate" : "itemize";
  const start = n.ordered && n.start > 1 ? `[start=${n.start}]` : "";
  const items = n.children.map((li) => `\\item ${blocks(li.children)}`).join("\n");
  return `\\begin{${env}}${start}\n${items}\n\\end{${env}}`;
}

function table(n) {
  const align = n.align.map((a) => ({ center: "c", right: "r" })[a] ?? "l");
  const rows = n.children.map((r) => r.children.map((c) => inline(c.children)).join(" & ") + " \\\\");
  // Short cells set at their natural width; long ones wrap across the measure.
  const wide = Math.max(...n.children.map((r) => plain(r).length)) > 70;
  const env = wide ? "tabularx" : "tabular";
  const spec = wide ? align.map(() => "L").join("") : align.join("");
  return [
    "\\begin{center}\\small",
    `\\begin{${env}}${wide ? "{\\linewidth}" : ""}{${spec}}`,
    "\\toprule",
    rows[0],
    "\\midrule",
    ...rows.slice(1),
    "\\bottomrule",
    `\\end{${env}}`,
    "\\end{center}",
  ].join("\n");
}

function figure(img) {
  // SVG figures are compiled from a sibling .tex at print size, and that PDF
  // sits next to notes.tex. Anything else is a raster crop, scaled to the measure.
  const svg = img.url.endsWith(".svg");
  const graphic = svg
    ? `\\includegraphics{${path.basename(img.url, ".svg")}}`
    : `\\includegraphics[width=\\linewidth]{${path.resolve(path.dirname(mdxPath), img.url)}}`;
  const caption = img.alt ? `\n\\caption{${text(img.alt)}}` : "";
  return `\\begin{figure}[htbp]\n\\centering\n${graphic}${caption}\n\\end{figure}`;
}

function component(n) {
  const a = attrs(n);
  if (n.name === "Callout") {
    const env = CALLOUT_ENV[a.type ?? "info"] ?? "aside";
    // Definitions and examples keep their label and show the title in brackets;
    // elsewhere the title is the label, so it needs the full stop the label had.
    const numbered = env === "definition" || env === "example";
    const title = a.title && (numbered ? a.title : a.title.replace(/[^.?!:]$/, "$&."));
    const content = blocks(n.children);
    if (env === "keyidea") {
      recap.push(content);
      summary.at(-1)?.keys.push(content);
    }
    if (env === "definition") summary.at(-1)?.defs.push({ title: text(a.title ?? ""), content });
    return `\\begin{${env}}${title ? `[{${text(title)}}]` : ""}\n${content}\n\\end{${env}}`;
  }
  if (n.name === "ConceptCheck") {
    const id = `exercise-${answers.length + 1}`;
    answers.push({ id, answer: blocks(n.children) });
    return `\\begin{notesexercise}{${id}}\n${text(a.question ?? "")}\n\\end{notesexercise}`;
  }
  console.warn(`left out of the PDF: <${n.name}>`);
  return "";
}

if (!slug || !/^[a-z0-9-]+$/.test(slug)) die("usage: npm run notes -- <pages|build> <slug> [export.pdf]");
if (cmd === "pages") await pages();
else if (cmd === "build") build();
else die(`unknown command "${cmd}", expected pages or build`);
