// The worker end to end over a fake Airtable stubbed onto globalThis.fetch: the
// 503 before it is configured, the OAuth round trip, the no-access page, the
// CSRF gate on every POST, an action's real payloads, and a refresh mid-visit.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./index.ts";
import { AIRTABLE, FIELD } from "./config.ts";
import type { Env } from "./config.ts";
import { defaultNextTouch } from "./dates.ts";
import { codeChallenge } from "./oauth.ts";
import { newSession, sessionCookie } from "./session.ts";

const ENV: Env = {
  AIRTABLE_CLIENT_ID: "client-123",
  AIRTABLE_CLIENT_SECRET: "shh-secret",
  FOLLOWUP_SESSION_SECRET: "session-secret",
};
const CONFIG = {
  clientId: "client-123",
  clientSecret: "shh-secret",
  sessionSecret: "session-secret",
};
const ROOT = "https://snocap.vc/fundraising/followup";
const CAMPAIGN_A = "recCampaignAAAAA1";
const CAMPAIGN_B = "recCampaignBBBBB2";

interface Call {
  method: string;
  url: URL;
  auth: string | null;
  body: string;
}

function fakeAirtable(opts: { noAccess?: boolean } = {}) {
  const calls: Call[] = [];
  let issued = 0;
  const records: Record<
    string,
    { id: string; fields: Record<string, unknown> }[]
  > = {
    [AIRTABLE.campaigns]: [
      // View order, deliberately not alphabetical.
      {
        id: CAMPAIGN_B,
        fields: {
          Campaign: "Zeta Partners",
          Representative: { id: "usrNateNateNate01", name: "Nate" },
          "Limited Partner": ["recLP"],
          "Next Touch Point": "2020-01-01T16:00:00.000Z",
          Interactions: ["recInt1"],
        },
      },
      {
        id: CAMPAIGN_A,
        fields: {
          Campaign: "Alpha Family Office",
          "Deal Status": "2.0 - Contacted",
        },
      },
    ],
    [AIRTABLE.limitedPartners]: [
      { id: "recLP", fields: { Entity: "Zeta LP" } },
    ],
    [AIRTABLE.interactions]: [
      {
        id: "recInt1",
        fields: {
          Summary: "Sent the deck",
          Channel: "Email",
          "Occurred on": "2026-10-01T16:00:00.000Z",
        },
      },
    ],
  };
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const call: Call = {
      method: init?.method ?? "GET",
      url,
      auth: headers.get("Authorization"),
      body: init?.body ? String(init.body) : "",
    };
    calls.push(call);
    if (url.href === "https://airtable.com/oauth2/v1/token") {
      issued++;
      return Response.json({
        access_token: `access-${issued}`,
        refresh_token: `refresh-${issued}`,
        expires_in: 3600,
        refresh_expires_in: 5184000,
      });
    }
    const path = url.pathname.replace(/^\/v0/, "");
    if (path === "/meta/whoami")
      return Response.json({ id: "usrJon", email: "jon@sno.llc" });
    if (path === `/meta/bases/${AIRTABLE.base}/tables`) {
      return Response.json({
        tables: [
          {
            id: AIRTABLE.campaigns,
            fields: [
              { name: FIELD.representative, type: "singleCollaborator" },
              {
                name: FIELD.closedLostReason,
                options: { choices: [{ name: "Non-Responsive" }] },
              },
            ],
          },
        ],
      });
    }
    if (opts.noAccess)
      return Response.json({ error: "NOT_AUTHORIZED" }, { status: 403 });
    const [, , table, id, sub] = path.split("/");
    if (sub === "comments") {
      return call.method === "POST"
        ? Response.json({ id: "com1", text: JSON.parse(call.body).text })
        : Response.json({ comments: [] });
    }
    if (id) {
      const record = records[table]?.find((r) => r.id === id);
      return record
        ? Response.json(record)
        : Response.json({}, { status: 404 });
    }
    const formula = url.searchParams.get("filterByFormula");
    const wanted = formula
      ? [...formula.matchAll(/'(rec\w+)'/g)].map((m) => m[1])
      : null;
    const list = (records[table] ?? []).filter(
      (r) => !wanted || wanted.includes(r.id),
    );
    return Response.json({ records: list });
  }) as typeof fetch;
  return { calls, impl };
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function useAirtable(opts?: { noAccess?: boolean }) {
  const fake = fakeAirtable(opts);
  globalThis.fetch = fake.impl;
  return fake;
}

