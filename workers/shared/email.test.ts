import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidEmail, normalizeEmail, refFromEmail } from "./email.ts";

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  Jon@SNO.LLC "), "jon@sno.llc");
});

test("normalizeEmail turns a missing form field into an empty string", () => {
  assert.equal(normalizeEmail(null), "");
  assert.equal(normalizeEmail(undefined), "");
  assert.equal(normalizeEmail(new File([], "x")), "");
});

test("isValidEmail accepts an ordinary address", () => {
  assert.equal(isValidEmail("jon@sno.llc"), true);
  assert.equal(isValidEmail("a.person+tag@example.co.uk"), true);
});

test("isValidEmail rejects addresses with no domain, no dot, or whitespace", () => {
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("jon"), false);
  assert.equal(isValidEmail("jon@localhost"), false);
  assert.equal(isValidEmail("jon @sno.llc"), false);
});

test("refFromEmail uses the local part, letters and digits only", () => {
  assert.equal(refFromEmail("jon@sno.llc"), "jon");
  assert.equal(refFromEmail("a.person+tag@example.com"), "apersontag");
  assert.equal(refFromEmail("Jon.Smith@Example.com"), "jonsmith");
});
