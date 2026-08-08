import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeHtml, handleViewerAdmin, logViewer } from "./viewers.ts";

// Minimal D1 stand-in: records what was prepared and bound, returns canned rows.
function fakeDb(rows: Record<string, unknown>[] = [], failOnRun = false) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    calls,
    prepare(sql: string) {
      const call = { sql, args: [] as unknown[] };
      calls.push(call);
      return {
        bind(...args: unknown[]) {
          call.args = args;
          return this;
        },
        async run() {
          if (failOnRun) throw new Error("D1 is down");
        },
        async all() {
          return { results: rows };
        },
      };
    },
  };
  return db;
}

function viewerRequest(): Request {
  return new Request("https://snocap.vc/deck", {
    method: "POST",
    headers: { "User-Agent": "TestAgent/1.0" },
  });
}

test("logViewer writes email, ref, user agent and country", async () => {
  const db = fakeDb();
  await logViewer(db as never, {
    email: "jon@sno.llc",
    ref: "jon",
    request: viewerRequest(),
  });
  assert.equal(db.calls.length, 1);
  assert.match(
    db.calls[0].sql,
    /INSERT INTO viewers \(email, ref, user_agent, country\)/,
  );
  assert.deepEqual(db.calls[0].args, [
    "jon@sno.llc",
    "jon",
    "TestAgent/1.0",
    "",
  ]);
});

test("logViewer swallows a D1 failure so the viewer still gets in", async () => {
  const db = fakeDb([], true);
  await assert.doesNotReject(
    logViewer(db as never, {
      email: "jon@sno.llc",
      ref: "jon",
      request: viewerRequest(),
    }),
  );
});

const adminOptions = (db: unknown) => ({
  path: "/deck/admin",
  db: db as never,
  adminToken: "s3cret-token",
  title: "Deck Viewers",
});

test("handleViewerAdmin returns null for a path it does not own", async () => {
  const db = fakeDb();
  const req = new Request("https://snocap.vc/deck");
  assert.equal(await handleViewerAdmin(req, adminOptions(db)), null);
});

test("handleViewerAdmin 401s without the admin token", async () => {
  const db = fakeDb();
  const res = await handleViewerAdmin(
    new Request("https://snocap.vc/deck/admin"),
    adminOptions(db),
  );
  assert.equal(res?.status, 401);
  assert.equal(db.calls.length, 0);
});

test("handleViewerAdmin 401s on a wrong admin token", async () => {
  const db = fakeDb();
  const res = await handleViewerAdmin(
    new Request("https://snocap.vc/deck/admin?token=guess"),
    adminOptions(db),
  );
  assert.equal(res?.status, 401);
});

test("handleViewerAdmin renders a row per viewer with the given title", async () => {
  const db = fakeDb([
    {
      email: "jon@sno.llc",
      first_viewed: "2026-01-01 00:00:00",
      views: 3,
      country: "US",
      ref: "jon",
    },
  ]);
  const res = await handleViewerAdmin(
    new Request("https://snocap.vc/deck/admin?token=s3cret-token"),
    adminOptions(db),
  );
  assert.equal(res?.status, 200);
  assert.equal(res?.headers.get("Cache-Control"), "no-store");
  const html = await res!.text();
  assert.match(html, /<h1>Deck Viewers<\/h1>/);
  assert.match(html, /<td>jon@sno\.llc<\/td>/);
  assert.match(html, /<td>3<\/td>/);
  assert.match(html, /<td>US<\/td>/);
});

test("handleViewerAdmin shows a dash for a missing country or ref", async () => {
  const db = fakeDb([
    {
      email: "x@y.zz",
      first_viewed: "2026-01-01",
      views: 1,
      country: null,
      ref: null,
    },
  ]);
  const res = await handleViewerAdmin(
    new Request("https://snocap.vc/deck/admin?token=s3cret-token"),
    adminOptions(db),
  );
  assert.match(await res!.text(), /<td>—<\/td><td>—<\/td>/);
});

test("handleViewerAdmin says so when nobody has viewed yet", async () => {
  const db = fakeDb([]);
  const res = await handleViewerAdmin(
    new Request("https://snocap.vc/deck/admin?token=s3cret-token"),
    adminOptions(db),
  );
  assert.match(await res!.text(), /No viewers yet/);
});

test("handleViewerAdmin escapes viewer-supplied values", async () => {
  const db = fakeDb([
    {
      email: "<script>alert(1)</script>@evil.com",
      first_viewed: "2026-01-01",
      views: 1,
      country: "US",
      ref: '"><img src=x>',
    },
  ]);
  const res = await handleViewerAdmin(
    new Request("https://snocap.vc/deck/admin?token=s3cret-token"),
    adminOptions(db),
  );
  const html = await res!.text();
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(!html.includes("<img src=x>"));
  assert.match(html, /&lt;script&gt;/);
});

test("escapeHtml neutralizes the characters that break out of markup", () => {
  assert.equal(
    escapeHtml(`<a href="x">&`),
    "&lt;a href=&quot;x&quot;&gt;&amp;",
  );
});
