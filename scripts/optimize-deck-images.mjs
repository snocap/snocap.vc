/**
 * Optimize deck images in dist/ after build, before PDF generation.
 *
 * Runs on dist/deck/ only — public/deck/ holds the pristine assets pulled from
 * Claude Design (via DesignSync), so every optimization here is
 * repeatable and a re-pull can never clobber it. Nothing in public/ is touched.
 *
 * Two jobs:
 *
 * 1. Cap resolution. The deck stage is a 1920x1080 canvas, so an asset stored
 *    wider than 1920px cannot show a single extra pixel — it only costs bytes
 *    (the pulled assets run up to 5712px wide).
 *
 * 2. Pick the right codec per image, instead of re-encoding every PNG as a PNG.
 *    The old version ran sharp's `png({ quality })`, which silently turns on
 *    palette quantization — every large PNG, photographs included, was being
 *    crushed to 256 colours. That is a visible loss (banding across skies,
 *    gradients and skin tones) on a deck LPs read full-screen. The choice is
 *    now made from what the image actually contains:
 *
 *      opaque + photographic  -> JPEG (also lets Chrome embed the bytes
 *                                straight into the PDF as DCT, no re-encode)
 *      alpha   + photographic -> WebP (lossy, keeps the alpha channel)
 *      few colours (flat art, -> palette PNG sized to the colours in use, which
 *      line work, logos)         keeps edges crisp and beats both of the above
 *
 * A codec change renames the file, so references to it inside dist/deck are
 * rewritten. Only assets whose path appears verbatim in a text file are
 * eligible, which keeps dynamically-built references (`assets/logos/${src}`)
 * out of it by construction. A final pass asserts every asset referenced from
 * dist/deck still exists, so a bad rewrite fails the build instead of shipping
 * a blank slide.
 */
import sharp from "sharp";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join, extname, relative, basename } from "node:path";

const DECK_DIR = new URL("../dist/deck", import.meta.url).pathname;

// The deck stage is 1920x1080. Anything wider is invisible detail.
const MAX_DIM = 1920;
const JPEG_QUALITY = 88;
const WEBP_QUALITY = 88;
// Above this many distinct colours an image is photographic (or a gradient),
// and a 256-colour palette would be a visible downgrade. Flat art, contour
// lines and logos land well under it.
const FLAT_ART_COLOUR_LIMIT = 512;
// Leave small files alone — the byte win is noise and every re-encode is a
// chance to make something look worse.
const MIN_SIZE = 100 * 1024;

// Assets deep-linked from outside dist/deck, where a rename would 404 somewhere
// this script cannot see. Keep in sync with the referencing code.
const EXTERNALLY_LINKED = new Set([
  // workers/deck-gate/src/gate-page.ts backdrop
  "assets/hero-mountains.jpg",
]);

const IMAGE_RE = /\.(png|jpe?g|webp)$/i;
const TEXT_RE = /\.(html|css|js|jsx|mjs|json|svg|txt)$/i;
// Any asset reference in the deck's own markup/scripts, e.g.
// "assets/case/trimag-right.png" or url('assets/contour-appalachia.png').
const REFERENCE_RE = /assets\/[\w./-]+\.(?:png|jpe?g|webp)/gi;

function walk(dir, test) {
  const files = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full, test));
    else if (test.test(e.name)) files.push(full);
  }
  return files;
}

/** Alpha that is fully opaque everywhere carries no information — drop it. */
async function alphaIsUsed(file, meta) {
  if (!meta.hasAlpha) return false;
  // Normalise to RGBA first: a paletted PNG with a tRNS chunk reports hasAlpha
  // while decoding to a channel count that makes "the last channel" ambiguous.
  const stats = await sharp(file)
    .toColourspace("srgb")
    .ensureAlpha()
    .extractChannel(3)
    .stats();
  return stats.channels[0].min < 250;
}

/**
 * Distinct colours, counted on a 256px thumbnail. Cheap, and the only question
 * it has to answer is "flat art or photograph", where the gap is three orders
 * of magnitude (36 colours for the contour texture, 23k for a photo).
 */
