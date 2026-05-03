/**
 * Optimize deck images in dist/ after build, before PDF generation.
 * Resizes to max 1920px and compresses JPEG/PNG.
 * Runs on dist/deck/ so source files in public/ are untouched.
 */
import sharp from "sharp";
import { readdirSync, statSync, renameSync, unlinkSync } from "node:fs";
import { join, extname, relative } from "node:path";

const DECK_DIR = new URL("../dist/deck", import.meta.url).pathname;
const MAX_DIM = 1920;
const JPEG_QUALITY = 82;
const PNG_QUALITY = 80;
const MIN_SIZE = 100 * 1024;

function walk(dir) {
  const files = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (/\.(png|jpe?g)$/i.test(e.name)) files.push(full);
  }
  return files;
}

async function optimize(file) {
  const stat = statSync(file);
  if (stat.size < MIN_SIZE) return null;

  const ext = extname(file).toLowerCase();
  const tmp = file + ".tmp";

  let pipeline = sharp(file).resize(MAX_DIM, MAX_DIM, {
    fit: "inside",
    withoutEnlargement: true,
  });

  if (ext === ".png") {
    await pipeline.png({ quality: PNG_QUALITY, effort: 6 }).toFile(tmp);
  } else {
    await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmp);
  }

  const newStat = statSync(tmp);
  if (newStat.size < stat.size) {
    renameSync(tmp, file);
    return { before: stat.size, after: newStat.size };
  }
  unlinkSync(tmp);
  return null;
}

const files = walk(DECK_DIR);
let totalBefore = 0;
let totalAfter = 0;
let count = 0;

for (const file of files) {
  const result = await optimize(file);
  if (result) {
    totalBefore += result.before;
    totalAfter += result.after;
    count++;
  }
}

if (count > 0) {
  const saved = ((1 - totalAfter / totalBefore) * 100).toFixed(0);
  console.log(
    `optimized ${count} images: ${(totalBefore / 1048576).toFixed(0)}MB → ${(totalAfter / 1048576).toFixed(0)}MB (-${saved}%)`,
  );
} else {
  console.log("all deck images already optimized");
}
