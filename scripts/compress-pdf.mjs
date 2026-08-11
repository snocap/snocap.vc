/**
 * Shrink dist/deck/deck.pdf after generate-pdf.mjs has produced it.
 *
 * Why this step has to exist
 * --------------------------
 * Chrome's print-to-PDF does not re-use the source image bytes for anything it
 * has to composite. A slide layer with transparency, a blend mode, a mask or a
 * clipped `background: cover` gets rasterised — at the print raster density of
 * 300 DPI, so 3.125x the deck's 1920x1080 CSS canvas — and embedded as a
 * *lossless* FlateDecode bitmap. Measured on this deck: 87 of 175 embedded
 * images came out lossless and accounted for 30.2MB of a 34.5MB file, including
 * two 6002x3377 hero rasters at 4.65MB each. The plain photographs Chrome could
 * pass straight through arrived as DCT (JPEG) and cost 3.8MB for 88 of them.
 *
 * That is why optimizing the source assets barely moves the PDF: the assets
 * feeding those pages are already ≤1920px, and cleaner source pixels actually
 * make the lossless streams *larger*. The size is decided by how Chrome encodes,
 * not by what it was given, so it has to be fixed after the fact.
 *
 * What this does
 * --------------
 * Ghostscript re-encodes every embedded image as JPEG and downsamples it to the
 * density it is actually displayed at. It knows each image's placement matrix,
 * so "96 DPI" means one image pixel per CSS pixel of the 1920x1080 page —
 * pixel-exact at the size the deck is presented and shared at, with no visible
 * change (verified page-by-page against the uncompressed original). Text, vector
 * art and links stay untouched.
 *
 * Tunables, if the deck ever needs print-resolution output:
 *   DECK_PDF_IMAGE_DPI  image density cap, in page DPI (default 96 = 1:1 at
 *                       1920x1080; 192 would be 2x retina, and roughly doubles
 *                       the file)
 *   DECK_PDF_QFACTOR    JPEG quality, Distiller-style, lower is better
 *                       (default 0.25, about quality 90; no chroma subsampling)
 *   GS_BIN              ghostscript binary (default "gs")
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;
const PDF = join(DIST, "deck", "deck.pdf");
const PDF_ALT = join(DIST, "deck.pdf");
const TMP = PDF + ".tmp";

const GS = process.env.GS_BIN || "gs";
const DPI = Number(process.env.DECK_PDF_IMAGE_DPI || 96);
const QFACTOR = process.env.DECK_PDF_QFACTOR || "0.25";
const MB = 1048576;

function gs(args) {
  return spawnSync(GS, args, { encoding: "utf8" });
}

/** Page count via ghostscript's own parser — also proves the file is readable. */
function pageCount(file) {
  const res = gs([
    "-q",
    "-dNODISPLAY",
    // SAFER (the default since 9.50) blocks the PostScript `file` operator, so
    // the one file being counted has to be permitted explicitly.
    `--permit-file-read=${file}`,
    "-c",
    `(${file}) (r) file runpdfbegin pdfpagecount = quit`,
  ]);
  const n = Number((res.stdout || "").trim().split("\n").pop());
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(
      `could not read the page count of ${file}: ${res.stderr || res.stdout}`,
    );
  }
  return n;
}

if (!existsSync(PDF)) {
  console.warn("⚠ no dist/deck/deck.pdf — nothing to compress");
  process.exit(0);
}

if (gs(["--version"]).status !== 0) {
  // Same posture as generate-pdf.mjs without Chrome: local dev keeps working,
  // and check-deck-budget.mjs is what makes CI refuse an uncompressed deck.
  console.warn(
    `⚠ ${GS} not available — skipping PDF compression (CI installs ghostscript)`,
  );
  process.exit(0);
}

const before = statSync(PDF).size;
const pagesBefore = pageCount(PDF);

const result = gs([
  "-sDEVICE=pdfwrite",
  "-dCompatibilityLevel=1.7",
  "-dNOPAUSE",
  "-dBATCH",
  "-dQUIET",
  "-dDetectDuplicateImages=true",
  "-dCompressFonts=true",
  "-dSubsetFonts=true",
  // Force JPEG for every image rather than letting ghostscript keep the
  // lossless encoding Chrome chose — that encoding is the whole problem.
  "-dAutoFilterColorImages=false",
  "-dColorImageFilter=/DCTEncode",
  "-dEncodeColorImages=true",
  "-dDownsampleColorImages=true",
  "-dColorImageDownsampleType=/Bicubic",
  `-dColorImageResolution=${DPI}`,
  // Downsample as soon as an image exceeds the cap (the 1.5x default would let
  // a 4600px hero raster through untouched).
  "-dColorImageDownsampleThreshold=1.0",
  "-dAutoFilterGrayImages=false",
  "-dGrayImageFilter=/DCTEncode",
  "-dEncodeGrayImages=true",
  "-dDownsampleGrayImages=true",
  "-dGrayImageDownsampleType=/Bicubic",
  `-dGrayImageResolution=${DPI}`,
  "-dGrayImageDownsampleThreshold=1.0",
  `-sOutputFile=${TMP}`,
  // HSamples/VSamples [1 1 1 1] is 4:4:4 — no chroma subsampling. The deck puts
  // fine white type over saturated photography, which is where 4:2:0 fringes.
  "-c",
  `<</ColorImageDict <</QFactor ${QFACTOR} /Blend 1 /HSamples [1 1 1 1] /VSamples [1 1 1 1]>>` +
    ` /GrayImageDict <</QFactor ${QFACTOR} /Blend 1 /HSamples [1 1 1 1] /VSamples [1 1 1 1]>> >> setdistillerparams`,
  "-f",
  PDF,
]);

if (result.status !== 0 || !existsSync(TMP)) {
  console.error(result.stderr || result.stdout || "");
  throw new Error(`ghostscript failed (exit ${result.status})`);
}

const pagesAfter = pageCount(TMP);
if (pagesBefore !== pagesAfter) {
  unlinkSync(TMP);
  throw new Error(
    `compression changed the page count (${pagesBefore} → ${pagesAfter}); refusing to ship it`,
  );
}

const after = statSync(TMP).size;
if (after >= before) {
  unlinkSync(TMP);
  console.log(
    `PDF already compressed: ${(before / MB).toFixed(1)}MB (ghostscript made it no smaller)`,
  );
  process.exit(0);
}

renameSync(TMP, PDF);
copyFileSync(PDF, PDF_ALT);
console.log(
  `PDF compressed: ${(before / MB).toFixed(1)}MB → ${(after / MB).toFixed(1)}MB` +
    ` (-${((1 - after / before) * 100).toFixed(0)}%, ${pagesAfter} pages, images ≤${DPI} DPI)`,
);
