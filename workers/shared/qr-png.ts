// A QR code rendered as a PNG, with no dependency on anything but the vendored
// encoder next door.
//
// Why a raster PNG when gate-page.ts is happy with an inline SVG: this one is
// served from its own URL so it can be embedded (`<img src>`) in a Google Doc, an
// email, or a Slack message, and copied out of the page with right-click → Copy
// Image. Both of those want real image bytes on the clipboard, and PNG is the
// format that pastes everywhere. Workers have no canvas and no node:zlib, so the
// bytes are assembled by hand here.
//
// The trick that makes that ~100 lines instead of a compression library: a QR is
// one bit per pixel, and DEFLATE has a "stored" block type that copies its input
// verbatim. So the IDAT payload is a zlib stream of uncompressed blocks — legal,
// every decoder reads it, and the only real arithmetic left is the two checksums
// PNG and zlib demand (CRC-32 per chunk, Adler-32 over the raw scanlines). The
// file is bigger than an optimally compressed one and, for a 300px QR, that is
// about 12 KB.
//
// Output is deterministic: the same text and options always produce byte-identical
// output, which is what lets the endpoint serving it promise immutable caching.

import qrcode from "./vendor/qrcode-generator.js";

export interface QrPngOptions {
  /** Pixels per QR module. Several, or a phone camera has nothing to lock onto. */
  scale?: number;
  /** Quiet zone in modules. The spec's minimum is 4; below that, scanners fail. */
  margin?: number;
}

const PNG_SIGNATURE = Uint8Array.of(
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
);

/** A stored DEFLATE block carries a 16-bit length, so this is its ceiling. */
const MAX_STORED_BLOCK = 0xffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

/** CRC-32 as PNG specifies it: reflected, polynomial 0xEDB88320, pre/post inverted. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Adler-32 over the uncompressed data, which closes a zlib stream. */
function adler32(bytes: Uint8Array): number {
  let low = 1;
  let high = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    low = (low + bytes[i]) % 65521;
    high = (high + low) % 65521;
  }
  return ((high << 16) | low) >>> 0;
}

/** length | type | data | CRC-32 of (type + data) — the PNG chunk envelope. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/**
 * A zlib stream of stored (uncompressed) DEFLATE blocks. 0x78 0x01 is the
 * standard header for a 32K window at the fastest compression level, and passes
 * the (CMF << 8 | FLG) % 31 === 0 check decoders apply. Each block is a flag
 * byte, then LEN and its one's complement, then the bytes themselves.
 */
function storedZlibStream(raw: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(raw.length / MAX_STORED_BLOCK));
  const out = new Uint8Array(2 + blocks * 5 + raw.length + 4);
  let at = 0;
  out[at++] = 0x78;
  out[at++] = 0x01;
  for (let index = 0; index < blocks; index += 1) {
    const start = index * MAX_STORED_BLOCK;
    const length = Math.min(MAX_STORED_BLOCK, raw.length - start);
    out[at++] = index === blocks - 1 ? 1 : 0; // BFINAL on the last block only
    out[at++] = length & 0xff;
    out[at++] = (length >>> 8) & 0xff;
    out[at++] = ~length & 0xff;
    out[at++] = (~length >>> 8) & 0xff;
    out.set(raw.subarray(start, start + length), at);
    at += length;
  }
  new DataView(out.buffer).setUint32(at, adler32(raw));
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/**
 * The QR module matrix for `text`, as a `count × count` grid of booleans. Split
 * out so a test can compare the decoded pixels against the encoder's own idea of
 * the symbol rather than against a snapshot of this file's output.
 *
 * Error correction level M and an automatic type number (0), matching the QR the
 * gate pages render — enough redundancy to survive a phone screen, still small.
 */
export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const rows: boolean[][] = [];
  for (let row = 0; row < count; row += 1) {
    const cells: boolean[] = [];
    for (let col = 0; col < count; col += 1) cells.push(qr.isDark(row, col));
    rows.push(cells);
  }
  return rows;
}

/**
 * `text` encoded as a QR code, as the bytes of a 1-bit greyscale PNG: dark
 * modules black, everything else white. White is not optional — a transparent
 * background would come out black-on-black wherever it is pasted onto a dark
 * surface, and unscannable.
 */
export function renderQrPng(
  text: string,
  options: QrPngOptions = {},
): Uint8Array {
  const scale = Math.max(1, Math.floor(options.scale ?? 8));
  const margin = Math.max(0, Math.floor(options.margin ?? 4));
  const modules = qrModules(text);
  const count = modules.length;
  const side = (count + margin * 2) * scale;

  // Bit depth 1: eight pixels per byte, most significant bit leftmost, and a
  // filter-type byte in front of every scanline. 1 is white, 0 is black, so the
  // whole image starts white and dark modules are punched out of it.
  const stride = Math.ceil(side / 8);
  const rowSize = 1 + stride;
  const rawScanlines = new Uint8Array(side * rowSize).fill(0xff);
  for (let y = 0; y < side; y += 1) rawScanlines[y * rowSize] = 0; // filter: None

  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!modules[row][col]) continue;
      const top = (row + margin) * scale;
      const left = (col + margin) * scale;
      for (let y = top; y < top + scale; y += 1) {
        const pixels = y * rowSize + 1;
        for (let x = left; x < left + scale; x += 1) {
          rawScanlines[pixels + (x >> 3)] &= ~(0x80 >> (x & 7));
        }
      }
    }
  }

  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, side);
  header.setUint32(4, side);
  ihdr[8] = 1; // bit depth
  ihdr[9] = 0; // colour type: greyscale
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter method: adaptive, the only one there is
  ihdr[12] = 0; // interlace: none

  return concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", storedZlibStream(rawScanlines)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}
