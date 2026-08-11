/**
 * Fail the build if the deck gets heavy again.
 *
 * The deck.pdf handed to LPs reached 35MB once (a 147MB source asset directory,
 * plus Chrome embedding every composited slide layer as a lossless 300 DPI
 * bitmap — see scripts/compress-pdf.mjs). Both halves of that are fixed in the
 * pipeline, and nothing about a re-pulled deck would make a regression obvious,
 * so the budgets are asserted here instead of being remembered.
 *
 * Four budgets, all measured on dist/ after `npm run pdf`:
 *
 *   PDF            the artifact that gets emailed and put in the data room
 *   single asset   one image should never dominate a page load
 *   page load      everything /deck/ actually requests, which is the number a
 *                  viewer on hotel wifi feels
 *   deck images    every image shipped under dist/deck, referenced or not — the
 *                  backstop that catches "the optimize step silently no-oped"
 *
 * Every budget is env-overridable so a deliberate change is one variable and a
 * visible diff, not a code edit.
 *
 * Usage: node scripts/check-deck-budget.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;
const DECK = join(DIST, "deck");
const MB = 1048576;

// The 4MB PDF budget from #12 was measured with a local Chrome + Ghostscript,
// not CI's: the CI runner's puppeteer-downloaded Chrome rasterises the same
// slides slightly larger, so the very commit that added the budget failed it
// on main at 4.02MB — no deck content changed between the two measurements
// (github.com/snocap/snocap.vc/actions/runs/31456765503). 4.5MB gives headroom
// for that build-to-build variance without loosening the check's actual job:
// catching a real content regression toward the original 35MB.
const budgets = {
  pdf: Number(process.env.DECK_PDF_MAX_BYTES || 4.5 * MB),
  asset: Number(process.env.DECK_ASSET_MAX_BYTES || 1.5 * MB),
  pageLoad: Number(process.env.DECK_PAGE_LOAD_MAX_BYTES || 8 * MB),
  images: Number(process.env.DECK_IMAGES_MAX_BYTES || 32 * MB),
};

const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i;
const TEXT_RE = /\.(html|css|js|jsx|mjs|json)$/i;
const REFERENCE_RE = /assets\/[\w./-]+\.(?:png|jpe?g|webp|gif|svg)/gi;

function walk(dir, test) {
  const files = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full, test));
    else if (test.test(e.name)) files.push(full);
  }
  return files;
}

const failures = [];
const report = [];

function check(label, actual, budget, detail = "") {
  const pct = ((actual / budget) * 100).toFixed(0);
  const line = `${actual <= budget ? "✓" : "✗"} ${label}: ${(actual / MB).toFixed(2)}MB of ${(budget / MB).toFixed(2)}MB budget (${pct}%)${detail}`;
  report.push(line);
  if (actual > budget) failures.push(line);
}

// 1. The PDF. Both copies generate-pdf.mjs writes have to be the compressed one.
const pdfPaths = [join(DECK, "deck.pdf"), join(DIST, "deck.pdf")];
const pdfSizes = pdfPaths.map((p) => {
  try {
    return statSync(p).size;
  } catch {
    return null;
  }
});
if (pdfSizes.some((s) => s === null)) {
  failures.push(
    `✗ deck.pdf missing at ${pdfPaths
      .filter((_, i) => pdfSizes[i] === null)
      .map((p) => relative(DIST, p))
      .join(", ")} — did generate-pdf.mjs skip (no Chrome)?`,
  );
} else {
  if (pdfSizes[0] !== pdfSizes[1]) {
    failures.push(
      `✗ dist/deck/deck.pdf (${pdfSizes[0]}B) and dist/deck.pdf (${pdfSizes[1]}B) differ — one copy missed the compression step`,
    );
  }
  check("deck.pdf", Math.max(...pdfSizes), budgets.pdf);
}

// 2/4. Per-asset and total image weight.
const images = walk(DECK, IMAGE_RE);
const totalImages = images.reduce((a, f) => a + statSync(f).size, 0);
const oversized = images
  .map((f) => ({ f, size: statSync(f).size }))
  .filter((i) => i.size > budgets.asset)
  .sort((a, b) => b.size - a.size);
if (oversized.length > 0) {
  failures.push(
    `✗ ${oversized.length} asset(s) over the ${(budgets.asset / MB).toFixed(2)}MB per-file budget:`,
  );
  for (const { f, size } of oversized.slice(0, 10)) {
    failures.push(`    ${(size / MB).toFixed(2)}MB  ${relative(DECK, f)}`);
  }
}
check("deck images", totalImages, budgets.images, ` (${images.length} files)`);

// 3. What loading /deck/ actually pulls down: the assets its own markup and
// scripts name, plus the markup and scripts themselves.
const textFiles = walk(DECK, TEXT_RE);
const referenced = new Set();
for (const f of textFiles) {
  for (const m of readFileSync(f, "utf8").matchAll(REFERENCE_RE)) {
    referenced.add(m[0]);
  }
}
let pageLoad = textFiles.reduce((a, f) => a + statSync(f).size, 0);
for (const rel of referenced) {
  try {
    pageLoad += statSync(join(DECK, rel)).size;
  } catch {
    failures.push(`✗ dist/deck references a missing asset: ${rel}`);
  }
}
check(
  "deck page load",
  pageLoad,
  budgets.pageLoad,
  ` (${referenced.size} assets)`,
);

for (const line of report) console.log(line);

if (failures.length > 0) {
  console.error("\ncheck-deck-budget: FAILED");
  for (const line of failures) console.error(line);
  console.error(
    "\nThe deck is over budget. Do not raise the budget to make this pass —\n" +
      "look at what grew: `npm run optimize-deck` output for asset weight, and\n" +
      "scripts/compress-pdf.mjs (needs ghostscript on PATH) for the PDF.",
  );
  process.exit(1);
}

console.log("check-deck-budget: all budgets OK");