async function sessionFor(accessExpiresAt = Date.now() + 3_600_000) {
  const session = newSession(
    {
      accessToken: "access-0",
      refreshToken: "refresh-0",
      accessExpiresAt,
      refreshExpiresAt: Date.now() + 86_400_000,
    },
    { email: "jon@sno.llc", id: "usrJon" },
  );
  const cookie = (await sessionCookie(session, CONFIG)).split(";")[0];
  return { session, cookie };
}

function cookieValue(response: Response, name: string): string | null {
  for (const header of response.headers.getSetCookie()) {
    if (header.startsWith(`${name}=`)) return header.split(";")[0];
  }
  return null;
}

test("every path answers 503 'not configured yet' until all three secrets are set", async () => {
  for (const env of [
    {},
    { ...ENV, AIRTABLE_CLIENT_SECRET: "" },
    { ...ENV, FOLLOWUP_SESSION_SECRET: undefined },
  ]) {
    for (const request of [
      new Request(ROOT),
      new Request(`${ROOT}/oauth/start`),
      new Request(`${ROOT}/action`, { method: "POST" }),
    ]) {
      const response = await worker.fetch(request, env);
      assert.equal(response.status, 503);
      assert.match(await response.text(), /Not configured yet/);
    }
  }
});

test("a visitor with no session sees the Airtable sign-in, not the deck", async () => {
  useAirtable();
  const response = await worker.fetch(new Request(ROOT), ENV);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Sign in with Airtable/);
  assert.match(body, /href="\/fundraising\/followup\/oauth\/start"/);
});

test("the OAuth round trip: state + PKCE out, code + verifier back, session cookie set", async () => {
  const fake = useAirtable();
  const start = await worker.fetch(new Request(`${ROOT}/oauth/start`), ENV);
  assert.equal(start.status, 302);
  const sent = new URL(start.headers.get("Location") ?? "").searchParams;
  const stateCookie = cookieValue(start, "followup_oauth");
  assert.ok(stateCookie);

  const callback = await worker.fetch(
    new Request(
      `${ROOT}/oauth/callback?code=the-code&state=${sent.get("state")}`,
      {
        headers: { Cookie: stateCookie },
      },
    ),
    ENV,
  );
  assert.equal(callback.status, 302);
  assert.equal(callback.headers.get("Location"), "/fundraising/followup");
  const session = cookieValue(callback, "followup_session");
  assert.ok(session);
  assert.equal(cookieValue(callback, "followup_oauth"), "followup_oauth=");

  const exchange = fake.calls.find(
    (c) => c.url.pathname === "/oauth2/v1/token",
  );
  const body = new URLSearchParams(exchange?.body);
  assert.equal(body.get("code"), "the-code");
  assert.equal(
    await codeChallenge(body.get("code_verifier") ?? ""),
    sent.get("code_challenge"),
  );

  // The deck, read with the signed-in user's token, in the view's order.
  const deck = await worker.fetch(
    new Request(ROOT, { headers: { Cookie: session } }),
    ENV,
  );
  assert.equal(deck.status, 200);
  const html = await deck.text();
  assert.ok(
    html.indexOf("Zeta Partners") < html.indexOf("Alpha Family Office"),
  );
  assert.match(html, /Zeta LP/);
  assert.match(html, /Sent the deck/);
  assert.match(html, /class="overdue"/);
  const list = fake.calls.find(
    (c) =>
      c.url.pathname.endsWith(`/${AIRTABLE.campaigns}`) &&
      c.url.searchParams.get("view"),
  );
  assert.equal(list?.url.searchParams.get("view"), AIRTABLE.followUpsView);
  const airtableCalls = fake.calls.filter(
    (c) => c.url.hostname === "api.airtable.com",
  );
  assert.ok(airtableCalls.every((c) => c.auth === "Bearer access-1"));
});

