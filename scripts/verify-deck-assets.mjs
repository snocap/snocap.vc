/**
 * Verify deck image assets are intact before a build.
 *
 * Written for the retired Claude Design pull path (public/deck/ has been edited
 * in place since 2026-11-10): DesignSync's get_file capped every file at
 * 256 KiB (exactly 262144 bytes) and truncated larger ones SILENTLY — no error,
 * just a short file — and the assets it left behind are still the ones in the
 * tree. The integrity signal is the image's own format validity: a truncated
 * PNG/JPEG fails a full pixel decode (incomplete scan data / missing chunk, so
 * libpng/libjpeg error on the trailing CRC). That decode IS the checksum we
 * lean on, and it catches a hand-added asset that was cut short just as well.
 *
 * An asset is flagged SUSPECT when EITHER:
 *   (a) its size is exactly 262144 bytes — the old truncation boundary; or
 *   (b) sharp cannot fully decode it (.stats() forces a full-pixel decode).
 *
 * Usage:
 *   node scripts/verify-deck-assets.mjs [dir]     # default: public/deck
 *
 * Exits non-zero if any asset is flagged, so CI can gate on it.
 */
import sharp from "sharp";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// The retired DesignSync get_file cap. A file landing at exactly this size is
// almost certainly a truncation, not a coincidence.
export const TRUNCATION_BOUNDARY = 256 * 1024; // 262144
// WebP is here for dist/ (scripts/optimize-deck-images.mjs emits it); the source
// assets under public/ are only ever PNG or JPEG.
const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

export function walk(dir) {
  const files = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (IMAGE_RE.test(e.name)) files.push(full);
  }
  return files;
}

/**
 * Check one image file.
 * @returns {Promise<{file: string, ok: boolean, reason?: string}>}
 */
export async function checkFile(file) {
  const size = statSync(file).size;
  if (size === TRUNCATION_BOUNDARY) {
    return {
      file,
      ok: false,
      reason: `truncated-boundary (exactly ${TRUNCATION_BOUNDARY} bytes = DesignSync 256 KiB cap)`,
    };
  }
  try {
    // .stats() forces a full-pixel decode — a truncated image throws here where
    // .metadata() (header-only) would pass.
    await sharp(file, { failOn: "warning" }).stats();
    return { file, ok: true };
  } catch (err) {
    return {
      file,
      ok: false,
      reason: `decode-failure (${err.message.split("\n")[0]})`,
    };
  }
}

/**
 * Verify every image under dir.
 * @returns {Promise<{checked: number, flagged: Array<{file, reason}>}>}
 */
export async function verifyDir(dir) {
  const files = walk(dir);
  const flagged = [];
  for (const file of files) {
    const res = await checkFile(file);
    if (!res.ok) flagged.push({ file, reason: res.reason });
  }
  return { checked: files.length, flagged };
}

// CLI entry — only when run directly, so the helpers stay importable.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir =
    process.argv[2] || new URL("../public/deck", import.meta.url).pathname;
  const { checked, flagged } = await verifyDir(dir);

  if (flagged.length === 0) {
    console.log(`verify-deck-assets: ${checked} images OK`);
    process.exit(0);
  }

  console.error(
    `verify-deck-assets: ${flagged.length}/${checked} images FLAGGED`,
  );
  for (const { file, reason } of flagged) {
    console.error(`  ✗ ${relative(process.cwd(), file)} — ${reason}`);
  }
  console.error(
    "\nThese assets are corrupt or truncated. Re-derive the asset from the full-res\n" +
      "original in public/deck if there is one (sharp, matching the widths of its\n" +
      "-opt siblings); otherwise ask a human to supply the file directly and commit\n" +
      "it to public/deck, which is the deck's source of truth.",
  );
  process.exit(1);
}
