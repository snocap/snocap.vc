// The "Make suggestion" chip end to end through the Worker: hidden (and its
// routes closed) without the suggest secret, the start and poll proxied to KB's
// API with the session's CSRF token, the shared secret and the signed-in
// user as requester, and nothing ever written to Airtable.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./index.ts";
import { AIRTABLE, SUGGEST_API } from "./config.ts";
import type { Env } from "./config.ts";
import { newSession, sessionCookie } from "./session.ts";

const BASE_ENV: Env = {
  AIRTABLE_CLIENT_ID: "client-123",
  AIRTABLE_CLIENT_SECRET: "shh-secret",
  FOLLOWUP_SESSION_SECRET: "session-secret",
};
const ENV: Env = { ...BASE_ENV, FOLLOWUP_SUGGEST_SECRET: "kb-shared" };
const ROOT = "https://snocap.vc/fundraising/followup";
const CAMPAIGN = "recCampaignAAAAA1";
const JOB = "followup-suggest-0a1b2c3d";

interface Seen {
  method: string;
  url: string;
  secret: string | null;
  body: string;
}

/** A fake of both remotes: Airtable answers one Campaign, KB's suggest API
 * answers whatever `kb` scripts. Every call is recorded. */
function useRemotes(kb: (call: Seen) => Response) {
  const seen: Seen[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: Seen = {
      method: init?.method ?? "GET",
      url: url.href,
      secret: new Headers(init?.headers).get("x-followup-secret"),
      body: init?.body ? String(init.body) : "",
    };
    seen.push(call);
    if (url.href.startsWith(SUGGEST_API)) return kb(call);
    const path = url.pathname.replace(/^\/v0/, "");
    if (path.startsWith(`/meta/bases/${AIRTABLE.base}/tables`)) {
      return Response.json({
        tables: [{ id: AIRTABLE.campaigns, fields: [] }],
      });
    }
    if (path === `/${AIRTABLE.base}/${AIRTABLE.campaigns}`) {
      return Response.json({
        records: [
          { id: CAMPAIGN, fields: { Campaign: "Alpha Family Office" } },
        ],
      });
    }
    return Response.json({ records: [] });
  }) as typeof fetch;
  return seen;
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

async function signedIn() {
  const session = newSession(
    {
      accessToken: "access-0",
      refreshToken: "refresh-0",
      accessExpiresAt: Date.now() + 3_600_000,
      refreshExpiresAt: Date.now() + 86_400_000,
    },
    { email: "jon@sno.llc", id: "usrJon" },
  );
  const cookie = (
    await sessionCookie(session, {
      clientId: "client-123",
      clientSecret: "shh-secret",
      sessionSecret: "session-secret",
    })
  ).split(";")[0];
  return { csrf: session.csrf, cookie };
}

function start(cookie: string, fields: Record<string, string>) {
  return new Request(`${ROOT}/suggest`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://snocap.vc",
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields).toString(),
  });
}

function poll(cookie: string, csrf: string | null, id = JOB) {
  const headers: Record<string, string> = {
    Cookie: cookie,
    Accept: "application/json",
  };
  if (csrf) headers["X-CSRF-Token"] = csrf;
  return new Request(`${ROOT}/suggest/${id}`, { headers });
}

const toKb = (seen: Seen[]) =>
  seen.filter((c) => c.url.startsWith(SUGGEST_API));
const toAirtable = (seen: Seen[]) =>
  seen.filter((c) => !c.url.startsWith(SUGGEST_API));

test("with the suggest secret every card has one Make suggestion chip, marked as AI", async () => {
  useRemotes(() => Response.json({}));
  const { cookie } = await signedIn();
  const page = await (
    await worker.fetch(new Request(ROOT, { headers: { Cookie: cookie } }), ENV)
  ).text();
  assert.equal(page.match(/class="chip ai" data-suggest/g)?.length, 1);
  assert.match(page, /data-suggest-path="\/fundraising\/followup\/suggest"/);
  // One fixed accent for every AI chip, defined once in the layout.
  assert.equal(page.match(/\.chips \.chip\.ai \{/g)?.length, 1);
});

test("without the suggest secret the chip is hidden, the deck still loads and the routes are closed", async () => {
  const seen = useRemotes(() => Response.json({ id: JOB }, { status: 202 }));
  const { csrf, cookie } = await signedIn();
  const response = await worker.fetch(
    new Request(ROOT, { headers: { Cookie: cookie } }),
    BASE_ENV,
  );
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /data-suggest>/);

  const refused = await worker.fetch(
    start(cookie, { csrf, campaign: CAMPAIGN }),
    BASE_ENV,
  );
  assert.equal(refused.status, 404);
  assert.equal((await refused.json()).ok, false);
  assert.deepEqual(toKb(seen), []);
});

