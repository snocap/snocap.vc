// Tests for the TEMPORARY per-email password override (override.ts). The stored
// value is a salted PBKDF2 hash; the write side lives in the kernelbot repo, so
// the format is a cross-repo contract. The pinned vector below is the guard: if
// either side changes the encoding, this fails loudly.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkEmailOverride,
  hashOverride,
  verifyOverride,
  OVERRIDE_ITERATIONS,
} from "./override.ts";

// A single fake KV binding backed by a Map, matching the OverrideKV shape.
function fakeKv(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get: async (key: string) => map.get(key) ?? null,
    set: (key: string, value: string) => map.set(key, value),
  };
}

test("hashOverride round-trips: the same password verifies, a wrong one does not", async () => {
  const stored = await hashOverride("correct horse");
  assert.equal(await verifyOverride("correct horse", stored), true);
  assert.equal(await verifyOverride("wrong horse", stored), false);
});

test("hashOverride emits the shared encoded format", async () => {
  const stored = await hashOverride("pw");
  const parts = stored.split("$");
  assert.equal(parts.length, 4);
  assert.equal(parts[0], "pbkdf2-sha256");
  assert.equal(Number(parts[1]), OVERRIDE_ITERATIONS);
  assert.match(parts[2], /^[A-Za-z0-9+/]+=*$/); // salt, base64
  assert.match(parts[3], /^[A-Za-z0-9+/]+=*$/); // derived key, base64
});

test("each hash uses a fresh salt, so two hashes of the same password differ", async () => {
  const a = await hashOverride("same");
  const b = await hashOverride("same");
  assert.notEqual(a, b);
  assert.equal(await verifyOverride("same", a), true);
  assert.equal(await verifyOverride("same", b), true);
});

// CROSS-REPO CONTRACT. This exact encoded hash is PBKDF2-HMAC-SHA256 over the
// password "philip-override-2026" with an all-zero 16-byte salt and 210k
// iterations. The identical vector is asserted in the kernelbot writer's test
// (test/unit/local/dataroom-override.test.ts). If PBKDF2 params or the encoding
// drift on either side, one of the two tests breaks.
const PINNED_VECTOR =
  "pbkdf2-sha256$210000$AAAAAAAAAAAAAAAAAAAAAA==$4cf1IHrHNJdpFvGykv4Ouf1ycwuRd8M7egA75oSgbbQ=";

test("verifies the pinned cross-repo vector", async () => {
  assert.equal(
    await verifyOverride("philip-override-2026", PINNED_VECTOR),
    true,
  );
  assert.equal(await verifyOverride("wrong", PINNED_VECTOR), false);
});

test("a malformed stored value verifies false instead of throwing", async () => {
  for (const bad of ["", "nonsense", "pbkdf2-sha256$notanumber$x$y", "a$b$c"]) {
    assert.equal(await verifyOverride("pw", bad), false);
  }
});

test("checkEmailOverride returns null when no store is bound", async () => {
  assert.equal(await checkEmailOverride(undefined, "a@b.com", "pw"), null);
});

test("checkEmailOverride returns null when the email has no override", async () => {
  const kv = fakeKv();
  assert.equal(await checkEmailOverride(kv, "nobody@b.com", "pw"), null);
});

test("checkEmailOverride matches an override, keyed on the normalized email", async () => {
  const kv = fakeKv();
  kv.set(
    "pw-override:philip@firstaxiomsholdings.com",
    await hashOverride("QRLBCGM7"),
  );
  // A wrong password on a set override is authoritative-false, not null.
  assert.equal(
    await checkEmailOverride(kv, "philip@firstaxiomsholdings.com", "nope"),
    false,
  );
  // Case/whitespace on the submitted email still resolves the same key.
  assert.equal(
    await checkEmailOverride(
      kv,
      "  PHILIP@FirstAxiomsHoldings.com ",
      "QRLBCGM7",
    ),
    true,
  );
});

test("checkEmailOverride is false (not null) for a set override with an empty password", async () => {
  const kv = fakeKv();
  kv.set("pw-override:x@y.com", await hashOverride("secret"));
  assert.equal(await checkEmailOverride(kv, "x@y.com", ""), false);
});
