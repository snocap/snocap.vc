// The rules a link must satisfy before it is stored: what a slug may be, what
// a destination may be, and exactly when an expiry date takes effect.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeRecord,
  emailAllowed,
  isExpired,
  normalizeSlug,
  parseExpiry,
  parseTargetUrl,
  slugError,
} from "./links.ts";

const NOON = Date.UTC(2026, 7, 12, 12, 0, 0); // 2026-08-12T12:00:00Z

test("a slug is lowercased and stripped of surrounding slashes", () => {
  assert.equal(normalizeSlug("/Fund-Two/"), "fund-two");
  assert.equal(normalizeSlug("  DECK  "), "deck");
  assert.equal(normalizeSlug(undefined), "");
});

test("a plain slug is accepted", () => {
  assert.equal(slugError("fund-two"), null);
  assert.equal(slugError("a"), null);
  assert.equal(slugError("deck_2026"), null);
});

test("an empty slug is rejected", () => {
  assert.match(slugError("") ?? "", /Choose a short path/);
});

test("a slug may be almost anything that survives a URL round trip", () => {
  // Dropped the old `^[a-z0-9][a-z0-9_-]{0,63}$` corset: dots, leading hyphens,
  // spaces, percent literals, unicode, and long values are all fine now — they
  // are escaped where rendered and percent-encoded where they enter a URL.
  for (const slug of [
    "a.b",
    "a%2fb",
    "a b",
    "a?b",
    "-lead",
    "_lead",
    "café",
    "a".repeat(200),
  ]) {
    assert.equal(slugError(slug), null, `${slug} should be accepted`);
  }
});

test("a slug may nest, up to MAX_SLUG_SEGMENTS", () => {
  for (const slug of ["a/b", "deck/fund2", "nested/deep/slug", "a/b/c/d"]) {
    assert.equal(slugError(slug), null, `${slug} should be accepted`);
  }
  assert.match(slugError("a/b/c/d/e") ?? "", /segments deep/);
});

test("the traversal shapes stay refused, which is what the old no-slash rule was for", () => {
  // Validation is per segment, so "." and ".." cannot appear as one — the reason
  // the slash ban existed in the first place. An empty segment is a missing
  // segment, not a permitted one.
  for (const slug of ["..", ".", "../etc", "deck/..", "deck/."]) {
    assert.match(slugError(slug) ?? "", /cannot be|empty segment/, slug);
  }
  for (const slug of ["a//b", "a/b//c"]) {
    assert.match(slugError(slug) ?? "", /empty segment/, slug);
  }
});

test("only the FIRST segment is reserved — deeper down it shadows nothing", () => {
  assert.match(slugError("create") ?? "", /reserved/);
  assert.match(slugError("create/deck") ?? "", /reserved/);
  assert.match(slugError("qr/x") ?? "", /reserved/);
  assert.match(slugError("peek/x") ?? "", /reserved/);
  assert.equal(slugError("deck/create"), null);
  assert.equal(slugError("fund2/qr"), null);
});

test("a slug that cannot be urlencoded is rejected", () => {
  // A lone surrogate makes encodeURIComponent throw — the literal boundary of
  // "anything we can urlencode".
  assert.ok(slugError("\uD800"));
});

test("only the tool's live endpoint is reserved", () => {
  // `create` is a real route (POST /link/create), so a slug cannot shadow it.
  assert.match(slugError("create") ?? "", /reserved/);
  // The rest were hypothetical — no route serves them, so they are ordinary slugs.
  for (const slug of ["admin", "login", "logout", "new", "api"]) {
    assert.equal(slugError(slug), null, `${slug} should be accepted`);
  }
});

test("an http or https destination is accepted and normalized", () => {
  assert.deepEqual(parseTargetUrl("https://example.com/a?b=1"), {
    url: "https://example.com/a?b=1",
  });
  assert.deepEqual(parseTargetUrl("  http://example.com  "), {
    url: "http://example.com/",
  });
});

test("a javascript: or data: destination is rejected", () => {
  // An open redirector that echoes these into a Location header is an XSS
  // vector, not just a bad link.
  for (const value of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ]) {
    const result = parseTargetUrl(value);
    assert.ok("error" in result, `${value} should be rejected`);
    assert.match(result.error, /http:\/\/ and https:\/\//);
  }
});

test("a destination that is not a URL at all is rejected", () => {
  const result = parseTargetUrl("example.com/no-scheme");
  assert.ok("error" in result);
  assert.match(result.error, /not a valid URL/);
});

