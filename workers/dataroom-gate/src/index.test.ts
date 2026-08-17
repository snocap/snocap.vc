// What is distinctive about the deal room gate: a per-viewer access code
// derived from the email alone, no ref bypass at all, and a 24h HttpOnly cookie
// scoped to /dataroom.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./index.ts";
import { derivePassword } from "./password.ts";
import { signViewerCookie } from "../../shared/cookie.ts";

const HMAC_SECRET = "test-hmac-secret";
const PW_SECRET = "test-pw-secret";
const OVERRIDE_SECRET = "test-dataroom-secret";

function fakeDb() {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        async run() {},
        async first() {
          return null;
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
}

function env(overrides: Record<string, unknown> = {}) {
  return {
    DB: fakeDb(),
    HMAC_SECRET,
    ADMIN_TOKEN: "admin-token",
    DEALROOM_PW_SECRET: PW_SECRET,
    DEALROOM_SA_KEY: "",
    DRIVE_ROOT_FOLDER_ID: "root-folder",
    ...overrides,
  } as never;
}

// Stub globalThis.fetch to stand in for the kernelbot-api override endpoint. The
// responder receives the parsed {email, password} body and returns the endpoint's
// JSON verdict; anything else (the origin passthrough) gets a plain response. Set
// `throwIt` to simulate the endpoint being unreachable (fail-open path). Restored
// by the existing afterEach.
function stubOverrideEndpoint(
  responder: (body: {
    email: string;
    password: string;
  }) => { override: false } | { override: true; match: boolean },
  opts: { throwIt?: boolean } = {},
) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/dataroom/override-check")) {
      if (opts.throwIt) throw new Error("endpoint down");
      const body = JSON.parse(String(init?.body ?? "{}"));
      return Response.json(responder(body));
    }
    return new Response("origin");
  }) as typeof fetch;
}

function post(body: Record<string, string>): Request {
  const form = new FormData();
  for (const [k, v] of Object.entries(body)) form.append(k, v);
  return new Request("https://snocap.vc/dataroom", {
    method: "POST",
    body: form,
  });
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("a plain visit shows the gate and always asks for an access code", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom"),
    env(),
  );
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<form method="POST" action="\/dataroom">/);
  assert.match(html, /<input type="password" name="password"/);
});

test("a ref in the URL does NOT bypass the access code", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom?ref=jon"),
    env(),
  );
  assert.match(await res.text(), /<input type="password" name="password"/);
});

test("a ref in the URL does not set any cookie", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom?ref=jon"),
    env(),
  );
  assert.deepEqual(res.headers.getSetCookie(), []);
});

test("the derived per-viewer code opens the gate", async () => {
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: code }),
    env(),
  );
  assert.equal(res.status, 200);
});

test("a successful submit shows the success page with a QR handoff, not an instant redirect", async () => {
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: code }),
    env(),
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Location"), null);
  const html = await res.text();
  assert.match(html, /You're in\./);
  assert.match(html, /re-enter your access code/);
  assert.match(html, /<svg/);
  assert.match(html, /href="https:\/\/snocap\.vc\/dataroom"/);
  // The HttpOnly session cookie must still be set on the 200.
  const cookie = res.headers
    .getSetCookie()
    .find((c) => c.startsWith("dataroom_viewer="));
  assert.ok(cookie);
});

test("another viewer's code does not work", async () => {
  const otherCode = await derivePassword("someone@else.com", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: otherCode }),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Invalid access code\./);
});

test("the cookie is 24h, HttpOnly and scoped to /dataroom", async () => {
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: code }),
    env(),
  );
  const cookie = res.headers
    .getSetCookie()
    .find((c) => c.startsWith("dataroom_viewer="));
  assert.ok(cookie);
  assert.match(cookie!, /Max-Age=86400/);
  assert.match(cookie!, /Path=\/dataroom;/);
  assert.match(cookie!, /HttpOnly/);
});

test("an unset DEALROOM_PW_SECRET keeps everyone out", async () => {
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "" }),
    env({ DEALROOM_PW_SECRET: "" }),
  );
  assert.equal(res.status, 400);
});

