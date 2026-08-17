// What is distinctive about the deck gate: a shared DECK_PASSWORD, a ref that
// bypasses that password, a 30-day cookie scoped to the whole site, and the
// ref-in-the-URL rewrite that makes forwarded deck links attributable.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./index.ts";
import { signViewerCookie } from "../../shared/cookie.ts";

const HMAC_SECRET = "test-hmac-secret";
const DECK_PASSWORD = "open-sesame";

function env(overrides: Record<string, unknown> = {}) {
  return {
    DB: fakeDb(),
    HMAC_SECRET,
    ADMIN_TOKEN: "admin-token",
    POSTHOG_API_KEY: "",
    DECK_PASSWORD,
    ...overrides,
  } as never;
}

function fakeDb(refOwner: string | null = null) {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        async run() {},
        async first() {
          return refOwner ? { email: refOwner } : null;
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
}

function post(body: Record<string, string>, cookie?: string): Request {
  const form = new FormData();
  for (const [k, v] of Object.entries(body)) form.append(k, v);
  return new Request("https://snocap.vc/deck", {
    method: "POST",
    body: form,
    headers: cookie ? { Cookie: cookie } : {},
  });
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function stubOrigin(body = "origin") {
  globalThis.fetch = (async () =>
    new Response(body, { headers: { "X-Origin": "1" } })) as typeof fetch;
}

function setCookies(res: Response): string[] {
  return res.headers.getSetCookie();
}

test("a plain visit shows the gate and asks for the shared access code", async () => {
  const res = await worker.fetch(new Request("https://snocap.vc/deck"), env());
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<form method="POST" action="\/deck">/);
  assert.match(html, /<input type="password" name="password"/);
});

test("a ref in the URL drops the password field — the deck's ref bypass", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/deck?ref=jon"),
    env(),
  );
  const html = await res.text();
  assert.ok(!html.includes(String.raw`name="password"`));
  assert.match(html, /<input type="hidden" name="ref" value="jon" \/>/);
});

test("a ref in the URL is remembered in a ref cookie", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/deck?ref=jon"),
    env(),
  );
  assert.ok(setCookies(res).some((c) => c.startsWith("snocap_ref=jon;")));
});

test("submitting the right password sets a 30-day site-wide viewer cookie", async () => {
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: DECK_PASSWORD }),
    env(),
  );
  assert.equal(res.status, 200);
  const viewer = setCookies(res).find((c) => c.startsWith("snocap_viewer="));
  assert.ok(viewer);
  assert.match(viewer!, /Max-Age=2592000/);
  assert.match(viewer!, /Path=\/;/);
  // Readable by deck-tracker.js, so deliberately not HttpOnly.
  assert.ok(!viewer!.includes("HttpOnly"));
});

test("a successful submit shows the success page with a QR handoff, not an instant redirect", async () => {
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: DECK_PASSWORD }),
    env(),
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Location"), null);
  const html = await res.text();
  assert.match(html, /You're in\./);
  assert.match(html, /<svg/);
  assert.match(html, /href="https:\/\/snocap\.vc\/deck"/);
});

test("submitting the wrong password is rejected", async () => {
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "wrong" }),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Invalid access code\./);
});

test("no password is needed when a ref is supplied", async () => {
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", ref: "jon" }),
    env(),
  );
  assert.equal(res.status, 200);
});

test("an unset DECK_PASSWORD locks everyone out rather than letting them in", async () => {
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "" }),
    env({ DECK_PASSWORD: "" }),
  );
  assert.equal(res.status, 400);
});

test("a malformed email is rejected before any password check", async () => {
  const res = await worker.fetch(
    post({ email: "not-an-email", password: DECK_PASSWORD }),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /valid email address/);
});

test("a return_to outside /deck is ignored", async () => {
  const res = await worker.fetch(
    post({
      email: "jon@sno.llc",
      password: DECK_PASSWORD,
      return_to: "https://evil.com/",
    }),
    env(),
  );
  assert.equal(res.headers.get("Location"), null);
  const html = await res.text();
  assert.match(html, /href="https:\/\/snocap\.vc\/deck"/);
  assert.ok(!html.includes("evil.com"));
});

test("a return_to inside /deck is honoured", async () => {
  const res = await worker.fetch(
    post({
      email: "jon@sno.llc",
      password: DECK_PASSWORD,
      return_to: "/deck/appendix",
    }),
    env(),
  );
  const html = await res.text();
  assert.match(html, /href="https:\/\/snocap\.vc\/deck\/appendix"/);
});

test("a ref already taken by someone else gets a suffix", async () => {
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: DECK_PASSWORD }),
    env({ DB: fakeDb("someone.else@example.com") }),
  );
  const ref = setCookies(res).find((c) => c.startsWith("snocap_ref="));
  assert.match(ref!, /^snocap_ref=jon-[0-9a-f]{6};/);
});

test("a signed cookie on the deck root redirects to add the ref to the URL", async () => {
  const cookie = `snocap_viewer=${encodeURIComponent(await signViewerCookie("jon@sno.llc", HMAC_SECRET))}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/deck", { headers: { Cookie: cookie } }),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "https://snocap.vc/deck?ref=jon");
});

test("a signed cookie on a deck sub-path passes through to the origin", async () => {
  stubOrigin("the deck");
  const cookie = [
    `snocap_viewer=${encodeURIComponent(await signViewerCookie("jon@sno.llc", HMAC_SECRET))}`,
    "snocap_ref=jon",
  ].join("; ");
  const res = await worker.fetch(
    new Request("https://snocap.vc/deck/assets/x.png", {
      headers: { Cookie: cookie },
    }),
    env(),
  );
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "the deck");
});

test("a forged cookie gets the gate, not the deck", async () => {
  const forged = `${btoa("attacker@evil.com")}.${"00".repeat(32)}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/deck", {
      headers: { Cookie: `snocap_viewer=${encodeURIComponent(forged)}` },
    }),
    env(),
  );
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<form method="POST" action="\/deck">/);
});

test("paths outside /deck are not this worker's business", async () => {
  stubOrigin("home page");
  const res = await worker.fetch(new Request("https://snocap.vc/"), env());
  assert.equal(await res.text(), "home page");
});

test("the admin table lives at /deck/admin and needs the admin token", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/deck/admin"),
    env(),
  );
  assert.equal(res.status, 401);

  const ok = await worker.fetch(
    new Request("https://snocap.vc/deck/admin?token=admin-token"),
    env(),
  );
  assert.match(await ok.text(), /<h1>Deck Viewers<\/h1>/);
});
