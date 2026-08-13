// What is distinctive about the link worker: a permanent redirect only for a
// link that can never expire, one indistinguishable miss for everything else,
// and a create endpoint reachable only with a signed session cookie.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./index.ts";
import { linkKey } from "./links.ts";
import { signViewerCookie } from "../../shared/cookie.ts";

const SESSION_SECRET = "test-session-secret";
const ADMIN_PASSWORD = "test-admin-password";
const HOME = "https://snocap.vc/";

function fakeKv(seed: Record<string, unknown> = {}) {
  const store = new Map<string, string>();
  for (const [slug, record] of Object.entries(seed)) {
    store.set(linkKey(slug), JSON.stringify(record));
  }
  return {
    puts: [] as { key: string; options: Record<string, unknown> }[],
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string, options: Record<string, unknown>) {
      store.set(key, value);
      this.puts.push({ key, options });
    },
    read(slug: string) {
      const raw = store.get(linkKey(slug));
      return raw ? JSON.parse(raw) : null;
    },
  };
}

function env(overrides: Record<string, unknown> = {}) {
  return {
    LINKS: fakeKv(),
    LINK_SESSION_SECRET: SESSION_SECRET,
    LINK_ADMIN_PASSWORD: ADMIN_PASSWORD,
    LINK_ALLOWED_EMAIL_DOMAINS: "sno.llc,snocap.vc",
    ...overrides,
  } as never;
}

async function session(email = "jon@sno.llc"): Promise<string> {
  return `link_admin=${encodeURIComponent(await signViewerCookie(email, SESSION_SECRET))}`;
}

function createRequest(body: Record<string, string>, cookie?: string): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) form.append(key, value);
  return new Request("https://snocap.vc/link/create", {
    method: "POST",
    body: form,
    headers: cookie ? { Cookie: cookie } : {},
  });
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ── the redirect, which is the whole point ────────────────────────────────────

test("a link with no expiry redirects permanently", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env({
      LINKS: fakeKv({
        deck: { url: "https://example.com/deck", expiresAt: null },
      }),
    }),
  );
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("Location"), "https://example.com/deck");
});

test("a link WITH an expiry redirects temporarily and is never cached", async () => {
  // A 301 here would let a browser keep following a link past its expiry date.
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/promo"),
    env({
      LINKS: fakeKv({
        promo: {
          url: "https://example.com/promo",
          expiresAt: Date.now() + 86_400_000,
        },
      }),
    }),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "https://example.com/promo");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("a permanent redirect carries a bounded cache lifetime", async () => {
  // Explicit, because a 301 with no Cache-Control is cached indefinitely and a
  // mistyped destination would be unfixable for anyone who followed it.
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env({
      LINKS: fakeKv({ deck: { url: "https://example.com/", expiresAt: null } }),
    }),
  );
  assert.match(res.headers.get("Cache-Control") ?? "", /max-age=3600/);
});

test("an expired link redirects to snocap.vc", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/gone"),
    env({
      LINKS: fakeKv({
        gone: { url: "https://example.com/gone", expiresAt: Date.now() - 1000 },
      }),
    }),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("an unknown link redirects to snocap.vc rather than 404ing", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/never-existed"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("an expired link is indistinguishable from one that never existed", async () => {
  // No information leak about whether a slug was ever real.
  const expired = await worker.fetch(
    new Request("https://snocap.vc/link/gone"),
    env({
      LINKS: fakeKv({
        gone: { url: "https://example.com/", expiresAt: Date.now() - 1000 },
      }),
    }),
  );
  const unknown = await worker.fetch(
    new Request("https://snocap.vc/link/never-existed"),
    env(),
  );
  assert.equal(expired.status, unknown.status);
  assert.equal(
    expired.headers.get("Location"),
    unknown.headers.get("Location"),
  );
  assert.equal(
    expired.headers.get("Cache-Control"),
    unknown.headers.get("Cache-Control"),
  );
  assert.equal(await expired.text(), await unknown.text());
});