test("a malformed email is rejected", async () => {
  const res = await worker.fetch(
    post({ email: "nope", password: "whatever" }),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /valid email address/);
});

test("a return_to outside /dataroom is ignored", async () => {
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  const res = await worker.fetch(
    post({
      email: "jon@sno.llc",
      password: code,
      return_to: "https://evil.com/",
    }),
    env(),
  );
  assert.equal(res.headers.get("Location"), null);
  const html = await res.text();
  assert.match(html, /href="https:\/\/snocap\.vc\/dataroom"/);
  assert.ok(!html.includes("evil.com"));
});

test("the Drive API is unreachable without a signed cookie", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom/api/list"),
    env({ DEALROOM_SA_KEY: "{}" }),
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Content-Type") || "", /text\/html/);
});

test("a signed cookie reaches the Drive API, which reports it is unconfigured", async () => {
  const cookie = `dataroom_viewer=${encodeURIComponent(await signViewerCookie("jon@sno.llc", HMAC_SECRET))}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom/api/list", {
      headers: { Cookie: cookie },
    }),
    env(),
  );
  assert.equal(res.status, 503);
});

test("a signed cookie can ask who it belongs to", async () => {
  const cookie = `dataroom_viewer=${encodeURIComponent(await signViewerCookie("jon@sno.llc", HMAC_SECRET))}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom/api/viewer", {
      headers: { Cookie: cookie },
    }),
    env(),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { email: "jon@sno.llc" });
});

test("the viewer endpoint answers even while Drive is unconfigured", async () => {
  // Tracking should not go dark because the Drive grant is missing — the
  // room still renders its gate and its shell.
  const cookie = `dataroom_viewer=${encodeURIComponent(await signViewerCookie("jon@sno.llc", HMAC_SECRET))}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom/api/viewer", {
      headers: { Cookie: cookie },
    }),
    env({ DEALROOM_SA_KEY: "" }),
  );
  assert.equal(res.status, 200);
});

test("the viewer endpoint tells an unsigned visitor nothing", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom/api/viewer"),
    env(),
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Content-Type") || "", /text\/html/);
  assert.match(await res.text(), /<form method="POST" action="\/dataroom">/);
});

test("a forged cookie gets the gate, not the deal room", async () => {
  const forged = `${btoa("attacker@evil.com")}.${"00".repeat(32)}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom", {
      headers: { Cookie: `dataroom_viewer=${encodeURIComponent(forged)}` },
    }),
    env(),
  );
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<form method="POST" action="\/dataroom">/);
});

test("a deck cookie does not open the deal room", async () => {
  const cookie = `snocap_viewer=${encodeURIComponent(await signViewerCookie("jon@sno.llc", HMAC_SECRET))}`;
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom", { headers: { Cookie: cookie } }),
    env(),
  );
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<form method="POST" action="\/dataroom">/);
});

test("paths outside /dataroom are not this worker's business", async () => {
  globalThis.fetch = (async () => new Response("home page")) as typeof fetch;
  const res = await worker.fetch(new Request("https://snocap.vc/"), env());
  assert.equal(await res.text(), "home page");
});

test("the admin table lives at /dataroom/admin and needs the admin token", async () => {
  const res = await worker.fetch(
    new Request("https://snocap.vc/dataroom/admin"),
    env(),
  );
  assert.equal(res.status, 401);

  const ok = await worker.fetch(
    new Request("https://snocap.vc/dataroom/admin?token=admin-token"),
    env(),
  );
  assert.match(await ok.text(), /<h1>Fund 2 Data Room Viewers<\/h1>/);
});

test("the old /dealroom path 301s to /dataroom, preserving the rest of the URL", async () => {
  const cases: [string, string][] = [
    ["https://snocap.vc/dealroom", "https://snocap.vc/dataroom"],
    ["https://snocap.vc/dealroom/", "https://snocap.vc/dataroom/"],
    ["https://snocap.vc/dealroom/admin", "https://snocap.vc/dataroom/admin"],
    [
      "https://snocap.vc/dealroom/api/list?folder=abc",
      "https://snocap.vc/dataroom/api/list?folder=abc",
    ],
  ];
  for (const [from, to] of cases) {
    const res = await worker.fetch(new Request(from), env());
    assert.equal(res.status, 301, from);
    assert.equal(res.headers.get("Location"), to, from);
  }
});

