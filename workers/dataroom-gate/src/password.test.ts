import assert from "node:assert/strict";
import { test } from "node:test";
import { derivePassword } from "./password.ts";

const SECRET = "test-pw-secret";

// Pinned so a refactor of the shared crypto can never silently invalidate the
// access codes already in circulation.
test("matches the known vector for the documented formula", async () => {
  assert.equal(await derivePassword("jon@sno.llc", "jon", SECRET), "XCNU22C6");
});

test("is eight base32 characters", async () => {
  const code = await derivePassword("jon@sno.llc", "jon", SECRET);
  assert.match(code, /^[A-Z2-7]{8}$/);
});

test("is stable for the same email, ref and secret", async () => {
  const a = await derivePassword("jon@sno.llc", "jon", SECRET);
  const b = await derivePassword("jon@sno.llc", "jon", SECRET);
  assert.equal(a, b);
});

test("ignores case and surrounding whitespace in the email", async () => {
  const canonical = await derivePassword("jon@sno.llc", "jon", SECRET);
  assert.equal(
    await derivePassword("  JON@SNO.LLC ", "jon", SECRET),
    canonical,
  );
});

test("differs per viewer", async () => {
  const a = await derivePassword("jon@sno.llc", "jon", SECRET);
  const b = await derivePassword("someone@else.com", "someone", SECRET);
  assert.notEqual(a, b);
});

test("differs per ref for the same viewer", async () => {
  const a = await derivePassword("jon@sno.llc", "jon", SECRET);
  const b = await derivePassword("jon@sno.llc", "lp-intro", SECRET);
  assert.notEqual(a, b);
});

test("differs when the secret is rotated", async () => {
  const a = await derivePassword("jon@sno.llc", "jon", SECRET);
  const b = await derivePassword("jon@sno.llc", "jon", "rotated-secret");
  assert.notEqual(a, b);
});