test("a miss is never a permanent redirect", async () => {
  // The slug may be created tomorrow, so nothing about a miss may be cached.
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/never-existed"),
    env(),
  );
  assert.notEqual(res.status, 301);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("an unreadable stored record is treated as a miss", async () => {
  const links = fakeKv();
  await links.put(linkKey("broken"), "not json", {});
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/broken"),
    env({ LINKS: links }),
  );
  assert.equal(res.headers.get("Location"), HOME);
});

test("a slug is resolved case-insensitively", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/DECK"),
    env({
      LINKS: fakeKv({ deck: { url: "https://example.com/", expiresAt: null } }),
    }),
  );
  assert.equal(res.status, 301);
});

test("a multi-segment or encoded-traversal slug is a miss, not a path escape", async () => {
  for (const path of [
    "/link/a/b",
    "/link/%2e%2e%2fdeck",
    "/link/..%2fdeck",
    "/link/a.b",
  ]) {
    const res = await worker.fetch(
      new Request(`https://snocap.vc${path}`),
      env(),
    );
    assert.equal(res.headers.get("Location"), HOME, path);
  }
});

test("a literal ../ never reaches the worker as a slug", async () => {
  // The URL parser collapses /link/../deck to /deck before the worker runs, so
  // the request is simply not this worker's business — there is no slug to
  // escape from. Asserted so a future refactor cannot quietly start treating
  // the un-normalized form as a lookup.
  globalThis.fetch = (async (input: Request) => {
    return new Response(new URL((input as Request).url).pathname);
  }) as unknown as typeof fetch;
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/../deck"),
    env(),
  );
  assert.equal(await res.text(), "/deck");
});

// ── the sno.llc/r/* surface ───────────────────────────────────────────────────

test("sno.llc/r/<slug> resolves the same link as snocap.vc/link/<slug>", async () => {
  const seed = { deck: { url: "https://example.com/deck", expiresAt: null } };
  const short = await worker.fetch(
    new Request("https://sno.llc/r/deck"),
    env({ LINKS: fakeKv(seed) }),
  );
  const long = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env({ LINKS: fakeKv(seed) }),
  );
  assert.equal(short.status, long.status);
  assert.equal(short.headers.get("Location"), long.headers.get("Location"));
});

test("an unknown slug on sno.llc/r/ redirects to snocap.vc", async () => {
  const res = await worker.fetch(
    new Request("https://sno.llc/r/never-existed"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("sno.llc/r with no slug redirects to snocap.vc", async () => {
  const res = await worker.fetch(new Request("https://sno.llc/r"), env());
  assert.equal(res.headers.get("Location"), HOME);
});

test("the short domain exposes no form and no create endpoint", async () => {
  globalThis.fetch = (async () => new Response("origin")) as typeof fetch;
  const res = await worker.fetch(
    new Request("https://sno.llc/link", {
      headers: { Cookie: await session() },
    }),
    env(),
  );
  assert.equal(await res.text(), "origin");
});

// ── the gate ──────────────────────────────────────────────────────────────────

test("bare /link unauthenticated shows the sign-in gate, not the form", async () => {
  const res = await worker.fetch(new Request("https://snocap.vc/link"), env());
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<form method="POST" action="\/link">/);
  assert.match(html, /<input type="password" name="password"/);
  assert.doesNotMatch(html, /name="pathname"/);
});

test("bare /link with a valid session shows the create form", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/link", {
      headers: { Cookie: await session() },
    }),
    env(),
  );
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<form method="POST" action="\/link\/create">/);
  assert.match(html, /name="pathname"/);
  assert.match(html, /name="expires"/);
  assert.match(html, /jon@sno\.llc/);
});

