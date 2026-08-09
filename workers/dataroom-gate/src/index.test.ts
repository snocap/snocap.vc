// What is distinctive about the deal room gate: a per-viewer access code
// derived from (email, ref), no ref bypass at all, and a 24h HttpOnly cookie
// scoped to /dataroom.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./index.ts";
import { derivePassword } from "./password.ts";
import { signViewerCookie } from "../../shared/cookie.ts";

const HMAC_SECRET = "test-hmac-secret";
const PW_SECRET = "test-pw-secret";

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
  const code = await derivePassword("jon@sno.llc", "jon", PW_SECRET);
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: code }),
    env(),
  );
  assert.equal(res.status, 302);
});

test("another viewer's code does not work", async () => {
  const otherCode = await derivePassword(
    "someone@else.com",
    "someone",
    PW_SECRET,
  );
  const res = await worker.fetch(
    post({ email: "jon@sno.llc", password: otherCode }),
    env(),
  );
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Invalid access code\./);
});

test("the cookie is 24h, HttpOnly and scoped to /dataroom", async () => {
  const code = await derivePassword("jon@sno.llc", "jon", PW_SECRET);
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
  const code = await derivePassword("jon@sno.llc", "jon", PW_SECRET);
  const res = await worker.fetch(
    post({
      email: "jon@sno.llc",
      password: code,
      return_to: "https://evil.com/",
    }),
    env(),
  );
  assert.equal(res.headers.get("Location"), "/dataroom");
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
