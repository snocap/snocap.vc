/**
 * Tests for verify-deck-assets.mjs — run with: node --test scripts/
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import {
  checkFile,
  verifyDir,
  TRUNCATION_BOUNDARY,
} from "./verify-deck-assets.mjs";

function tmp() {
  return mkdtempSync(join(tmpdir(), "verify-deck-"));
}

// A small, valid PNG produced by sharp itself.
async function validPng() {
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 10, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

test("passes a valid PNG", async () => {
  const dir = tmp();
  try {
    const file = join(dir, "good.png");
    writeFileSync(file, await validPng());
    const res = await checkFile(file);
    assert.equal(res.ok, true, res.reason);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("flags a truncated PNG (decode failure)", async () => {
  const dir = tmp();
  try {
    const buf = await validPng();
    const file = join(dir, "cut.png");
    // Lop off the tail (IDAT/IEND) so the pixel decode is incomplete.
    writeFileSync(file, buf.subarray(0, Math.floor(buf.length / 2)));
    const res = await checkFile(file);
    assert.equal(res.ok, false);
    assert.match(res.reason, /decode-failure/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("flags a file at the exact 256 KiB truncation boundary", async () => {
  const dir = tmp();
  try {
    const file = join(dir, "boundary.jpg");
    // Exactly 262144 bytes — flagged on size alone, before any decode.
    writeFileSync(file, Buffer.alloc(TRUNCATION_BOUNDARY, 0xff));
    const res = await checkFile(file);
    assert.equal(res.ok, false);
    assert.match(res.reason, /truncated-boundary/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verifyDir walks nested dirs and separates good from flagged", async () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "ok.png"), await validPng());
    const buf = await validPng();
    writeFileSync(join(dir, "bad.png"), buf.subarray(0, 40));
    const { checked, flagged } = await verifyDir(dir);
    assert.equal(checked, 2);
    assert.equal(flagged.length, 1);
    assert.match(flagged[0].file, /bad\.png$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
