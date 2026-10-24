// The client's pacing, 429 retries and lookup sizing, over a stub fetch and a
// virtual clock, so the waits are measured rather than slept through.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  Airtable,
  AirtableError,
  CALL_SPACING_MS,
  MAX_URL_LENGTH,
  RETRY_BUDGET_MS,
  clock,
  idsPerLookup,
  isRateLimited,
} from "./airtable.ts";

const realClock = { ...clock };
let now = 0;
let slept: number[] = [];
let timers: { wake: number; resolve: () => void }[] = [];
beforeEach(() => {
  now = 1_000_000;
  slept = [];
  timers = [];
  clock.now = () => now;
  // Each sleep wakes at its own absolute time, earliest first, once the
  // microtasks queued so far have run.
  clock.sleep = (ms) =>
    new Promise((resolve) => {
      slept.push(ms);
      timers.push({ wake: now + ms, resolve });
      setImmediate(() => {
        timers.sort((a, b) => a.wake - b.wake);
        const next = timers.shift();
        if (!next) return;
        now = Math.max(now, next.wake);
        next.resolve();
      });
    });
});
afterEach(() => {
  Object.assign(clock, realClock);
});

interface Sent {
  at: number;
  url: URL;
}

/** A fetch that answers each request from `reply`, logging when it was sent. */
function stub(reply: (url: URL, n: number) => Response) {
  const sent: Sent[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    sent.push({ at: now, url });
    return reply(url, sent.length);
  }) as typeof fetch;
  return { sent, impl };
}

const ok = (body: object = { records: [] }) =>
  new Response(JSON.stringify(body), { status: 200 });
const limited = (headers: Record<string, string> = {}) =>
  new Response(
    JSON.stringify({
      errors: [{ error: "RATE_LIMIT_REACHED", message: "Rate limit" }],
    }),
    { status: 429, headers },
  );

const gaps = (sent: Sent[]) => sent.slice(1).map((s, i) => s.at - sent[i].at);

test("calls go out at most four a second, even when started together", async () => {
  const { sent, impl } = stub(() => ok());
  const airtable = new Airtable("token", impl, "appBase");
  await Promise.all([
    airtable.getRecord("tblA", "recA"),
    airtable.getRecord("tblA", "recB"),
    airtable.getRecord("tblA", "recC"),
  ]);
  await airtable.getRecord("tblA", "recD");
  assert.equal(sent.length, 4);
  assert.deepEqual(gaps(sent), [
    CALL_SPACING_MS,
    CALL_SPACING_MS,
    CALL_SPACING_MS,
  ]);
});

test("a 429 is retried after a backoff, and the retry's answer is returned", async () => {
  const { sent, impl } = stub((_url, n) =>
    n === 1 ? limited() : ok({ id: "recA", fields: { Name: "A" } }),
  );
  const airtable = new Airtable("token", impl, "appBase");
  const record = await airtable.getRecord("tblA", "recA");
  assert.equal(record.fields.Name, "A");
  assert.equal(sent.length, 2);
  assert.equal(gaps(sent)[0], 1_000);
});

test("a 429's Retry-After is honored over the default backoff", async () => {
  const { sent, impl } = stub((_url, n) =>
    n === 1 ? limited({ "Retry-After": "3" }) : ok({ id: "recA", fields: {} }),
  );
  await new Airtable("token", impl, "appBase").getRecord("tblA", "recA");
  assert.equal(gaps(sent)[0], 3_000);
});

test("a 429 that never lifts fails as rate-limited, inside the retry budget", async () => {
  const { sent, impl } = stub(() => limited());
  const airtable = new Airtable("token", impl, "appBase");
  const err = await airtable.getRecord("tblA", "recA").catch((e) => e);
  assert.ok(isRateLimited(err));
  assert.equal(err.label, "Airtable 429 RATE_LIMIT_REACHED");
  assert.equal(sent.length, 5);
  assert.ok(now - 1_000_000 <= RETRY_BUDGET_MS + 5 * CALL_SPACING_MS);
  // The budget is the request's, not the call's: the next call does not retry.
  const second = stub(() => limited());
  const spent = new Airtable("token", second.impl, "appBase");
  await spent.getRecord("tblA", "recA").catch(() => {});
  await spent.getRecord("tblA", "recB").catch(() => {});
  assert.equal(second.sent.length, 6);
});

test("a Retry-After longer than the budget left fails at once rather than waiting", async () => {
  const { sent, impl } = stub(() => limited({ "Retry-After": "30" }));
  const err = await new Airtable("token", impl, "appBase")
    .getRecord("tblA", "recA")
    .catch((e) => e);
  assert.ok(isRateLimited(err));
  assert.equal(sent.length, 1);
  assert.deepEqual(slept, []);
});

test("only a 429 is retried; any other failure throws with its status and code", async () => {
  const { sent, impl } = stub(
    () =>
      new Response(
        JSON.stringify({ error: { type: "INVALID_FILTER_BY_FORMULA" } }),
        { status: 422 },
      ),
  );
  const err = await new Airtable("token", impl, "appBase")
    .getRecord("tblA", "recA")
    .catch((e) => e);
  assert.ok(err instanceof AirtableError);
  assert.equal(err.label, "Airtable 422 INVALID_FILTER_BY_FORMULA");
  assert.equal(sent.length, 1);
});

test("an error body that is not JSON still labels the status", () => {
  assert.equal(new AirtableError(503, "/x", "<html>").label, "Airtable 503");
  assert.equal(
    new AirtableError(404, "/x", '{"error":"NOT_FOUND"}').label,
    "Airtable 404 NOT_FOUND",
  );
});

test("a lookup chunk is a full page of ids, and every URL stays under the cap", async () => {
  const ids = Array.from(
    { length: 356 },
    (_, i) => `rec${String(i).padStart(14, "0")}`,
  );
  const { sent, impl } = stub(() => ok());
  await new Airtable("token", impl, "appBase").recordsByIds("tblI", ids, [
    "Summary",
    "Channel",
    "Occurred on",
    "Triggered By",
  ]);
  assert.equal(sent.length, 4);
  for (const { url } of sent) {
    assert.ok(url.toString().length < MAX_URL_LENGTH);
    assert.equal(url.searchParams.get("pageSize"), "100");
  }
  const asked = sent.flatMap(
    ({ url }) =>
      url.searchParams.get("filterByFormula")?.match(/rec\d+/g) ?? [],
  );
  assert.deepEqual(asked.sort(), ids);
});

test("idsPerLookup shrinks the chunk to fit the URL cap as ids or the URL grow", () => {
  assert.equal(idsPerLookup(500, 17), 100);
  // 44 characters an id once encoded: RECORD_ID%28%29%3D%27rec…%27%2C.
  assert.equal(idsPerLookup(MAX_URL_LENGTH - 44 * 30, 17), 30);
  const long = idsPerLookup(1_000, 400);
  assert.ok(long < 100);
  assert.ok(1_000 + long * 430 < MAX_URL_LENGTH);
  assert.equal(idsPerLookup(MAX_URL_LENGTH, 17), 1);
});
