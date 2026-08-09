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
const NOW = 1_700_000_000; // fixed clock: no test may depend on the real one
const DAY = 60 * 60 * 24;

function requestWithCookies(cookies: string): Request {
  return new Request("https://snocap.vc/deck", {
    headers: { Cookie: cookies },
  });
}

function cookieRequest(value: string): Request {
  return requestWithCookies(`v=${encodeURIComponent(value)}`);
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

test("encode and decode round-trip the email, issue time and signature", () => {
  const value = encodeViewerCookie("jon@sno.llc", NOW, "deadbeef");
  assert.deepEqual(decodeViewerCookie(value), {
    email: "jon@sno.llc",
    issuedAt: NOW,
    hmac: "deadbeef",
  });
});

test("the email stays readable up to the first dot, for deck-tracker.js", () => {
  // public/deck/deck-tracker.js does atob(value.slice(0, indexOf("."))).
  const value = encodeViewerCookie("jon@sno.llc", NOW, "deadbeef");
  assert.equal(atob(value.slice(0, value.indexOf("."))), "jon@sno.llc");
});

test("decodeViewerCookie rejects the wrong segment count or an empty segment", () => {
  assert.equal(decodeViewerCookie("nodothere"), null);
  assert.equal(decodeViewerCookie(`.${NOW}.deadbeef`), null);
  assert.equal(decodeViewerCookie(`${btoa("jon@sno.llc")}.${NOW}.`), null);
  assert.equal(decodeViewerCookie(`${btoa("jon@sno.llc")}.${NOW}.a.b`), null);
});

test("decodeViewerCookie rejects a non-numeric or unsafe issue time", () => {
  assert.equal(
    decodeViewerCookie(`${btoa("jon@sno.llc")}.notanumber.deadbeef`),
    null,
  );
  assert.equal(
    decodeViewerCookie(`${btoa("jon@sno.llc")}.99999999999999999999.deadbeef`),
    null,
  );
});

test("decodeViewerCookie rejects a value whose first segment is not base64", () => {
  assert.equal(decodeViewerCookie(`!!!!.${NOW}.deadbeef`), null);
});

test("decodeViewerCookie rejects the legacy two-segment cookie", () => {
  // The old format carried no issue time, so it could never be aged out.
  assert.equal(decodeViewerCookie(`${btoa("jon@sno.llc")}.deadbeef`), null);
});

test("signViewerCookie signs the email bound to its issue time", async () => {
  const value = await signViewerCookie("jon@sno.llc", SECRET, NOW);
  const parsed = decodeViewerCookie(value);
  assert.equal(parsed?.email, "jon@sno.llc");
  assert.equal(parsed?.issuedAt, NOW);
  assert.equal(parsed?.hmac, await hmacHex(`jon@sno.llc|${NOW}`, SECRET));
});

test("signViewerCookie defaults the issue time to now", async () => {
  const before = Math.floor(Date.now() / 1000);
  const parsed = decodeViewerCookie(
    await signViewerCookie("jon@sno.llc", SECRET),
  );
  assert.ok(parsed !== null);
  assert.ok(parsed.issuedAt >= before);
  assert.ok(parsed.issuedAt <= Math.floor(Date.now() / 1000));
});

test("verifiedEmail returns the email for a correctly signed, unexpired cookie", async () => {
  const req = cookieRequest(await signViewerCookie("jon@sno.llc", SECRET, NOW));
  assert.equal(
    await verifiedEmail(req, "v", SECRET, DAY, NOW + 60),
    "jon@sno.llc",
  );
});

test("verifiedEmail rejects a cookie older than the worker's lifetime", async () => {
  const req = cookieRequest(await signViewerCookie("jon@sno.llc", SECRET, NOW));
  assert.equal(await verifiedEmail(req, "v", SECRET, DAY, NOW + DAY + 1), null);
});

test("verifiedEmail accepts a cookie exactly at the lifetime boundary", async () => {
  const req = cookieRequest(await signViewerCookie("jon@sno.llc", SECRET, NOW));
  assert.equal(
    await verifiedEmail(req, "v", SECRET, DAY, NOW + DAY),
    "jon@sno.llc",
  );
});

test("the two gates expire independently at their own lifetimes", async () => {
  // A dealroom cookie (24h) must be dead at an age the deck (30d) still allows.
  const req = cookieRequest(await signViewerCookie("jon@sno.llc", SECRET, NOW));
  const twoDaysLater = NOW + DAY * 2;
  assert.equal(await verifiedEmail(req, "v", SECRET, DAY, twoDaysLater), null);
  assert.equal(
    await verifiedEmail(req, "v", SECRET, DAY * 30, twoDaysLater),
    "jon@sno.llc",
  );
});

test("verifiedEmail rejects a cookie stamped in the future beyond clock skew", async () => {
  const req = cookieRequest(
    await signViewerCookie("jon@sno.llc", SECRET, NOW + 3600),
  );
  assert.equal(await verifiedEmail(req, "v", SECRET, DAY, NOW), null);
});

test("verifiedEmail tolerates small clock skew between edge nodes", async () => {
  const req = cookieRequest(
    await signViewerCookie("jon@sno.llc", SECRET, NOW + 5),
  );
  assert.equal(await verifiedEmail(req, "v", SECRET, DAY, NOW), "jon@sno.llc");
});

test("verifiedEmail rejects an issue time swapped for a later one", async () => {
  // The HMAC covers "email|issuedAt", so a replayed cookie cannot be handed a
  // fresh timestamp to extend its life.
  const value = await signViewerCookie("jon@sno.llc", SECRET, NOW);
  const parsed = decodeViewerCookie(value);
  assert.ok(parsed !== null);
  const extended = encodeViewerCookie(
    parsed.email,
    NOW + DAY * 10,
    parsed.hmac,
  );
  assert.equal(
    await verifiedEmail(
      cookieRequest(extended),
      "v",
      SECRET,
      DAY,
      NOW + DAY * 10,
    ),
    null,
  );
});

test("verifiedEmail rejects a legacy two-segment cookie outright", async () => {
  const legacy = `${btoa("jon@sno.llc")}.${await hmacHex("jon@sno.llc", SECRET)}`;
  assert.equal(
    await verifiedEmail(cookieRequest(legacy), "v", SECRET, DAY, NOW),
    null,
  );
});

test("verifiedEmail rejects a forged signature", async () => {
  const forged = encodeViewerCookie("attacker@evil.com", NOW, "00".repeat(32));
  assert.equal(
    await verifiedEmail(cookieRequest(forged), "v", SECRET, DAY, NOW),
    null,
  );
});

test("verifiedEmail rejects a cookie signed with a different secret", async () => {
  const value = await signViewerCookie("jon@sno.llc", "some-other-secret", NOW);
  assert.equal(
    await verifiedEmail(cookieRequest(value), "v", SECRET, DAY, NOW),
    null,
  );
});

test("verifiedEmail rejects a swapped email with a valid signature for another", async () => {
  const hmac = await hmacHex(`jon@sno.llc|${NOW}`, SECRET);
  const swapped = encodeViewerCookie("attacker@evil.com", NOW, hmac);
  assert.equal(
    await verifiedEmail(cookieRequest(swapped), "v", SECRET, DAY, NOW),
    null,
  );
});

test("verifiedEmail returns null when no cookie is present", async () => {
  const req = new Request("https://snocap.vc/deck");
  assert.equal(await verifiedEmail(req, "v", SECRET, DAY, NOW), null);
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