test("a start asks KB with the shared secret, the Campaign and the signed-in user, and writes nothing", async () => {
  const seen = useRemotes(() => Response.json({ id: JOB }, { status: 202 }));
  const { csrf, cookie } = await signedIn();
  const response = await worker.fetch(
    start(cookie, { csrf, campaign: CAMPAIGN }),
    ENV,
  );
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true, id: JOB });
  const [call] = toKb(seen);
  assert.equal(call.method, "POST");
  assert.equal(call.url, SUGGEST_API);
  assert.equal(call.secret, "kb-shared");
  assert.deepEqual(JSON.parse(call.body), {
    campaign: CAMPAIGN,
    requester: "jon@sno.llc",
  });
  assert.deepEqual(toAirtable(seen), [], "no Airtable call, let alone a write");
});

test("a start without the CSRF token, from another origin, or for a junk Campaign never reaches KB", async () => {
  const seen = useRemotes(() => Response.json({ id: JOB }, { status: 202 }));
  const { csrf, cookie } = await signedIn();
  const noToken = await worker.fetch(
    start(cookie, { campaign: CAMPAIGN }),
    ENV,
  );
  assert.equal(noToken.status, 403);
  assert.match((await noToken.json()).message, /stale/);

  const foreign = start(cookie, { csrf, campaign: CAMPAIGN });
  const fromElsewhere = new Request(foreign, {
    headers: new Headers({
      ...Object.fromEntries(foreign.headers),
      Origin: "https://evil.example",
    }),
  });
  assert.equal((await worker.fetch(fromElsewhere, ENV)).status, 403);

  const junk = await worker.fetch(
    start(cookie, { csrf, campaign: "nope" }),
    ENV,
  );
  assert.equal(junk.status, 400);
  assert.deepEqual(toKb(seen), []);
});

test("a start KB refuses comes back as a sentence, not a crash", async () => {
  useRemotes(() => Response.json({ error: "enqueue failed" }, { status: 502 }));
  const { csrf, cookie } = await signedIn();
  const response = await worker.fetch(
    start(cookie, { csrf, campaign: CAMPAIGN }),
    ENV,
  );
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.message, /KB could not start a suggestion \(502\)/);
});

test("a poll relays pending, then the finished text, with the secret on every call", async () => {
  let answer: object = { status: "pending" };
  const seen = useRemotes(() => Response.json(answer));
  const { csrf, cookie } = await signedIn();
  assert.deepEqual(await (await worker.fetch(poll(cookie, csrf), ENV)).json(), {
    ok: true,
    status: "pending",
  });
  answer = { status: "done", text: "@Kernel Bottie draft a follow-up" };
  assert.deepEqual(await (await worker.fetch(poll(cookie, csrf), ENV)).json(), {
    ok: true,
    status: "done",
    text: "@Kernel Bottie draft a follow-up",
  });
  const calls = toKb(seen);
  assert.deepEqual(
    calls.map((c) => [c.method, c.url, c.secret]),
    [
      ["GET", `${SUGGEST_API}/${JOB}`, "kb-shared"],
      ["GET", `${SUGGEST_API}/${JOB}`, "kb-shared"],
    ],
  );
});

test("a poll of a failed job, or one KB no longer knows, says so", async () => {
  let kb = () => Response.json({ status: "error", error: "no such Campaign" });
  useRemotes(() => kb());
  const { csrf, cookie } = await signedIn();
  const failed = await (await worker.fetch(poll(cookie, csrf), ENV)).json();
  assert.equal(failed.ok, false);
  assert.equal(
    failed.message,
    "KB could not make a suggestion: no such Campaign",
  );

  kb = () => Response.json({ error: "not found" }, { status: 404 });
  const gone = await worker.fetch(poll(cookie, csrf), ENV);
  assert.equal(gone.status, 404);
  assert.match((await gone.json()).message, /Ask for a new one/);
});

test("a poll without the CSRF header, or with a junk id, never reaches KB", async () => {
  const seen = useRemotes(() => Response.json({ status: "pending" }));
  const { csrf, cookie } = await signedIn();
  assert.equal((await worker.fetch(poll(cookie, null), ENV)).status, 403);
  assert.equal(
    (await worker.fetch(poll(cookie, csrf, "..%2Fadmin"), ENV)).status,
    404,
  );
  assert.deepEqual(toKb(seen), []);
});

test("a suggest call with no session is a JSON 401, not the sign-in page", async () => {
  useRemotes(() => Response.json({ status: "pending" }));
  const response = await worker.fetch(
    new Request(`${ROOT}/suggest/${JOB}`, {
      headers: { Accept: "application/json" },
    }),
    ENV,
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).ok, false);
});
