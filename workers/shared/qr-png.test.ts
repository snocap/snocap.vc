// The PNG encoder is hand-written because the Workers runtime has no canvas and
// no node:zlib, so these tests are the only thing standing between a malformed
// byte and an image that silently fails to render or scan. They lean on the fact
// that node:zlib IS available under `node --test`: the pixels are proved by
// inflating the real IDAT stream and comparing it against the module matrix the
// vendored encoder produces, not against a snapshot of this code's own output.
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { test } from "node:test";
import { qrModules, renderQrPng } from "./qr-png.ts";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

interface Chunk {
  type: string;
  data: Uint8Array;
  crc: number;
  /** CRC recomputed here, independently of the encoder, over type + data. */
  computedCrc: number;
}

/**
 * CRC-32 written out the slow, table-free way on purpose: if this shared a table
 * or a helper with the encoder, a wrong table would produce matching wrong
 * answers and the test would agree with the bug.
 */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parseChunks(png: Uint8Array): Chunk[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: Chunk[] = [];
  let at = 8; // past the signature
  while (at < png.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    const data = png.subarray(at + 8, at + 8 + length);
    chunks.push({
      type,
      data,
      crc: view.getUint32(at + 8 + length),
      computedCrc: crc32(png.subarray(at + 4, at + 8 + length)),
    });
    at += 12 + length;
  }
  return chunks;
}

function chunkOf(png: Uint8Array, type: string): Chunk {
  const found = parseChunks(png).find((entry) => entry.type === type);
  assert.ok(found, `expected a ${type} chunk`);
  return found;
}

/** Every pixel of the image, inflated and unpacked: true where the pixel is black. */
function decodePixels(png: Uint8Array): {
  side: number;
  dark: boolean[][];
} {
  const ihdr = chunkOf(png, "IHDR");
  const header = new DataView(ihdr.data.buffer, ihdr.data.byteOffset);
  const width = header.getUint32(0);
  const side = header.getUint32(4);
  assert.equal(width, side, "a QR is square");
  assert.equal(ihdr.data[8], 1, "bit depth 1");
  assert.equal(ihdr.data[9], 0, "greyscale");

  const raw = inflateSync(chunkOf(png, "IDAT").data);
  const stride = Math.ceil(side / 8);
  assert.equal(raw.length, side * (1 + stride));

  const dark: boolean[][] = [];
  for (let y = 0; y < side; y += 1) {
    const rowStart = y * (1 + stride);
    assert.equal(raw[rowStart], 0, "scanlines use filter type None");
    const row: boolean[] = [];
    for (let x = 0; x < side; x += 1) {
      const bit = (raw[rowStart + 1 + (x >> 3)] >> (7 - (x % 8))) & 1;
      row.push(bit === 0);
    }
    dark.push(row);
  }
  return { side, dark };
}

const SLUGS = ["fund-two", "deck", "a", "lp-update-2026-q3"];

test("the PNG starts with the signature and ends with IEND", () => {
  const png = renderQrPng("https://snocap.vc/link/fund-two");
  assert.deepEqual([...png.subarray(0, 8)], SIGNATURE);
  const types = parseChunks(png).map((entry) => entry.type);
  assert.deepEqual(types, ["IHDR", "IDAT", "IEND"]);
  assert.equal(chunkOf(png, "IEND").data.length, 0);
});

test("every chunk CRC matches one computed independently", () => {
  // A wrong CRC is the classic hand-rolled-PNG failure: some viewers render the
  // image anyway, so it can ship looking fine and break in the one place it
  // matters.
  const png = renderQrPng("https://snocap.vc/link/fund-two");
  for (const entry of parseChunks(png)) {
    assert.equal(
      entry.crc,
      entry.computedCrc,
      `${entry.type} CRC ${entry.crc} != ${entry.computedCrc}`,
    );
  }
});

test("the IDAT inflates, so the zlib framing and Adler-32 are right", () => {
  // inflateSync validates the Adler-32 trailer, so a bad checksum throws here.
  const png = renderQrPng("https://snocap.vc/link/deck");
  assert.doesNotThrow(() => inflateSync(chunkOf(png, "IDAT").data));
});

for (const slug of SLUGS) {
  test(`the decoded pixels are the QR matrix for ${slug}`, () => {
    const text = `https://snocap.vc/link/${slug}`;
    const scale = 6;
    const margin = 4;
    const modules = qrModules(text);
    const { side, dark } = decodePixels(renderQrPng(text, { scale, margin }));

    assert.equal(side, (modules.length + margin * 2) * scale);
    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        const row = Math.floor(y / scale) - margin;
        const col = Math.floor(x / scale) - margin;
        const inSymbol =
          row >= 0 && col >= 0 && row < modules.length && col < modules.length;
        const expected = inSymbol ? modules[row][col] : false;
        assert.equal(
          dark[y][x],
          expected,
          `pixel ${x},${y} should be ${expected ? "black" : "white"}`,
        );
      }
    }
  });
}

test("the quiet zone is four modules of white on every side", () => {
  // Without it scanners cannot find the symbol, however correct the pixels are.
  const { side, dark } = decodePixels(
    renderQrPng("https://snocap.vc/link/fund-two", { scale: 4, margin: 4 }),
  );
  const quiet = 4 * 4;
  for (let index = 0; index < side; index += 1) {
    for (let offset = 0; offset < quiet; offset += 1) {
      assert.equal(dark[offset][index], false, "top edge is white");
      assert.equal(
        dark[side - 1 - offset][index],
        false,
        "bottom edge is white",
      );
      assert.equal(dark[index][offset], false, "left edge is white");
      assert.equal(
        dark[index][side - 1 - offset],
        false,
        "right edge is white",
      );
    }
  }
});

test("different text produces a different image", () => {
  const one = renderQrPng("https://snocap.vc/link/one");
  const two = renderQrPng("https://snocap.vc/link/two");
  assert.notDeepEqual([...one], [...two]);
});

test("the same text produces byte-identical output", () => {
  // The endpoint serving these promises immutable caching, which is only honest
  // if the bytes for a given slug never change.
  const text = "https://snocap.vc/link/fund-two";
  assert.deepEqual([...renderQrPng(text)], [...renderQrPng(text)]);
});

test("scale sizes the image without changing the symbol", () => {
  const text = "https://snocap.vc/link/fund-two";
  const small = decodePixels(renderQrPng(text, { scale: 2, margin: 4 }));
  const large = decodePixels(renderQrPng(text, { scale: 10, margin: 4 }));
  assert.equal(large.side, small.side * 5);
  assert.equal(small.dark[8][8], large.dark[40][40]);
});

test("an image needing several stored blocks still inflates whole", () => {
  // A stored DEFLATE block tops out at 65535 bytes, so anything past that is
  // written as a chain with BFINAL set on the last one only. Getting that flag
  // wrong truncates the image, and only a big enough image reaches the code path.
  const text = "https://snocap.vc/link/fund-two";
  const scale = 24;
  const modules = qrModules(text);
  const side = (modules.length + 8) * scale;
  assert.ok(
    side * (1 + Math.ceil(side / 8)) > 65535,
    "test image is big enough to span more than one stored block",
  );

  const decoded = decodePixels(renderQrPng(text, { scale, margin: 4 }));
  assert.equal(decoded.side, side);
  for (let row = 0; row < modules.length; row += 1) {
    for (let col = 0; col < modules.length; col += 1) {
      const y = (row + 4) * scale;
      const x = (col + 4) * scale;
      assert.equal(decoded.dark[y][x], modules[row][col]);
    }
  }
});
