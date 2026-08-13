// Tests for the TEMPORARY per-email password override (override.ts). The override
// store and its PBKDF2 hashing/verify now live server-side in the kernelbot-api
// endpoint (and its test/unit/local/dataroom-override.test.ts pins the hash
// vector); this module is a thin passthrough, so what's tested here is the HTTP
// contract and the fail-open behavior — NOT the crypto, which moved out of repo.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { checkEmailOverride } from "./override.ts";

const SECRET = "test-dataroom-secret";
const BASE = "https://api.test";

// Capture the last request the module made so a test can assert its shape.
interface Captured {
  url: string;
  method?: string;
  headers: Headers;
  body: unknown;
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Stub globalThis.fetch with a responder that sees the parsed request and returns
// either a Response spec or throws (to simulate a network failure). Records the
// request into `captured` for assertions.
function stubFetch(
  responder: (req: Captured) => {
    status?: number;
    body?: string;
    throw?: boolean;
  },
): { captured: Captured | null } {
  const box: { captured: Captured | null } = { captured: null };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = new Headers(init?.headers);
    const raw = init?.body ? String(init.body) : "";
    const req: Captured = {
      url,
      method: init?.method,
      headers,
      body: raw ? JSON.parse(raw) : undefined,
    };
    box.captured = req;
    const r = responder(req);
    if (r.throw) throw new Error("network down");
    return new Response(r.body ?? "", {
      status: r.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return box;
}

test("returns null (fall through) when no secret is configured", async () => {
  let called = false;
  stubFetch(() => {
    called = true;
    return { body: JSON.stringify({ override: false }) };
  });
  assert.equal(await checkEmailOverride({}, "a@b.com", "pw"), null);
  assert.equal(called, false, "must not call the endpoint without a secret");
});

test("POSTs email+password to the endpoint with the shared-secret header", async () => {
  const box = stubFetch(() => ({ body: JSON.stringify({ override: false }) }));
  await checkEmailOverride(
    { OVERRIDE_API_BASE: BASE, DATAROOM_OVERRIDE_SECRET: SECRET },
    "philip@firstaxiomsholdings.com",
    "QRLBCGM7",
  );
  const c = box.captured!;
  assert.equal(c.url, `${BASE}/dataroom/override-check`);
  assert.equal(c.method, "POST");
  assert.equal(c.headers.get("x-dataroom-secret"), SECRET);
  assert.equal(c.headers.get("content-type"), "application/json");
  assert.deepEqual(c.body, {
    email: "philip@firstaxiomsholdings.com",
    password: "QRLBCGM7",
  });
});

test("defaults the endpoint base to api.sno.llc when the var is unset", async () => {
  const box = stubFetch(() => ({ body: JSON.stringify({ override: false }) }));
  await checkEmailOverride(
    { DATAROOM_OVERRIDE_SECRET: SECRET },
    "a@b.com",
    "pw",
  );
  assert.equal(
    box.captured!.url,
    "https://api.sno.llc/dataroom/override-check",
  );
});

test("a trailing slash on the base does not double up the path", async () => {
  const box = stubFetch(() => ({ body: JSON.stringify({ override: false }) }));
  await checkEmailOverride(
    { OVERRIDE_API_BASE: `${BASE}/`, DATAROOM_OVERRIDE_SECRET: SECRET },
    "a@b.com",
    "pw",
  );
  assert.equal(box.captured!.url, `${BASE}/dataroom/override-check`);
});

test("override:false → null (fall through to the derived code)", async () => {
  stubFetch(() => ({ body: JSON.stringify({ override: false }) }));
  assert.equal(
    await checkEmailOverride(
      { OVERRIDE_API_BASE: BASE, DATAROOM_OVERRIDE_SECRET: SECRET },
      "a@b.com",
      "pw",
    ),
    null,
  );
});

test("override:true match:true → true (allow)", async () => {
  stubFetch(() => ({ body: JSON.stringify({ override: true, match: true }) }));
  assert.equal(
    await checkEmailOverride(
      { OVERRIDE_API_BASE: BASE, DATAROOM_OVERRIDE_SECRET: SECRET },
      "a@b.com",
      "pw",
    ),
    true,
  );
});

test("override:true match:false → false (authoritative deny, no fallback)", async () => {
  stubFetch(() => ({ body: JSON.stringify({ override: true, match: false }) }));
  assert.equal(
    await checkEmailOverride(
      { OVERRIDE_API_BASE: BASE, DATAROOM_OVERRIDE_SECRET: SECRET },
      "a@b.com",
      "pw",
    ),
    false,
  );
});

// ── FAIL-OPEN: any endpoint failure resolves to null (fall through) ───────────

test("a network error fails open to null", async () => {
  stubFetch(() => ({ throw: true }));
  assert.equal(
    await checkEmailOverride(
      { OVERRIDE_API_BASE: BASE, DATAROOM_OVERRIDE_SECRET: SECRET },
      "a@b.com",
      "pw",
    ),
    null,
  );
});

test("a 5xx fails open to null", async () => {
  stubFetch(() => ({ status: 502, body: "bad gateway" }));
  assert.equal(
    await checkEmailOverride(
      { OVERRIDE_API_BASE: BASE, DATAROOM_OVERRIDE_SECRET: SECRET },
      "a@b.com",
      "pw",
    ),
    null,
  );
});

test("a 401 (wrong secret) fails open to null", async () => {
  stubFetch(() => ({ status: 401, body: "" }));
  assert.equal(
    await checkEmailOverride(
      { OVERRIDE_API_BASE: BASE, DATAROOM_OVERRIDE_SECRET: SECRET },
      "a@b.com",
      "pw",
    ),
    null,
  );
});

test("a non-JSON 200 body fails open to null", async () => {
  stubFetch(() => ({ body: "<html>oops</html>" }));
  assert.equal(
    await checkEmailOverride(
      { OVERRIDE_API_BASE: BASE, DATAROOM_OVERRIDE_SECRET: SECRET },
      "a@b.com",
      "pw",
    ),
    null,
  );
});
