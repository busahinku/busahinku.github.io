import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";

// Share cards (1200 x 630) for posts, projects and courses, set in the site's
// own Merriweather. The text is turned into outlines here with opentype.js, so
// the card comes out identical on any machine: no system fonts are involved.
// Fonts: src/assets/og/fonts (OFL, the static cuts TeX Live ships).

// Paths from the project root: the build bundles this module elsewhere.
const fromRoot = (...p) => path.join(process.cwd(), ...p);
const font = (file) => opentype.parse(fs.readFileSync(fromRoot("src/assets/og/fonts", file)).buffer);
const bold = font("Merriweather-Bold.otf");
const regular = font("Merriweather-Regular.otf");
const signature = fs.readFileSync(fromRoot("public/signature.svg"), "utf8");

const W = 1200;
const H = 630;
const X = 80;
const MEASURE = W - 2 * X;

// Greedy word wrap by real glyph widths; the last allowed line gets an ellipsis.
function wrap(face, text, size, maxLines) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (face.getAdvanceWidth(next, size) <= MEASURE || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = `${kept[maxLines - 1]}…`;
  while (face.getAdvanceWidth(last, size) > MEASURE && last.length > 2) last = `${last.slice(0, -2)}…`;
  kept[maxLines - 1] = last;
  return kept;
}

const outline = (face, text, x, y, size, fill) =>
  `<path fill="${fill}" d="${face.getPath(text, x, y, size).toPathData(1)}"/>`;

/** @param {{ kind: string, title: string, description?: string }} card */
export async function shareCard({ kind, title, description = "" }) {
  // The longest titles step down a size rather than spill past three lines.
  const size = [68, 58, 50].find((s) => wrap(bold, title, s, 9).length <= 3) ?? 50;
  const titleLines = wrap(bold, title, size, 3);
  const lead = size * 1.18;
  const titleTop = 200;
  const descTop = titleTop + (titleLines.length - 1) * lead + 64;
  const descLines = wrap(regular, description, 28, 2);

  const parts = [
    `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
    outline(regular, "busahin.com", X, 112, 26, "#64748b"),
    ...titleLines.map((line, i) => outline(bold, line, X, titleTop + i * lead, size, "#0f172a")),
    ...descLines.map((line, i) => outline(regular, line, X, descTop + i * 42, 28, "#475569")),
    outline(regular, kind, W - X - regular.getAdvanceWidth(kind, 26), H - 72, 26, "#64748b"),
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join("")}</svg>`;

  // The handwritten signature from the homepage, bottom left.
  const sign = await sharp(Buffer.from(signature.replace("<svg ", '<svg fill="#0f172a" ')))
    .resize({ height: 64 })
    .png()
    .toBuffer();
  return sharp(Buffer.from(svg))
    .composite([{ input: sign, left: X, top: H - 72 - 50 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