test("a path merely starting with the old name is not redirected", async () => {
  // /dealroomsomething must not be rewritten to /dataroomsomething.
  const res = await worker.fetch(
    new Request("https://snocap.vc/dealroomxyz"),
    env(),
  );
  assert.notEqual(res.status, 301);
});

// ── the URL's ref is attribution, never part of the access code ───────────────
// Observed live 2026-08-10: a code minted for the email's own default ref was
// rejected on a `/dataroom?ref=<someone-else>` link, because `ref` used to be
// part of HMAC(email|ref). It looked unreproducible since a request omitting
// `ref` fell back to the default and succeeded. The code is now keyed on the
// email alone (snocap/snocap.vc#11), so whichever ref the link carries is
// irrelevant to whether the gate opens.

test("the email's code opens the gate whatever ref the form carries", async () => {
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  for (const ref of [undefined, "jon", "someonelse"]) {
    const res = await worker.fetch(
      post({ email: "jon@sno.llc", password: code, ...(ref ? { ref } : {}) }),
      env(),
    );
    assert.equal(
      res.status,
      200,
      `ref=${ref ?? "(none)"} should open the gate`,
    );
  }
});

test("a wrong code is still refused no matter which ref is submitted", async () => {
  for (const ref of ["", "jon", "someonelse"]) {
    const res = await worker.fetch(
      post({
        email: "jon@sno.llc",
        password: "NOTITNOW",
        ...(ref ? { ref } : {}),
      }),
      env(),
    );
    assert.equal(res.status, 400, `ref=${ref || "(none)"} should be refused`);
    assert.match(await res.text(), /Invalid access code/);
  }
});

test("an empty code is refused rather than matched against a derivation", async () => {
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "" }),
    env(),
  );
  assert.equal(res.status, 400);
});

// ── TEMPORARY per-email override (override.ts) ────────────────────────────────
// A GP can shadow the derived default for one LP. The gate POSTs to the
// kernelbot-api endpoint (mocked here); the verdict is checked before the derived
// code and is authoritative when the endpoint reports override:true.

// env with the override secret set, so checkEmailOverride actually calls out.
function overrideEnv(overrides: Record<string, unknown> = {}) {
  return env({ DATAROOM_OVERRIDE_SECRET: OVERRIDE_SECRET, ...overrides });
}

test("a per-email override opens the gate (endpoint says match)", async () => {
  stubOverrideEndpoint(() => ({ override: true, match: true }));
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "MANUALPW" }),
    overrideEnv(),
  );
  assert.equal(res.status, 200);
});

test("an override shadows the derived code: the old derived code stops working", async () => {
  // Endpoint reports an override is set but this (derived) password does not
  // match it → authoritative deny, with NO fallback to the derived check.
  stubOverrideEndpoint(() => ({ override: true, match: false }));
  const derived = await derivePassword("jon@sno.llc", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: derived }),
    overrideEnv(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Invalid access code/);
});

test("an email with no override still uses the derived code", async () => {
  stubOverrideEndpoint(() => ({ override: false }));
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: code }),
    overrideEnv(),
  );
  assert.equal(res.status, 200);
});

test("a wrong password against a set override is refused (no derived fallback)", async () => {
  stubOverrideEndpoint(() => ({ override: true, match: false }));
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "TOTALLYWRONG" }),
    overrideEnv(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Invalid access code/);
});

test("the gate passes the submitted email+password through to the endpoint", async () => {
  let seen: { email: string; password: string } | null = null;
  stubOverrideEndpoint((body) => {
    seen = body;
    return { override: false };
  });
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  await worker.fetch(
    post({ email: " JON@sno.llc ", password: code }),
    overrideEnv(),
  );
  // The email is normalized before the gate calls out.
  assert.deepEqual(seen, { email: "jon@sno.llc", password: code });
});

