// What is distinctive about the link worker: a permanent redirect only for a
// link that can never expire, one indistinguishable miss for everything else
// (including an unreachable store), and a create endpoint reachable only with a
// signed session cookie. The store is no longer a KV binding — it is the
// kernelbot-api over HTTP (src/store.ts), so these tests drive the worker's
// `fetch` against a fake api stubbed onto globalThis.fetch.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./index.ts";
import type { LinkRecord } from "./links.ts";
import { signViewerCookie } from "../../shared/cookie.ts";

const SESSION_SECRET = "test-session-secret";
const ADMIN_PASSWORD = "test-admin-password";
const API_SECRET = "test-link-secret";
const API_BASE = "https://api.test";
const HOME = "https://snocap.vc/";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * A fake of the kernelbot-api's two link routes over a fetch stub. Models the
 * server-side rules the worker delegates: resolve drops an expired record
 * (found:false), and create is an atomic check-then-set that answers 409 only
 * when a LIVE record already holds the slug.
 *
 * It speaks the api's REAL vocabulary — a FLAT create body and records keyed on
 * `destination`, not this worker's `url`. That fidelity is the entire point.
 * The previous version of this fake accepted a nested `{ slug, record }` and
 * echoed `url` back, i.e. it mirrored the worker instead of the server; the
 * suite stayed green for weeks while every real create was rejected 400 and
 * every real resolve decoded to null. A mock that agrees with the code it is
 * mocking tests nothing. If you touch this, keep it matching
 * src/local/api/routes/link.ts in kernelbot, not store.ts next door.
 */
type ApiRecord = {
  destination: string;
  slug: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number | null;
};

function fakeApi(seed: Record<string, Partial<LinkRecord>> = {}) {
  // Stored api-side, in api field names.
  const store = new Map<string, ApiRecord>();
  for (const [slug, record] of Object.entries(seed)) {
    store.set(slug, {
      destination: record.url as string,
      slug,
      createdBy: record.createdBy ?? "",
      createdAt: record.createdAt ?? 0,
      expiresAt: record.expiresAt ?? null,
    });
  }
  const live = (record: ApiRecord | undefined): record is ApiRecord =>
    Boolean(
      record && (record.expiresAt === null || Date.now() < record.expiresAt),
    );
  const api = {
    store,
    calls: [] as { url: string; secret: string | null; body: unknown }[],
    /** Translated back into the worker's vocabulary for test assertions. */
    read(slug: string): LinkRecord | null {
      const record = store.get(slug);
      if (!record) return null;
      return {
        url: record.destination,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
        createdBy: record.createdBy,
      };
    },
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const secret = new Headers(init?.headers).get("x-link-secret");
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      api.calls.push({ url, secret, body });
      if (url.endsWith("/link/resolve")) {
        const record = store.get(body.slug);
        if (!live(record)) return jsonResponse({ found: false }, 200);
        return jsonResponse({ found: true, record }, 200);
      }
      if (url.endsWith("/link/create")) {
        // Reject exactly as the api does, so a malformed body can never look
        // like a success here while 400ing in production.
        if (typeof body.destination !== "string" || !body.destination) {
          return jsonResponse(
            { created: false, error: "invalid_destination" },
            400,
          );
        }
        if (live(store.get(body.slug))) {
          return jsonResponse(
            { created: false, error: "slug already taken" },
            409,
          );
        }
        const record: ApiRecord = {
          destination: body.destination,
          slug: body.slug,
          createdBy: body.createdBy ?? "",
          createdAt: Date.now(),
          expiresAt: body.expiresAt ?? null,
        };
        store.set(body.slug, record);
        return jsonResponse({ created: true, record }, 200);
      }
      throw new Error(`unexpected url ${url}`);
    }) as typeof fetch,
  };
  return api;
}

/** Install a fake api on globalThis.fetch and hand back its handle. */
function installApi(seed: Record<string, Partial<LinkRecord>> = {}) {
  const api = fakeApi(seed);
  globalThis.fetch = api.fetchImpl;
  return api;
}

function env(overrides: Record<string, unknown> = {}) {
  return {
    LINK_SESSION_SECRET: SESSION_SECRET,
    LINK_ADMIN_PASSWORD: ADMIN_PASSWORD,
    LINK_ALLOWED_EMAIL_DOMAINS: "sno.llc,snocap.vc",
    LINK_API_SECRET: API_SECRET,
    LINK_API_BASE: API_BASE,
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
  installApi({ deck: { url: "https://example.com/deck", expiresAt: null } });
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env(),
  );
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("Location"), "https://example.com/deck");
});