test("an empty destination is rejected", () => {
  const result = parseTargetUrl("   ");
  assert.ok("error" in result);
  assert.match(result.error, /Enter the URL/);
});

test("a destination pointing back at the shortener is rejected", () => {
  // Otherwise a link can be aimed at itself and loop.
  for (const value of [
    "https://snocap.vc/link/foo",
    "https://snocap.vc/link",
    "https://sno.llc/r/foo",
    "https://SNO.LLC/r/foo",
  ]) {
    const result = parseTargetUrl(value);
    assert.ok("error" in result, `${value} should be rejected`);
    assert.match(result.error, /cannot point at the shortener/);
  }
});

test("a destination elsewhere on snocap.vc is fine", () => {
  assert.deepEqual(parseTargetUrl("https://snocap.vc/deck"), {
    url: "https://snocap.vc/deck",
  });
});

test("no expiry means a permanent link", () => {
  assert.deepEqual(parseExpiry("", NOON), { expiresAt: null });
  assert.deepEqual(parseExpiry(undefined, NOON), { expiresAt: null });
});

test("an expiry date runs to the END of that day, UTC", () => {
  // The link works through all of 2026-08-20 and dies at 00:00:00Z on the 21st.
  assert.deepEqual(parseExpiry("2026-08-20", NOON), {
    expiresAt: Date.UTC(2026, 7, 21, 0, 0, 0),
  });
});

test("today is a valid expiry — the link lasts the rest of the day", () => {
  assert.deepEqual(parseExpiry("2026-08-12", NOON), {
    expiresAt: Date.UTC(2026, 7, 13, 0, 0, 0),
  });
});

test("a date already past is rejected", () => {
  const result = parseExpiry("2026-08-11", NOON);
  assert.ok("error" in result);
  assert.match(result.error, /already passed/);
});

test("a date that does not exist is rejected", () => {
  // Date.UTC would silently roll these forward into the next month.
  for (const value of ["2026-02-30", "2026-13-01", "2026-04-31"]) {
    const result = parseExpiry(value, NOON);
    assert.ok("error" in result, `${value} should be rejected`);
    assert.match(result.error, /not a real date/);
  }
});

test("a malformed expiry is rejected", () => {
  for (const value of ["20/08/2026", "tomorrow", "2026-8-2"]) {
    const result = parseExpiry(value, NOON);
    assert.ok("error" in result, `${value} should be rejected`);
  }
});

test("a permanent record never expires", () => {
  const record = {
    url: "https://example.com/",
    expiresAt: null,
    createdAt: 0,
    createdBy: "jon@sno.llc",
  };
  assert.equal(isExpired(record, NOON), false);
  assert.equal(isExpired(record, NOON + 1e12), false);
});

test("expiry is exclusive: the link is dead at the instant it names", () => {
  const record = {
    url: "https://example.com/",
    expiresAt: NOON,
    createdAt: 0,
    createdBy: "jon@sno.llc",
  };
  assert.equal(isExpired(record, NOON - 1), false);
  assert.equal(isExpired(record, NOON), true);
});

test("a stored record round-trips", () => {
  // The api returns the record as parsed JSON, so decodeRecord validates an
  // object rather than a string.
  const record = {
    url: "https://example.com/",
    expiresAt: NOON,
    createdAt: 1,
    createdBy: "jon@sno.llc",
  };
  assert.deepEqual(decodeRecord({ ...record }), record);
});

test("an unreadable record decodes to null so it can be treated as a miss", () => {
  assert.equal(decodeRecord(null), null);
  assert.equal(decodeRecord(undefined), null);
  assert.equal(decodeRecord("not an object"), null);
  assert.equal(decodeRecord({}), null);
  assert.equal(decodeRecord({ url: "" }), null);
  assert.equal(decodeRecord({ url: 42 }), null);
});

test("a record missing its expiry is read as permanent", () => {
  assert.deepEqual(decodeRecord({ url: "https://example.com/" }), {
    url: "https://example.com/",
    expiresAt: null,
    createdAt: 0,
    createdBy: "",
  });
});

test("only allowlisted email domains may sign in", () => {
  assert.equal(emailAllowed("jon@sno.llc", "sno.llc,snocap.vc"), true);
  assert.equal(emailAllowed("jon@snocap.vc", "sno.llc,snocap.vc"), true);
  assert.equal(emailAllowed("someone@evil.com", "sno.llc,snocap.vc"), false);
});

test("an empty domain list allows any address", () => {
  assert.equal(emailAllowed("someone@evil.com", ""), true);
  assert.equal(emailAllowed("someone@evil.com", undefined), true);
});