test("the access code opens the gate and sets a 12h HttpOnly cookie on /link", async () => {
  const form = new FormData();
  form.append("email", "jon@sno.llc");
  form.append("password", ADMIN_PASSWORD);
  const res = await worker.fetch(
    new Request("https://snocap.vc/link", { method: "POST", body: form }),
    env(),
  );
  assert.equal(res.status, 302);
  const cookie = res.headers
    .getSetCookie()
    .find((value) => value.startsWith("link_admin="));
  assert.ok(cookie);
  assert.match(cookie, /Max-Age=43200/);
  assert.match(cookie, /Path=\/link;/);
  assert.match(cookie, /HttpOnly/);
});

test("a wrong access code is refused", async () => {
  const form = new FormData();
  form.append("email", "jon@sno.llc");
  form.append("password", "wrong");
  const res = await worker.fetch(
    new Request("https://snocap.vc/link", { method: "POST", body: form }),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Invalid access code/);
});

test("an unset admin password keeps everyone out", async () => {
  const form = new FormData();
  form.append("email", "jon@sno.llc");
  form.append("password", "");
  const res = await worker.fetch(
    new Request("https://snocap.vc/link", { method: "POST", body: form }),
    env({ LINK_ADMIN_PASSWORD: "" }),
  );
  assert.equal(res.status, 400);
});

test("an email outside the allowed domains is refused even with the right code", async () => {
  const form = new FormData();
  form.append("email", "someone@evil.com");
  form.append("password", ADMIN_PASSWORD);
  const res = await worker.fetch(
    new Request("https://snocap.vc/link", { method: "POST", body: form }),
    env(),
  );
  assert.equal(res.status, 400);
  // Same wording as a bad code, so the form cannot enumerate allowed addresses.
  assert.match(await res.text(), /Invalid access code/);
});

test("a malformed email is refused", async () => {
  const form = new FormData();
  form.append("email", "nope");
  form.append("password", ADMIN_PASSWORD);
  const res = await worker.fetch(
    new Request("https://snocap.vc/link", { method: "POST", body: form }),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /valid email address/);
});

test("a forged session cookie gets the gate, not the form", async () => {
  const forged = `${btoa("attacker@evil.com")}.${Math.floor(Date.now() / 1000)}.${"00".repeat(32)}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/link", {
      headers: { Cookie: `link_admin=${encodeURIComponent(forged)}` },
    }),
    env(),
  );
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<input type="password" name="password"/);
});

test("a cookie signed with another worker's secret does not open the tool", async () => {
  const cookie = `link_admin=${encodeURIComponent(await signViewerCookie("jon@sno.llc", "some-other-worker-secret"))}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/link", { headers: { Cookie: cookie } }),
    env(),
  );
  assert.match(await res.text(), /<input type="password" name="password"/);
});

// ── creating a link ───────────────────────────────────────────────────────────

test("creating a link stores it and confirms the short URL", async () => {
  const links = fakeKv();
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/long/path", pathname: "Fund-Two" },
      await session(),
    ),
    env({ LINKS: links }),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "/link?created=fund-two");
  assert.deepEqual(links.read("fund-two"), {
    url: "https://example.com/long/path",
    expiresAt: null,
    createdAt: links.read("fund-two").createdAt,
    createdBy: "jon@sno.llc",
  });
});

test("a permanent link is stored with no KV TTL", async () => {
  const links = fakeKv();
  await worker.fetch(
    createRequest(
      { url: "https://example.com/", pathname: "forever" },
      await session(),
    ),
    env({ LINKS: links }),
  );
  assert.deepEqual(links.puts[0].options, {});
});

test("an expiring link is stored with a KV TTL as well as its date", async () => {
  const links = fakeKv();
  const year = new Date().getUTCFullYear() + 1;
  await worker.fetch(
    createRequest(
      {
        url: "https://example.com/",
        pathname: "temporary",
        expires: `${year}-06-01`,
      },
      await session(),
    ),
    env({ LINKS: links }),
  );
  assert.ok(typeof links.puts[0].options.expirationTtl === "number");
  assert.ok(links.read("temporary").expiresAt > Date.now());
});