test("a callback whose state does not match is refused before any token exchange", async () => {
  const fake = useAirtable();
  const start = await worker.fetch(new Request(`${ROOT}/oauth/start`), ENV);
  const stateCookie = cookieValue(start, "followup_oauth") ?? "";
  const callback = await worker.fetch(
    new Request(`${ROOT}/oauth/callback?code=c&state=forged`, {
      headers: { Cookie: stateCookie },
    }),
    ENV,
  );
  assert.equal(callback.status, 400);
  assert.equal(cookieValue(callback, "followup_session"), null);
  assert.ok(!fake.calls.some((c) => c.url.pathname === "/oauth2/v1/token"));
});

test("an account that cannot read the base gets the no-access page and no session", async () => {
  useAirtable({ noAccess: true });
  const start = await worker.fetch(new Request(`${ROOT}/oauth/start`), ENV);
  const state = new URL(start.headers.get("Location") ?? "").searchParams.get(
    "state",
  );
  const callback = await worker.fetch(
    new Request(`${ROOT}/oauth/callback?code=c&state=${state}`, {
      headers: { Cookie: cookieValue(start, "followup_oauth") ?? "" },
    }),
    ENV,
  );
  assert.equal(callback.status, 403);
  assert.match(await callback.text(), /No access/);
  assert.equal(cookieValue(callback, "followup_session"), null);

  // An existing session that loses access mid-visit gets the same page.
  const { cookie } = await sessionFor();
  const deck = await worker.fetch(
    new Request(ROOT, { headers: { Cookie: cookie } }),
    ENV,
  );
  assert.equal(deck.status, 403);
  assert.match(await deck.text(), /No access/);
});

function actionRequest(
  cookie: string,
  fields: Record<string, string>,
  origin = "https://snocap.vc",
) {
  return new Request(`${ROOT}/action`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
  });
}

test("a POST without the session's CSRF token, or from another origin, writes nothing", async () => {
  const fake = useAirtable();
  const { session, cookie } = await sessionFor();
  const attempts = [
    actionRequest(cookie, {
      campaign: CAMPAIGN_A,
      text: "x",
    }),
    actionRequest(cookie, {
      campaign: CAMPAIGN_A,
      text: "x",
      csrf: "guess",
    }),
    actionRequest(
      cookie,
      {
        campaign: CAMPAIGN_A,
        text: "x",
        csrf: session.csrf,
      },
      "https://evil.example",
    ),
  ];
  for (const request of attempts) {
    const response = await worker.fetch(request, ENV);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).ok, false);
  }
  const signOut = await worker.fetch(
    new Request(`${ROOT}/signout`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: new URLSearchParams({ csrf: "guess" }),
    }),
    ENV,
  );
  assert.equal(signOut.status, 403);
  assert.deepEqual(
    fake.calls.filter((c) => c.method !== "GET"),
    [],
  );
});

const NATE = { id: "usrNateNateNate01", name: "Nate" };

function writes(fake: { calls: Call[] }) {
  const patch = fake.calls.filter((c) => c.method === "PATCH");
  const comments = fake.calls.filter(
    (c) => c.method === "POST" && c.url.pathname.endsWith("/comments"),
  );
  return {
    patches: patch.map((c) => ({
      path: c.url.pathname,
      body: JSON.parse(c.body),
    })),
    comments: comments.map((c) => JSON.parse(c.body).text as string),
    order: fake.calls
      .filter(
        (c) => c.method !== "GET" && c.url.hostname === "api.airtable.com",
      )
      .map((c) => c.method),
  };
}

test("a comment posts exactly what was typed, mentions serialized, and moves Next Touch Point a week", async () => {
  const fake = useAirtable();
  const { session, cookie } = await sessionFor();
  const response = await worker.fetch(
    actionRequest(cookie, {
      campaign: CAMPAIGN_A,
      text: "  @Nate commitment is now $250K  ",
      mentions: JSON.stringify([NATE]),
      csrf: session.csrf,
    }),
    ENV,
  );
  assert.equal(response.status, 200);
  const { message, ok } = await response.json();
  assert.equal(ok, true);
  assert.match(message, /^Comment posted\. Next touch \w{3} \d+\.$/);
  assert.doesNotMatch(message, /KB/);

  const w = writes(fake);
  assert.deepEqual(
    w.order,
    ["PATCH", "POST"],
    "the date lands before the comment",
  );
  assert.deepEqual(w.comments, [`@[${NATE.id}] commitment is now $250K`]);
  assert.doesNotMatch(w.comments[0], /usrt57orTxVb75I3W/, "no auto @KB");
  assert.equal(
    w.patches[0].path,
    `/v0/${AIRTABLE.base}/${AIRTABLE.campaigns}/${CAMPAIGN_A}`,
  );
  assert.deepEqual(w.patches[0].body, {
    fields: {
      [FIELD.nextTouch]: `${defaultNextTouch(Date.now())}T16:00:00.000Z`,
    },
    typecast: false,
  });
  assert.ok(
    fake.calls
      .filter((c) => c.url.hostname === "api.airtable.com")
      .every((c) => c.auth === "Bearer access-0"),
  );
});