async function colourCount(file) {
  const { data, info } = await sharp(file)
    .resize(256, 256, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const seen = new Set();
  for (let i = 0; i < data.length; i += info.channels) {
    seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
  }
  return seen.size;
}

function paletteColours(count) {
  // Next power of two above what the image uses, capped at a PNG palette.
  return Math.min(256, Math.max(16, 2 ** Math.ceil(Math.log2(count + 1))));
}

/**
 * Which codec this image should end up in, and the bytes for it.
 *
 * `allowRename` false means the file has to keep its extension (see the
 * reference-rewriting rules above), so the codec choice collapses to the best
 * encoding available inside the container it already has. A photograph then
 * stays a *lossless* PNG rather than being palette-crushed: bigger on disk, but
 * this deck's job is to look right.
 */
async function encode(file, allowRename) {
  const meta = await sharp(file).metadata();
  const hasAlpha = await alphaIsUsed(file, meta);
  const colours = await colourCount(file);
  const flat = colours <= FLAT_ART_COLOUR_LIMIT;
  const ext = extname(file).toLowerCase();
  const resized = () =>
    sharp(file).resize(MAX_DIM, MAX_DIM, {
      fit: "inside",
      withoutEnlargement: true,
    });
  const png = (opts) =>
    resized()
      .png({ effort: 9, ...opts })
      .toBuffer();
  const webp = () =>
    resized().webp({ quality: WEBP_QUALITY, effort: 5 }).toBuffer();
  const jpeg = () =>
    resized()
      .flatten({ background: "#ffffff" })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true,
        // No chroma subsampling: the deck leans on saturated brand colour and
        // fine type-over-photo edges, where 4:2:0 shows as fringing.
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();

  // Flat art (logos, contour lines, screenshots of line work) is both smaller
  // and cleaner as a palette PNG than as any lossy codec.
  if (flat && (allowRename || ext === ".png")) {
    return {
      ext: ".png",
      why: `flat art, ${colours} colours`,
      data: await png({ palette: true, colours: paletteColours(colours) }),
    };
  }
  if (!allowRename) {
    if (ext === ".png") {
      return hasAlpha || !flat
        ? {
            ext,
            why: "photographic, cannot rename: lossless PNG",
            data: await png(),
          }
        : {
            ext,
            why: `flat art, ${colours} colours`,
            data: await png({
              palette: true,
              colours: paletteColours(colours),
            }),
          };
    }
    if (ext === ".webp")
      return { ext, why: "WebP in place", data: await webp() };
    return { ext, why: "JPEG in place", data: await jpeg() };
  }
  if (hasAlpha) {
    return {
      ext: ".webp",
      why: "photographic, needs alpha",
      data: await webp(),
    };
  }
  return { ext: ".jpg", why: "photographic, opaque", data: await jpeg() };
}

const textFiles = walk(DECK_DIR, TEXT_RE);
const text = new Map(textFiles.map((f) => [f, readFileSync(f, "utf8")]));
const referenced = new Set();
for (const body of text.values()) {
  for (const m of body.matchAll(REFERENCE_RE)) referenced.add(m[0]);
}

function rewriteReferences(fromRel, toRel) {
  for (const [file, body] of text) {
    if (!body.includes(fromRel)) continue;
    text.set(file, body.split(fromRel).join(toRel));
  }
}

let totalBefore = 0;
let totalAfter = 0;
const changed = [];

for (const file of walk(DECK_DIR, IMAGE_RE)) {
  const before = statSync(file).size;
  if (before < MIN_SIZE) continue;

  const rel = relative(DECK_DIR, file);
  // A rename is only safe when every reference to the file is visible here: it
  // must appear verbatim inside dist/deck, and nothing outside the deck may
  // deep-link it.
  const allowRename = referenced.has(rel) && !EXTERNALLY_LINKED.has(rel);
  const { ext, why, data } = await encode(file, allowRename);
  const renaming = ext !== extname(file).toLowerCase();
  if (data.length >= before) continue;

  const dest = renaming ? file.slice(0, -extname(file).length) + ext : file;
  writeFileSync(dest, data);
  if (dest !== file) {
    unlinkSync(file);
    rewriteReferences(rel, relative(DECK_DIR, dest));
  }

  totalBefore += before;
  totalAfter += data.length;
  changed.push({ rel, to: basename(dest), before, after: data.length, why });
}

for (const [file, body] of text) writeFileSync(file, body);

// Integrity gate: nothing may reference an asset that is not on disk.
const missing = [];
for (const [file, body] of text) {
  for (const m of body.matchAll(REFERENCE_RE)) {
    try {
      statSync(join(DECK_DIR, m[0]));
    } catch {
      missing.push(`${relative(DECK_DIR, file)} -> ${m[0]}`);
    }
  }
}
if (missing.length > 0) {
  console.error("optimize-deck: broken asset references after rewrite:");
  for (const m of missing) console.error(`  ✗ ${m}`);
  process.exit(1);
}

if (changed.length === 0) {
  console.log("all deck images already optimized");
} else {
  changed.sort((a, b) => b.before - b.after - (a.before - a.after));
  for (const c of changed.slice(0, 10)) {
    console.log(
      `  ${c.rel} → ${c.to}  ${(c.before / 1024).toFixed(0)}KB → ${(c.after / 1024).toFixed(0)}KB  (${c.why})`,
    );
  }
  const saved = ((1 - totalAfter / totalBefore) * 100).toFixed(0);
  console.log(
    `optimized ${changed.length} images: ${(totalBefore / 1048576).toFixed(1)}MB → ${(totalAfter / 1048576).toFixed(1)}MB (-${saved}%)`,
  );
}
