// Adds a photograph without its weight landing in git:
//   npm run photo -- <original.jpg> [name]
// The full-quality original goes to R2 for the detail view; a 2400px working
// copy goes to src/assets/photos for the wall, which Astro turns into WebP.
// Prints the photos.ts entry to paste.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { upload, FOREVER } from "./r2.mjs";

const [input, given] = process.argv.slice(2);
if (!input || !fs.existsSync(input)) {
  console.error("usage: npm run photo -- <original.jpg> [name]");
  process.exit(1);
}
const name = (given ?? path.parse(input).name).replace(/[^A-Za-z0-9-]+/g, "-");
// Read it all now: the working copy may overwrite the input path.
const source = fs.readFileSync(input);
const meta = await sharp(source).metadata();
const original = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "photo-")), `${name}.jpg`);

// A JPEG is rewritten losslessly: jpegtran keeps the pixels and the colour
// profile, drops every other metadata block (GPS location included), and bakes
// in the EXIF rotation that dropping it would lose. A rotation may trim up to
// 15px of partial blocks at one edge. Other formats become a 4:4:4 JPEG at q95.
const ROTATE = {
  2: ["-flip", "horizontal"],
  3: ["-rotate", "180"],
  4: ["-flip", "vertical"],
  5: ["-transpose"],
  6: ["-rotate", "90"],
  7: ["-transverse"],
  8: ["-rotate", "270"],
};
if (meta.format === "jpeg") {
  execFileSync("jpegtran", ["-copy", "icc", "-optimize", "-trim", ...(ROTATE[meta.orientation] ?? []), "-outfile", original, input]);
} else {
  await sharp(source).rotate().keepIccProfile().jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toFile(original);
}
const { bytes } = upload(`photos/${name}.jpg`, original, "image/jpeg", FOREVER);

// Every rendition the site makes is 2000px or smaller, so 2400px loses nothing.
const copy = `src/assets/photos/${name}.jpg`;
await sharp(source)
  .rotate()
  .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(copy);

console.log(`original: photos/${name}.jpg on R2 (${(bytes / 1048576).toFixed(1)} MB)`);
console.log(`wall copy: ${copy} (${(fs.statSync(copy).size / 1048576).toFixed(1)} MB)\n`);
console.log(`Add to src/data/photos.ts:\n
import photo_${name.replace(/\W/g, "_")} from '../assets/photos/${name}.jpg';

  {
    src: photo_${name.replace(/\W/g, "_")},
    original: 'photos/${name}.jpg',
    alt: '',
    caption: { en: '', tr: '' },
    place: '',
    taken: '',
  },`);
