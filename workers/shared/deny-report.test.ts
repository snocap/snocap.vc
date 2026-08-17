import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { reportDenial } from "./deny-report.ts";

const ENV = {
  GATE_API_BASE: "https://api.example.com",
  GATE_DENIAL_SECRET: "s3cret",
};
const DENIAL = {
  gate: "dataroom" as const,
  email: "lp@example.com",
  reason: "code-mismatch",
  ref: "jon",
};

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const originalError = console.error;
afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  console.error = originalError;
});

/** Collects console output so a test can assert on the tail-stream line. */
function captureConsole() {
  const warns: string[] = [];
  const errors: string[] = [];
  console.warn = (...args: unknown[]) => void warns.push(args.join(" "));
  console.error = (...args: unknown[]) => void errors.push(args.join(" "));
  return { warns, errors };
}

/** Records every request the reporter makes; `mode` picks the failure to fake. */
function stubApi(mode: "ok" | "throw" | "500" = "ok") {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    if (mode === "throw") throw new Error("api unreachable");
    if (mode === "500") return new Response("nope", { status: 500 });
    return Response.json({ ok: true, notified: true });
  }) as typeof fetch;
  return calls;
}

/** An ExecutionContext stand-in that keeps the promises handed to waitUntil,
 * so a test can await the fire-and-forget work the platform would. */
function fakeCtx() {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    waitUntil: (p: Promise<unknown>) => void pending.push(p),
    settle: () => Promise.all(pending),
  };
}

test("posts the denial to the api with the shared secret", async () => {
  const calls = stubApi();
  captureConsole();
  const ctx = fakeCtx();

  reportDenial(ENV, DENIAL, ctx as never);
  await ctx.settle();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.example.com/gate/denied");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers["x-gate-secret"], "s3cret");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    gate: "dataroom",
    email: "lp@example.com",
    reason: "code-mismatch",
    ref: "jon",
  });
});

test("never sends the submitted credential, whatever the caller passes", async () => {
  const calls = stubApi();
  captureConsole();
  const ctx = fakeCtx();

  reportDenial(
    ENV,
    { ...DENIAL, password: "hunter2", code: "ABC123" } as never,
    ctx as never,
  );
  await ctx.settle();

  const body = String(calls[0].init.body);
  assert.ok(!body.includes("hunter2"), body);
  assert.ok(!body.includes("ABC123"), body);
});

test("an absent ref is sent as null, not omitted", async () => {
  const calls = stubApi();
  captureConsole();
  const ctx = fakeCtx();

  reportDenial(
    ENV,
    { gate: "deck", email: "a@b.com", reason: "password-missing" },
    ctx as never,
  );
  await ctx.settle();

  assert.equal(JSON.parse(String(calls[0].init.body)).ref, null);
});

test("defaults to api.sno.llc when no base is configured", async () => {
  const calls = stubApi();
  captureConsole();
  const ctx = fakeCtx();

  reportDenial({ GATE_DENIAL_SECRET: "s3cret" }, DENIAL, ctx as never);
  await ctx.settle();

  assert.equal(calls[0].url, "https://api.sno.llc/gate/denied");
});

test("no secret provisioned: logs locally, calls nothing", () => {
  const calls = stubApi();
  const { warns } = captureConsole();

  reportDenial({ GATE_API_BASE: ENV.GATE_API_BASE }, DENIAL);

  assert.equal(calls.length, 0);
  assert.equal(warns.length, 1);
});

test("the tail-stream line names the gate and the reason, never the code", () => {
  stubApi();
  const { warns } = captureConsole();

  reportDenial(ENV, DENIAL, fakeCtx() as never);

  assert.deepEqual(JSON.parse(warns[0]), {
    event: "gate_denied",
    gate: "dataroom",
    email: "lp@example.com",
    submittedRef: "jon",
    reason: "code-mismatch",
  });
});

test("an unreachable api is logged and dropped, never thrown at the gate", async () => {
  stubApi("throw");
  const { errors } = captureConsole();
  const ctx = fakeCtx();

  assert.doesNotThrow(() => reportDenial(ENV, DENIAL, ctx as never));
  await assert.doesNotReject(ctx.settle());
  assert.match(errors.join("\n"), /gate denial report failed/);
});

test("a non-2xx from the api is logged and dropped the same way", async () => {
  stubApi("500");
  const { errors } = captureConsole();
  const ctx = fakeCtx();

  reportDenial(ENV, DENIAL, ctx as never);
  await ctx.settle();
  assert.match(errors.join("\n"), /api answered 500/);
});

test("reporting without a ctx still works — the promise is just unsupervised", async () => {
  const calls = stubApi();
  captureConsole();

  reportDenial(ENV, DENIAL);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(calls.length, 1);
});