test("a created link is immediately resolvable", async () => {
  const links = fakeKv();
  const context = env({ LINKS: links });
  await worker.fetch(
    createRequest(
      { url: "https://example.com/deck", pathname: "deck" },
      await session(),
    ),
    context,
  );
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    context,
  );
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("Location"), "https://example.com/deck");
});

test("creating a link requires a session", async () => {
  const links = fakeKv();
  const res = await worker.fetch(
    createRequest({ url: "https://example.com/", pathname: "sneaky" }),
    env({ LINKS: links }),
  );
  assert.equal(res.status, 401);
  assert.equal(links.read("sneaky"), null);
});

test("a javascript: destination is rejected", async () => {
  const links = fakeKv();
  const res = await worker.fetch(
    createRequest(
      { url: "javascript:alert(1)", pathname: "xss" },
      await session(),
    ),
    env({ LINKS: links }),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /http:\/\/ and https:\/\//);
  assert.equal(links.read("xss"), null);
});

test("an invalid pathname is rejected", async () => {
  const links = fakeKv();
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/", pathname: "../escape" },
      await session(),
    ),
    env({ LINKS: links }),
  );
  assert.equal(res.status, 400);
  assert.equal(links.read("../escape"), null);
});

test("a pathname colliding with the create endpoint is rejected", async () => {
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/", pathname: "create" },
      await session(),
    ),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /reserved/);
});

test("an expiry date in the past is rejected", async () => {
  const res = await worker.fetch(
    createRequest(
      {
        url: "https://example.com/",
        pathname: "stale",
        expires: "2020-01-01",
      },
      await session(),
    ),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /already passed/);
});

test("a rejected submission keeps what was typed", async () => {
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/keep-me", pathname: "../bad" },
      await session(),
    ),
    env(),
  );
  assert.match(await res.text(), /value="https:\/\/example\.com\/keep-me"/);
});

test("a live pathname cannot be repointed", async () => {
  // The old link is already in circulation and its 301 may be cached.
  const links = fakeKv({
    taken: { url: "https://example.com/original", expiresAt: null },
  });
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/hijacked", pathname: "taken" },
      await session(),
    ),
    env({ LINKS: links }),
  );
  assert.equal(res.status, 409);
  assert.match(await res.text(), /already taken/);
  assert.equal(links.read("taken").url, "https://example.com/original");
});

test("an expired pathname can be claimed again", async () => {
  const links = fakeKv({
    recycled: { url: "https://example.com/old", expiresAt: Date.now() - 1000 },
  });
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/new", pathname: "recycled" },
      await session(),
    ),
    env({ LINKS: links }),
  );
  assert.equal(res.status, 302);
  assert.equal(links.read("recycled").url, "https://example.com/new");
});

test("the destination URL never reaches the logs", async () => {
  // A short link often exists because the URL behind it is not public.
  const written: string[] = [];
  const originalLog = console.log;
  console.log = (value: string) => written.push(String(value));
  try {
    await worker.fetch(
      createRequest(
        { url: "https://secret.example.com/private-doc", pathname: "quiet" },
        await session(),
      ),
      env(),
    );
  } finally {
    console.log = originalLog;
  }
  assert.ok(written.length > 0, "creation should be logged");
  for (const line of written) {
    assert.doesNotMatch(line, /secret\.example\.com/);
    assert.doesNotMatch(line, /private-doc/);
  }
});

// ── everything else belongs to the origin ─────────────────────────────────────

test("paths outside /link are not this worker's business", async () => {
  globalThis.fetch = (async () => new Response("home page")) as typeof fetch;
  const res = await worker.fetch(new Request("https://snocap.vc/"), env());
  assert.equal(await res.text(), "home page");
});

test("a path merely starting with the tool's name is left alone", async () => {
  globalThis.fetch = (async () => new Response("origin")) as typeof fetch;
  const res = await worker.fetch(
    new Request("https://snocap.vc/linkedin"),
    env(),
  );
  assert.equal(await res.text(), "origin");
});
