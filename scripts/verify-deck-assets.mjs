/**
 * Verify deck image assets are intact after a sync.
 *
 * Guards the headless DesignSync pull path: DesignSync's get_file caps every
 * file at 256 KiB (exactly 262144 bytes) and truncates larger ones SILENTLY —
 * no error, just a short file. list_files exposes no size and no hash, so there
 * is no server-side checksum to match against. The only integrity signal we
 * control is the image's own format validity: a truncated PNG/JPEG fails a full
 * pixel decode (incomplete scan data / missing chunk, so libpng/libjpeg error
 * on the trailing CRC). That decode IS the checksum we lean on.
 *
 * An asset is flagged SUSPECT when EITHER:
 *   (a) its size is exactly 262144 bytes — the DesignSync truncation boundary; or
 *   (b) sharp cannot fully decode it (.stats() forces a full-pixel decode).
 *
 * Usage:
 *   node scripts/verify-deck-assets.mjs [dir]     # default: public/deck
 *
 * Exits non-zero if any asset is flagged, so a sync pipeline can gate on it.
 */
import sharp from "sharp";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// DesignSync get_file cap. A file landing at exactly this size is almost
// certainly a truncation, not a coincidence.
export const TRUNCATION_BOUNDARY = 256 * 1024; // 262144
// WebP is here for dist/ (scripts/optimize-deck-images.mjs emits it); the pulled
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
    "\nThese assets are corrupt or truncated. If they changed in Claude Design, a\n" +
      "headless DesignSync pull cannot carry them (256 KiB cap). Re-pull this update\n" +
      "with the browser-minted tar: ./scripts/pull-deck.sh <handoff-token>",
  );
  process.exit(1);
}
