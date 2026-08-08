import assert from "node:assert/strict";
import { test } from "node:test";
import {
  base32Encode,
  hmacHex,
  hmacSha256,
  timingSafeEqual,
  verifyHmacHex,
} from "./crypto.ts";

test("hmacHex is stable for the same message and secret", async () => {
  const a = await hmacHex("jon@sno.llc", "s3cret");
  const b = await hmacHex("jon@sno.llc", "s3cret");
  assert.equal(a, b);
});

test("hmacHex is 64 lowercase hex characters", async () => {
  const hex = await hmacHex("jon@sno.llc", "s3cret");
  assert.match(hex, /^[0-9a-f]{64}$/);
});

test("hmacHex changes when the secret changes", async () => {
  const a = await hmacHex("jon@sno.llc", "one");
  const b = await hmacHex("jon@sno.llc", "two");
  assert.notEqual(a, b);
});

test("hmacSha256 returns the raw 32 bytes behind hmacHex", async () => {
  const bytes = await hmacSha256("jon@sno.llc", "s3cret");
  assert.equal(bytes.length, 32);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  assert.equal(hex, await hmacHex("jon@sno.llc", "s3cret"));
});

test("verifyHmacHex accepts a signature this secret produced", async () => {
  const sig = await hmacHex("jon@sno.llc", "s3cret");
  assert.equal(await verifyHmacHex("jon@sno.llc", sig, "s3cret"), true);
});

test("verifyHmacHex rejects a signature from a different secret", async () => {
  const sig = await hmacHex("jon@sno.llc", "other");
  assert.equal(await verifyHmacHex("jon@sno.llc", sig, "s3cret"), false);
});

test("verifyHmacHex rejects a signature for a different message", async () => {
  const sig = await hmacHex("someone@else.com", "s3cret");
  assert.equal(await verifyHmacHex("jon@sno.llc", sig, "s3cret"), false);
});

test("verifyHmacHex rejects a truncated signature", async () => {
  const sig = await hmacHex("jon@sno.llc", "s3cret");
  assert.equal(
    await verifyHmacHex("jon@sno.llc", sig.slice(0, 32), "s3cret"),
    false,
  );
});

test("timingSafeEqual matches only on identical strings", () => {
  assert.equal(timingSafeEqual("abc", "abc"), true);
  assert.equal(timingSafeEqual("abc", "abd"), false);
  assert.equal(timingSafeEqual("abc", "abcd"), false);
  assert.equal(timingSafeEqual("", ""), true);
});

test("base32Encode matches the RFC 4648 test vectors, unpadded", () => {
  const enc = (s: string) => base32Encode(new TextEncoder().encode(s));
  assert.equal(enc(""), "");
  assert.equal(enc("f"), "MY");
  assert.equal(enc("fo"), "MZXQ");
  assert.equal(enc("foo"), "MZXW6");
  assert.equal(enc("foob"), "MZXW6YQ");
  assert.equal(enc("fooba"), "MZXW6YTB");
  assert.equal(enc("foobar"), "MZXW6YTBOI");
});

test("base32Encode only emits alphabet characters", () => {
  const out = base32Encode(
    new Uint8Array(Array.from({ length: 64 }, (_, i) => i * 3)),
  );
  assert.match(out, /^[A-Z2-7]+$/);
});
