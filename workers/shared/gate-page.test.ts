import assert from "node:assert/strict";
import { test } from "node:test";
import { renderGatePage, renderSuccessPage } from "./gate-page.ts";

const base = {
  title: "Test Gate",
  subtitle: "Subtitle",
  prompt: "Enter your email.",
  action: "/test",
  submitLabel: "Go",
  finePrint: "Fine print.",
};

test("renders the title, copy and form target", () => {
  const html = renderGatePage(base);
  assert.match(html, /<title>Test Gate<\/title>/);
  assert.match(html, /<div class="subtitle">Subtitle<\/div>/);
  assert.match(html, /<div class="prompt">Enter your email\.<\/div>/);
  assert.match(html, /<form method="POST" action="\/test">/);
  assert.match(html, /<button type="submit">Go<\/button>/);
  assert.match(html, /<div class="fine-print">Fine print\.<\/div>/);
});

test("always asks for an email", () => {
  assert.match(renderGatePage(base), /<input type="email" name="email"/);
});

test("asks for a password by default", () => {
  assert.match(renderGatePage(base), /<input type="password" name="password"/);
});

test("drops the password field when the caller says so", () => {
  const html = renderGatePage({ ...base, requirePassword: false });
  assert.ok(!html.includes(String.raw`name="password"`));
});

test("omits the background layer and its CSS unless an image is given", () => {
  const html = renderGatePage(base);
  assert.ok(!html.includes('class="bg"'));
  assert.ok(!html.includes(".bg::after"));
});

test("adds the background layer and its CSS when an image is given", () => {
  const html = renderGatePage({ ...base, backgroundImage: "https://x/y.jpg" });
  assert.match(html, /<div class="bg"><\/div>/);
  assert.match(html, /background: url\("https:\/\/x\/y\.jpg"\)/);
});

test("splices head extras in verbatim", () => {
  const html = renderGatePage({
    ...base,
    headExtra: `  <meta name="robots" content="noindex,nofollow" />`,
  });
  assert.match(html, /<meta name="robots" content="noindex,nofollow" \/>/);
});

test("shows an error only when there is one", () => {
  assert.ok(!renderGatePage(base).includes('class="error"'));
  assert.match(
    renderGatePage({ ...base, error: "Invalid access code." }),
    /<div class="error">Invalid access code\.<\/div>/,
  );
});

test("carries return_to and ref through as hidden fields", () => {
  const html = renderGatePage({ ...base, returnTo: "/deck/x", ref: "jon" });
  assert.match(
    html,
    /<input type="hidden" name="return_to" value="\/deck\/x" \/>/,
  );
  assert.match(html, /<input type="hidden" name="ref" value="jon" \/>/);
});

test("omits the hidden fields when there is nothing to carry", () => {
  const html = renderGatePage(base);
  assert.ok(!html.includes('name="return_to"'));
  assert.ok(!html.includes('name="ref"'));
});

// The ref comes straight off the query string, so it is attacker-controlled.
test("escapes a ref that tries to break out of its attribute", () => {
  const html = renderGatePage({
    ...base,
    ref: `"><script>alert(1)</script>`,
  });
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.match(html, /value="&quot;&gt;&lt;script&gt;/);
});

test("escapes a return_to that tries to break out of its attribute", () => {
  const html = renderGatePage({ ...base, returnTo: `/deck"><img src=x>` });
  assert.ok(!html.includes("<img src=x>"));
});

// ── renderSuccessPage ─────────────────────────────────────────────────────
// Shown after a successful gate submission: a short message, an inline
// server-generated QR code encoding continueUrl, and a link to go there
// directly on the current device.

const successBase = {
  title: "Test Success",
  subtitle: "Subtitle",
  message: "You're in.",
  continueUrl: "https://snocap.vc/deck",
};

test("renders the title, subtitle and message", () => {
  const html = renderSuccessPage(successBase);
  assert.match(html, /<title>Test Success<\/title>/);
  assert.match(html, /<div class="subtitle">Subtitle<\/div>/);
  assert.match(html, /You're in\./);
});

test("links continue to the given URL, defaulting the label to Continue", () => {
  const html = renderSuccessPage(successBase);
  assert.match(
    html,
    /<a class="button-link" href="https:\/\/snocap\.vc\/deck">Continue<\/a>/,
  );
});

test("uses a custom continue label when given one", () => {
  const html = renderSuccessPage({
    ...successBase,
    continueLabel: "View the deck",
  });
  assert.match(html, />View the deck<\/a>/);
});

test("renders an inline SVG QR code", () => {
  const html = renderSuccessPage(successBase);
  assert.match(html, /<div class="qr"><svg/);
});

test("splices head extras in verbatim", () => {
  const html = renderSuccessPage({
    ...successBase,
    headExtra: `  <meta name="robots" content="noindex,nofollow" />`,
  });
  assert.match(html, /<meta name="robots" content="noindex,nofollow" \/>/);
});

// message and continueUrl land in HTML text/attribute positions, so both
// must be escaped — message comes from a fixed per-gate string today, but
// continueUrl is derived from the request's return_to field.
test("escapes a message that tries to break out into markup", () => {
  const html = renderSuccessPage({
    ...successBase,
    message: `<script>alert(1)</script>`,
  });
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("escapes a continueUrl that tries to break out of its href attribute", () => {
  const html = renderSuccessPage({
    ...successBase,
    continueUrl: `https://snocap.vc/deck"><script>alert(1)</script>`,
  });
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.match(
    html,
    /href="https:\/\/snocap\.vc\/deck&quot;&gt;&lt;script&gt;/,
  );
});