test("with no override secret the endpoint is never called; derived code still works", async () => {
  let called = false;
  stubOverrideEndpoint(() => {
    called = true;
    return { override: false };
  });
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: code }),
    env(), // no DATAROOM_OVERRIDE_SECRET
  );
  assert.equal(res.status, 200);
  assert.equal(called, false);
});

test("a down endpoint fails open: the derived code still opens the gate", async () => {
  stubOverrideEndpoint(() => ({ override: false }), { throwIt: true });
  const code = await derivePassword("jon@sno.llc", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: code }),
    overrideEnv(),
  );
  assert.equal(res.status, 200);
});

test("a down endpoint fails open: a wrong code is still refused", async () => {
  stubOverrideEndpoint(() => ({ override: false }), { throwIt: true });
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "NOPENOPE" }),
    overrideEnv(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Invalid access code/);
});

// ── denial reporting ─────────────────────────────────────────────────────────
// The gate already built this line; it went to console.warn, whose only
// destination is Cloudflare's uncollected tail stream, so in practice a
// rejection was recorded nowhere (workers/shared/deny-report.ts). These pin the
// two properties that matter: the report carries the diagnosis and not the
// code, and it can never change what the visitor gets.

const DENIAL_ENV = {
  GATE_API_BASE: "https://api.example.com",
  GATE_DENIAL_SECRET: "test-gate-secret",
};

/** Collects denial reports; the override call-out and the origin get a plain
 * response, which checkEmailOverride reads as "no override" and falls through. */
function stubDenialEndpoint(opts: { throwIt?: boolean } = {}) {
  const reports: Record<string, unknown>[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes("/gate/denied")) {
      if (opts.throwIt) throw new Error("api unreachable");
      reports.push(JSON.parse(String(init?.body ?? "{}")));
      return Response.json({ ok: true });
    }
    return new Response("origin");
  }) as typeof fetch;
  return reports;
}

/** Keeps the promises the platform would keep alive past the response. */
function fakeCtx() {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil: (p: Promise<unknown>) => void pending.push(p),
    settle: () => Promise.all(pending),
  };
}

test("a wrong code is reported with the email, the ref and the reason — never the code", async () => {
  const reports = stubDenialEndpoint();
  const ctx = fakeCtx();

  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "NOTITNOW", ref: "someonelse" }),
    env(DENIAL_ENV),
    ctx as never,
  );
  await ctx.settle();

  assert.equal(res.status, 400);
  assert.deepEqual(reports, [
    {
      gate: "dataroom",
      email: "jon@sno.llc",
      reason: "code-mismatch",
      ref: "someonelse",
    },
  ]);
});

test("no code and an unset DEALROOM_PW_SECRET report different reasons", async () => {
  let reports = stubDenialEndpoint();
  let ctx = fakeCtx();
  await worker.fetch(
    post({ email: "jon@sno.llc", password: "" }),
    env(DENIAL_ENV),
    ctx as never,
  );
  await ctx.settle();
  assert.equal(reports[0].reason, "code-missing");

  reports = stubDenialEndpoint();
  ctx = fakeCtx();
  await worker.fetch(
    post({ email: "jon@sno.llc", password: "anything" }),
    env({ ...DENIAL_ENV, DEALROOM_PW_SECRET: "" }),
    ctx as never,
  );
  await ctx.settle();
  assert.equal(reports[0].reason, "secret-unset");
});

test("a successful sign-in reports nothing", async () => {
  const reports = stubDenialEndpoint();
  const ctx = fakeCtx();
  const code = await derivePassword("jon@sno.llc", PW_SECRET);

  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: code }),
    env(DENIAL_ENV),
    ctx as never,
  );
  await ctx.settle();

  // A successful submit renders the QR success page, not the old instant 302.
  assert.equal(res.status, 200);
  assert.deepEqual(reports, []);
});

test("an unreachable api changes nothing the visitor sees", async () => {
  stubDenialEndpoint({ throwIt: true });
  const ctx = fakeCtx();

  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: "NOTITNOW" }),
    env(DENIAL_ENV),
    ctx as never,
  );
  await ctx.settle();

  assert.equal(res.status, 400);
  assert.match(await res.text(), /Invalid access code\./);
});