test("a link WITH an expiry redirects temporarily and is never cached", async () => {
  // A 301 here would let a browser keep following a link past its expiry date.
  installApi({
    promo: {
      url: "https://example.com/promo",
      expiresAt: Date.now() + 86_400_000,
    },
  });
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/promo"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "https://example.com/promo");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("a permanent redirect carries a bounded cache lifetime", async () => {
  // Explicit, because a 301 with no Cache-Control is cached indefinitely and a
  // mistyped destination would be unfixable for anyone who followed it.
  installApi({ deck: { url: "https://example.com/", expiresAt: null } });
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env(),
  );
  assert.match(res.headers.get("Cache-Control") ?? "", /max-age=3600/);
});

test("an expired link redirects to snocap.vc", async () => {
  // The api drops the expired record server-side (found:false).
  installApi({
    gone: { url: "https://example.com/gone", expiresAt: Date.now() - 1000 },
  });
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/gone"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("an unknown link redirects to snocap.vc rather than 404ing", async () => {
  installApi();
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/never-existed"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("an expired link is indistinguishable from one that never existed", async () => {
  // No information leak about whether a slug was ever real.
  installApi({
    gone: { url: "https://example.com/", expiresAt: Date.now() - 1000 },
  });
  const expired = await worker.fetch(
    new Request("https://snocap.vc/link/gone"),
    env(),
  );
  installApi();
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
  installApi();
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/never-existed"),
    env(),
  );
  assert.notEqual(res.status, 301);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("an unreadable record from the api is treated as a miss", async () => {
  // found:true but the record does not parse — never trust it into a Location.
  globalThis.fetch = (async () =>
    jsonResponse({ found: true, record: { nope: 1 } }, 200)) as typeof fetch;
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/broken"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("a slug is resolved case-insensitively", async () => {
  const api = installApi({
    deck: { url: "https://example.com/", expiresAt: null },
  });
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/DECK"),
    env(),
  );
  assert.equal(res.status, 301);
  // The slug reached the api already lowercased.
  assert.equal(api.calls.at(-1)?.body.slug, "deck");
});

test("a multi-segment or encoded-traversal slug is a miss, not a path escape", async () => {
  installApi();
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

// ── availability: a redirect fails to a miss, never a stale 301 ────────────────

test("an unreachable api is an ordinary miss, never a cached redirect", async () => {
  // A transient outage must never mint a 301 that a browser caches into a
  // permanently wrong redirect.
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("an api 5xx is a miss, never a 301", async () => {
  globalThis.fetch = (async () =>
    new Response("upstream boom", { status: 502 })) as typeof fetch;
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env(),
  );
  assert.notEqual(res.status, 301);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("a record the api mis-serves past its expiry is still guarded as a miss", async () => {
  // Defense in depth: even if the api hands back an expired record, the worker's
  // own isExpired check refuses to redirect to it.
  globalThis.fetch = (async () =>
    jsonResponse(
      {
        found: true,
        record: { url: "https://example.com/", expiresAt: Date.now() - 1000 },
      },
      200,
    )) as typeof fetch;
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/stale"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("the resolve call carries the shared secret and the slug", async () => {
  const api = installApi({
    deck: { url: "https://example.com/", expiresAt: null },
  });
  await worker.fetch(new Request("https://snocap.vc/link/deck"), env());
  const call = api.calls.at(-1);
  assert.ok(call?.url.startsWith(`${API_BASE}/link/resolve`));
  assert.equal(call?.secret, API_SECRET);
  assert.equal(call?.body.slug, "deck");
});

// ── the sno.llc/r/* surface ───────────────────────────────────────────────────

test("sno.llc/r/<slug> resolves the same link as snocap.vc/link/<slug>", async () => {
  const seed = { deck: { url: "https://example.com/deck", expiresAt: null } };
  installApi(seed);
  const short = await worker.fetch(
    new Request("https://sno.llc/r/deck"),
    env(),
  );
  installApi(seed);
  const long = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env(),
  );
  assert.equal(short.status, long.status);
  assert.equal(short.headers.get("Location"), long.headers.get("Location"));
});

test("an unknown slug on sno.llc/r/ redirects to snocap.vc", async () => {
  installApi();
  const res = await worker.fetch(
    new Request("https://sno.llc/r/never-existed"),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), HOME);
});

test("sno.llc/r with no slug redirects to snocap.vc", async () => {
  installApi();
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
  const api = installApi();
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/long/path", pathname: "Fund-Two" },
      await session(),
    ),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "/link?created=fund-two");
  assert.deepEqual(api.read("fund-two"), {
    url: "https://example.com/long/path",
    expiresAt: null,
    createdAt: api.read("fund-two")!.createdAt,
    createdBy: "jon@sno.llc",
  });
});

test("the create call carries the shared secret and the slugged record", async () => {
  const api = installApi();
  await worker.fetch(
    createRequest(
      { url: "https://example.com/", pathname: "keyed" },
      await session(),
    ),
    env(),
  );
  const call = api.calls.at(-1);
  assert.ok(call?.url.startsWith(`${API_BASE}/link/create`));
  assert.equal(call?.secret, API_SECRET);
  // Assert the LITERAL wire shape, not just that some field survived: flat,
  // `destination` not `url`, and no nested `record` envelope. This is the
  // assertion whose absence let the two repos drift apart unnoticed.
  assert.deepEqual(call?.body, {
    slug: "keyed",
    destination: "https://example.com/",
    createdBy: "jon@sno.llc",
    expiresAt: null,
  });
  assert.equal(call?.body.record, undefined);
  assert.equal(call?.body.url, undefined);
});

test("a permanent link is stored with no expiry", async () => {
  const api = installApi();
  await worker.fetch(
    createRequest(
      { url: "https://example.com/", pathname: "forever" },
      await session(),
    ),
    env(),
  );
  assert.equal(api.read("forever")?.expiresAt, null);
});

test("an expiring link is stored with its date as an absolute instant", async () => {
  const api = installApi();
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
    env(),
  );
  const record = api.read("temporary");
  assert.ok(record && typeof record.expiresAt === "number");
  assert.ok(record.expiresAt! > Date.now());
});

