import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeViewerCookie,
  encodeViewerCookie,
  readCookie,
  setCookie,
  signViewerCookie,
  verifiedEmail,
} from "./cookie.ts";
import { hmacHex } from "./crypto.ts";

const SECRET = "test-hmac-secret";

function requestWithCookies(cookies: string): Request {
  return new Request("https://snocap.vc/deck", {
    headers: { Cookie: cookies },
  });
}

test("readCookie finds a cookie among several", () => {
  const req = requestWithCookies("a=1; snocap_viewer=abc.def; z=9");
  assert.equal(readCookie(req, "snocap_viewer"), "abc.def");
});

test("readCookie percent-decodes the value", () => {
  const req = requestWithCookies("snocap_viewer=abc%3Ddef");
  assert.equal(readCookie(req, "snocap_viewer"), "abc=def");
});

test("readCookie returns null when the cookie or the header is absent", () => {
  assert.equal(
    readCookie(requestWithCookies("other=1"), "snocap_viewer"),
    null,
  );
  assert.equal(
    readCookie(new Request("https://snocap.vc/deck"), "snocap_viewer"),
    null,
  );
});

test("readCookie does not match a cookie whose name merely ends with the target", () => {
  const req = requestWithCookies("not_snocap_viewer=nope; snocap_viewer=yes");
  assert.equal(readCookie(req, "snocap_viewer"), "yes");
});

test("encode and decode round-trip the email and signature", () => {
  const value = encodeViewerCookie("jon@sno.llc", "deadbeef");
  assert.deepEqual(decodeViewerCookie(value), {
    email: "jon@sno.llc",
    hmac: "deadbeef",
  });
});

test("decodeViewerCookie rejects values with no separator or an empty half", () => {
  assert.equal(decodeViewerCookie("nodothere"), null);
  assert.equal(decodeViewerCookie(".deadbeef"), null);
  assert.equal(decodeViewerCookie(btoa("jon@sno.llc") + "."), null);
});

test("decodeViewerCookie rejects a value whose first half is not base64", () => {
  assert.equal(decodeViewerCookie("!!!!.deadbeef"), null);
});

test("signViewerCookie signs the email with the shared HMAC", async () => {
  const value = await signViewerCookie("jon@sno.llc", SECRET);
  const parsed = decodeViewerCookie(value);
  assert.equal(parsed?.email, "jon@sno.llc");
  assert.equal(parsed?.hmac, await hmacHex("jon@sno.llc", SECRET));
});

test("verifiedEmail returns the email for a correctly signed cookie", async () => {
  const value = await signViewerCookie("jon@sno.llc", SECRET);
  const req = requestWithCookies(`v=${encodeURIComponent(value)}`);
  assert.equal(await verifiedEmail(req, "v", SECRET), "jon@sno.llc");
});

test("verifiedEmail rejects a forged signature", async () => {
  const forged = encodeViewerCookie("attacker@evil.com", "00".repeat(32));
  const req = requestWithCookies(`v=${encodeURIComponent(forged)}`);
  assert.equal(await verifiedEmail(req, "v", SECRET), null);
});

test("verifiedEmail rejects a cookie signed with a different secret", async () => {
  const value = await signViewerCookie("jon@sno.llc", "some-other-secret");
  const req = requestWithCookies(`v=${encodeURIComponent(value)}`);
  assert.equal(await verifiedEmail(req, "v", SECRET), null);
});

test("verifiedEmail rejects a swapped email with a valid signature for another", async () => {
  const hmac = await hmacHex("jon@sno.llc", SECRET);
  const swapped = encodeViewerCookie("attacker@evil.com", hmac);
  const req = requestWithCookies(`v=${encodeURIComponent(swapped)}`);
  assert.equal(await verifiedEmail(req, "v", SECRET), null);
});

test("verifiedEmail returns null when no cookie is present", async () => {
  const req = new Request("https://snocap.vc/deck");
  assert.equal(await verifiedEmail(req, "v", SECRET), null);
});

test("setCookie writes a Secure, SameSite=Lax cookie and omits HttpOnly by default", () => {
  const header = setCookie({
    name: "snocap_viewer",
    value: "abc.def",
    path: "/",
    maxAge: 2592000,
  });
  assert.equal(
    header,
    "snocap_viewer=abc.def; Path=/; Max-Age=2592000; Secure; SameSite=Lax",
  );
});

test("setCookie appends HttpOnly when asked", () => {
  const header = setCookie({
    name: "dealroom_viewer",
    value: "abc.def",
    path: "/dealroom",
    maxAge: 86400,
    httpOnly: true,
  });
  assert.equal(
    header,
    "dealroom_viewer=abc.def; Path=/dealroom; Max-Age=86400; Secure; SameSite=Lax; HttpOnly",
  );
});

test("setCookie percent-encodes the value", () => {
  const header = setCookie({
    name: "v",
    value: "a=b; c",
    path: "/",
    maxAge: 1,
  });
  assert.match(header, /^v=a%3Db%3B%20c; /);
});