test("a comment that mentions KB says KB will reply", async () => {
  const fake = useAirtable();
  const { session, cookie } = await sessionFor();
  const response = await worker.fetch(
    actionRequest(cookie, {
      campaign: CAMPAIGN_A,
      text: "@KB close lost: Market Timing",
      mentions: JSON.stringify([{ id: AIRTABLE.kbUserId, name: "KB" }]),
      csrf: session.csrf,
    }),
    ENV,
  );
  assert.match((await response.json()).message, /KB will reply in the thread/);
  assert.deepEqual(writes(fake).comments, [
    "@[usrt57orTxVb75I3W] close lost: Market Timing",
  ]);
});

test("an empty submit only marks the card handled: the date moves, no comment posts", async () => {
  const fake = useAirtable();
  const { session, cookie } = await sessionFor();
  const response = await worker.fetch(
    actionRequest(cookie, {
      campaign: CAMPAIGN_A,
      text: "  ",
      csrf: session.csrf,
    }),
    ENV,
  );
  assert.equal(response.status, 200);
  assert.match(
    (await response.json()).message,
    /^Marked handled\. Next touch /,
  );
  const w = writes(fake);
  assert.deepEqual(w.order, ["PATCH"]);
  assert.deepEqual(w.comments, []);
});

test("the deck renders the mention list and each card's macro prefills", async () => {
  useAirtable();
  const { cookie } = await sessionFor();
  const response = await worker.fetch(
    new Request(ROOT, { headers: { Cookie: cookie } }),
    ENV,
  );
  const body = await response.text();
  const people = body.match(/data-people="([^"]*)"/)?.[1] ?? "";
  const list = JSON.parse(people.replaceAll("&quot;", '"'));
  assert.deepEqual(list, [{ id: AIRTABLE.kbUserId, name: "KB" }, NATE]);
  assert.match(body, /Comment… use @ to mention KB or a teammate/);
  assert.match(body, /Mark handled · \w{3} \d+/);
  assert.match(body, /data-template="@Nate any update here\?"/);
  assert.match(body, /data-template="@KB close lost: \{reason\}"/);
  assert.match(body, /<option value="Non-Responsive">/);
  // Alpha has no Representative, so it gets no Ping rep chip.
  assert.equal(body.match(/data-macro="ping-rep"/g)?.length, 1);
});

test("an expired access token is refreshed mid-visit and the new pair re-set", async () => {
  const fake = useAirtable();
  const { cookie } = await sessionFor(Date.now() - 1000);
  const response = await worker.fetch(
    new Request(ROOT, { headers: { Cookie: cookie } }),
    ENV,
  );
  assert.equal(response.status, 200);
  const refresh = fake.calls.find((c) => c.url.pathname === "/oauth2/v1/token");
  assert.equal(
    new URLSearchParams(refresh?.body).get("refresh_token"),
    "refresh-0",
  );
  assert.ok(cookieValue(response, "followup_session"));
  const reads = fake.calls.filter((c) => c.url.hostname === "api.airtable.com");
  assert.ok(
    reads.length > 0 && reads.every((c) => c.auth === "Bearer access-1"),
  );
});

test("the expanded card merges history and lists the LP's contacts", async () => {
  useAirtable();
  const { cookie } = await sessionFor();
  const response = await worker.fetch(
    new Request(`${ROOT}/campaign/${CAMPAIGN_B}`, {
      headers: { Cookie: cookie },
    }),
    ENV,
  );
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Email · Sent the deck/);
});