test("a created link is immediately resolvable", async () => {
  installApi();
  await worker.fetch(
    createRequest(
      { url: "https://example.com/deck", pathname: "deck" },
      await session(),
    ),
    env(),
  );
  const res = await worker.fetch(
    new Request("https://snocap.vc/link/deck"),
    env(),
  );
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("Location"), "https://example.com/deck");
});

test("creating a link requires a session", async () => {
  const api = installApi();
  const res = await worker.fetch(
    createRequest({ url: "https://example.com/", pathname: "sneaky" }),
    env(),
  );
  assert.equal(res.status, 401);
  assert.equal(api.read("sneaky"), null);
  // The store was never even called for an unauthenticated create.
  assert.equal(api.calls.length, 0);
});

test("a store outage on create tells the admin to retry and loses nothing silently", async () => {
  // A create has no safe silent fallback: a 502 the admin can see and retry is
  // better than a redirect that quietly did not store the link.
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/", pathname: "unlucky" },
      await session(),
    ),
    env(),
  );
  assert.equal(res.status, 502);
  assert.match(await res.text(), /unavailable/);
});

test("a javascript: destination is rejected", async () => {
  const api = installApi();
  const res = await worker.fetch(
    createRequest(
      { url: "javascript:alert(1)", pathname: "xss" },
      await session(),
    ),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /http:\/\/ and https:\/\//);
  assert.equal(api.read("xss"), null);
});

test("an invalid pathname is rejected", async () => {
  const api = installApi();
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/", pathname: "../escape" },
      await session(),
    ),
    env(),
  );
  assert.equal(res.status, 400);
  assert.equal(api.read("../escape"), null);
});

test("a pathname colliding with the create endpoint is rejected", async () => {
  installApi();
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
  installApi();
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
  installApi();
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
  // The old link is already in circulation and its 301 may be cached; the api
  // answers 409 for a live slug.
  const api = installApi({
    taken: { url: "https://example.com/original", expiresAt: null },
  });
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/hijacked", pathname: "taken" },
      await session(),
    ),
    env(),
  );
  assert.equal(res.status, 409);
  assert.match(await res.text(), /already taken/);
  assert.equal(api.read("taken")?.url, "https://example.com/original");
});

test("an expired pathname can be claimed again", async () => {
  const api = installApi({
    recycled: { url: "https://example.com/old", expiresAt: Date.now() - 1000 },
  });
  const res = await worker.fetch(
    createRequest(
      { url: "https://example.com/new", pathname: "recycled" },
      await session(),
    ),
    env(),
  );
  assert.equal(res.status, 302);
  assert.equal(api.read("recycled")?.url, "https://example.com/new");
});

test("the destination URL never reaches the logs", async () => {
  // A short link often exists because the URL behind it is not public.
  installApi();
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
