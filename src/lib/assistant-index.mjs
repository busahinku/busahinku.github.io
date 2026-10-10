import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { fromHtml } from "hast-util-from-html";

/**
 * After the build, cut every English page into sections (one per h2/h3) and
 * write them to /assistant-index.json. The site assistant (workers/assistant)
 * answers only from these sections, so it knows exactly what the site says
 * and nothing else. Math keeps its TeX source; navigation, buttons and
 * comments are left out.
 */
export function assistantIndex() {
  return {
    name: "assistant-index",
    hooks: {
      "astro:build:done": ({ dir, pages }) => {
        const root = fileURLToPath(dir);
        const chunks = [];
        for (const { pathname } of pages) {
          if (/^(tr\/|photos|404|rss)/.test(pathname)) continue;
          const file = `${root}${pathname}index.html`;
          if (!fs.existsSync(file)) continue;
          chunks.push(...sections(`/${pathname}`, fs.readFileSync(file, "utf8")));
        }
        fs.writeFileSync(`${root}assistant-index.json`, JSON.stringify({ c: chunks }));
      },
    },
  };
}

const SKIP = new Set(["script", "style", "nav", "button", "svg", "form", "noscript", "template", "header"]);
const SKIP_CLASS = /\b(toc|post-engagement|comment|share-row|post-nav|heading-anchor|reading-progress|skip-link)/;
const BREAK = new Set(["p", "li", "tr", "h1", "h2", "h3", "h4", "figcaption", "blockquote", "pre", "div", "dt", "dd"]);
const MAX = 1400;

function sections(url, html) {
  const tree = fromHtml(html);
  const title = textOf(find(tree, (n) => n.tagName === "title")).replace(/\s*\|.*$/, "").trim();
  const main = find(tree, (n) => n.properties?.id === "main-content") ?? find(tree, (n) => n.tagName === "main");
  if (!main) return [];

  const out = [];
  let week = ""; // the h2 a section sits under, so "Week 3" finds all of week 3
  let heading = "";
  let anchor = "";
  let buffer = "";
  const flush = () => {
    const text = buffer.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
    for (let i = 0; i < text.length; i += MAX) {
      out.push([`${url}${anchor ? `#${anchor}` : ""}`, heading ? `${title}: ${heading}` : title, text.slice(i, i + MAX)]);
    }
    buffer = "";
  };

  const walk = (node) => {
    if (node.type === "text") {
      buffer += node.value;
      return;
    }
    if (node.type !== "element" || SKIP.has(node.tagName)) return;
    const cls = [].concat(node.properties?.className ?? []).join(" ");
    if (SKIP_CLASS.test(cls)) return;
    if (/\bkatex\b/.test(cls)) {
      // KaTeX keeps its source in a MathML annotation; the rest is layout.
      const tex = find(node, (n) => n.tagName === "annotation");
      buffer += tex ? ` $${textOf(tex)}$ ` : "";
      return;
    }
    if ((node.tagName === "h2" || node.tagName === "h3") && node.properties?.id) {
      flush();
      const text = textOf(node).replace(/#$/, "").trim();
      if (node.tagName === "h2") week = text;
      heading = node.tagName === "h3" && week ? `${week}: ${text}` : text;
      anchor = node.properties.id;
      return;
    }
    if (BREAK.has(node.tagName)) buffer += "\n";
    node.children?.forEach(walk);
    if (BREAK.has(node.tagName)) buffer += "\n";
  };
  walk(main);
  flush();
  return out;
}

function find(node, test) {
  if (test(node)) return node;
  for (const child of node.children ?? []) {
    const hit = find(child, test);
    if (hit) return hit;
  }
  return null;
}

function textOf(node) {
  if (!node) return "";
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}
