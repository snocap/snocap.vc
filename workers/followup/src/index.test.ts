// The worker end to end over a fake Airtable stubbed onto globalThis.fetch: the
// 503 before it is configured, the OAuth round trip, the no-access page, the
// CSRF gate on every POST, an action's real payloads, and a refresh mid-visit.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { clock } from "./airtable.ts";
import worker from "./index.ts";
import { AIRTABLE, FIELD } from "./config.ts";
import type { Env } from "./config.ts";
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

function fakeAirtable(
  opts: { noAccess?: boolean; reasons?: string[]; uploadStatus?: number } = {},
) {
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
      {
        id: "recLP",
        fields: { Entity: "Zeta LP", "Primary Contacts": ["recContact1"] },
      },
    ],
    [AIRTABLE.contacts]: [
      { id: "recContact1", fields: { Name: "Zoë Ångström" } },
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
    if (url.hostname === "content.airtable.com") {
      return Response.json(
        { id: url.pathname.split("/")[3], fields: {} },
        { status: opts.uploadStatus ?? 200 },
      );
    }
    if (path === `/meta/bases/${AIRTABLE.base}/tables`) {
      return Response.json({
        tables: [
          {
            id: AIRTABLE.campaigns,
            fields: [
              { name: FIELD.representative, type: "singleCollaborator" },
              {
                name: FIELD.closedLostReason,
                options: {
                  choices: (opts.reasons ?? ["Non-Responsive"]).map((name) => ({
                    name,
                  })),
                },
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
    if (!id && call.method === "POST") {
      return Response.json({
        id: "recNewInteract01",
        ...JSON.parse(call.body),
      });
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
  return { calls, impl, records };
}

const realFetch = globalThis.fetch;
const realSleep = clock.sleep;
// The client's pacing and 429 backoff, skipped: airtable.test.ts times them.
beforeEach(() => {
  clock.sleep = async () => {};
});
afterEach(() => {
  globalThis.fetch = realFetch;
  clock.sleep = realSleep;
});

function useAirtable(opts?: Parameters<typeof fakeAirtable>[0]) {
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
  files: File[] = [],
) {
  if (files.length) {
    // The page posts multipart when it carries photos.
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    for (const file of files) body.append("files", file, file.name);
    return new Request(`${ROOT}/action`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin, Accept: "application/json" },
      body,
    });
  }
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

test("a comment posts exactly what was typed, mentions serialized, and writes nothing else", async () => {
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
  assert.equal(message, "Comment posted.");
  assert.doesNotMatch(message, /KB/);

  const w = writes(fake);
  assert.deepEqual(w.order, ["POST"], "the page sets no dates");
  assert.deepEqual(w.comments, [`@[${NATE.id}] commitment is now $250K`]);
  assert.doesNotMatch(w.comments[0], /usrt57orTxVb75I3W/, "no auto @KB");
  assert.deepEqual(w.patches, []);
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

test("an empty submit with nothing attached is refused and writes nothing", async () => {
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
  assert.equal(response.status, 400);
  assert.equal((await response.json()).reason, "nothing to post");
  assert.deepEqual(writes(fake).order, []);
});

function attr(body: string, name: string): unknown {
  const raw = body.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
  return JSON.parse(raw.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
}

test("the deck renders the mention list and each card's macro prefills", async () => {
  useAirtable();
  const { cookie } = await sessionFor();
  const response = await worker.fetch(
    new Request(ROOT, { headers: { Cookie: cookie } }),
    ENV,
  );
  const body = await response.text();
  // Everyone by their Airtable display name, KB included; no alias.
  assert.deepEqual(attr(body, "data-people"), [
    { id: AIRTABLE.kbUserId, name: "Kernel Bottie" },
    NATE,
  ]);
  assert.match(body, /use @ to mention someone; paste or drop an attachment/);
  assert.doesNotMatch(body, /@KB\b/);
  assert.match(body, /data-template="@Nate any update here\?"/);
  assert.match(body, /data-template="@Kernel Bottie close lost: \{reason\}"/);
  assert.match(body, /<option value="Non-Responsive">/);
  // Alpha has no Representative, so it gets no Ping rep chip.
  assert.equal(body.match(/data-macro="ping-rep"/g)?.length, 1);
});

test("every card's button is Post comment, disabled until there is something to post", async () => {
  useAirtable();
  const { cookie } = await sessionFor();
  const body = await (
    await worker.fetch(new Request(ROOT, { headers: { Cookie: cookie } }), ENV)
  ).text();
  const buttons = [
    ...body.matchAll(/<button type="submit"([^>]*)>([^<]*)<\/button>/g),
  ].map((m) => [m[1].trim(), m[2].trim()]);
  assert.deepEqual(buttons, [
    ["disabled", "Post comment"],
    ["disabled", "Post comment"],
  ]);
  assert.doesNotMatch(body, /Mark handled/);
});

test("Closed Lost Reasons come from the live schema on every load", async () => {
  const { cookie } = await sessionFor();
  const load = async () =>
    (
      await worker.fetch(
        new Request(ROOT, { headers: { Cookie: cookie } }),
        ENV,
      )
    ).text();
  useAirtable({ reasons: ["Non-Responsive"] });
  assert.doesNotMatch(await load(), /Fund Size/);
  useAirtable({ reasons: ["Non-Responsive", "Fund Size"] });
  assert.match(await load(), /<option value="Fund Size">Fund Size<\/option>/);
});

test("the deck carries a search entry per card, in view order, with contact names", async () => {
  useAirtable();
  const { cookie } = await sessionFor();
  const body = await (
    await worker.fetch(new Request(ROOT, { headers: { Cookie: cookie } }), ENV)
  ).text();
  assert.deepEqual(attr(body, "data-index"), [
    {
      name: "Zeta Partners",
      lp: "Zeta LP",
      contacts: ["Zoë Ångström"],
      rep: "Nate",
    },
    { name: "Alpha Family Office", lp: "", contacts: [], rep: "" },
  ]);
  assert.match(body, /data-user="usrJon"/);
  // The page runs the tested helpers themselves.
  assert.match(body, /const searchDeck = /);
  assert.match(body, /const carouselSlots = /);
});

const PNG = () =>
  new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], "shot.png", {
    type: "image/png",
  });

const PDF = () =>
  new File([new Uint8Array([37, 80, 68, 70])], "memo.pdf", {
    type: "application/pdf",
  });
const INSTRUCTION =
  "@[usrt57orTxVb75I3W] extract and update relevant information from recent interaction";

function attachmentRequest(
  cookie: string,
  csrf: string,
  text: string,
  files: File[],
) {
  return actionRequest(
    cookie,
    { campaign: CAMPAIGN_A, text, csrf },
    "https://snocap.vc",
    files,
  );
}

test("attachments with no text: one Interaction, the uploads, then just the @KB instruction", async () => {
  const fake = useAirtable();
  const { session, cookie } = await sessionFor();
  const response = await worker.fetch(
    attachmentRequest(cookie, session.csrf, "", [PNG(), PDF()]),
    ENV,
  );
  assert.equal(response.status, 200);
  const { ok, message } = await response.json();
  assert.equal(ok, true);
  assert.match(
    message,
    /^2 attachments saved\. KB will log the Interaction and reply in the thread\.$/,
  );

  const create = fake.calls.find(
    (c) =>
      c.method === "POST" &&
      c.url.pathname === `/v0/${AIRTABLE.base}/${AIRTABLE.interactions}`,
  );
  assert.ok(create, "an Interaction is created");
  const created = JSON.parse(create.body);
  assert.equal(created.typecast, false);
  assert.deepEqual(created.fields, {
    Campaign: [CAMPAIGN_A],
    "Triggered By": { id: "usrJon" },
    "Occurred on": created.fields["Occurred on"],
    Summary: "New Interaction Attachment",
  });
  assert.match(
    created.fields["Occurred on"],
    /^\d{4}-\d{2}-\d{2}T16:00:00\.000Z$/,
  );
  assert.equal(created.fields.Channel, undefined, "Channel is left for KB");

  const uploads = fake.calls.filter(
    (c) => c.url.hostname === "content.airtable.com",
  );
  assert.equal(uploads.length, 2);
  assert.equal(
    uploads[0].url.pathname,
    `/v0/${AIRTABLE.base}/recNewInteract01/Attachments/uploadAttachment`,
  );
  assert.equal(uploads[0].auth, "Bearer access-0", "the user's own token");
  assert.deepEqual(JSON.parse(uploads[0].body), {
    contentType: "image/png",
    filename: "shot.png",
    file: Buffer.from([137, 80, 78, 71, 1, 2, 3]).toString("base64"),
  });
  assert.equal(JSON.parse(uploads[1].body).contentType, "application/pdf");

  const w = writes(fake);
  assert.deepEqual(w.comments, [INSTRUCTION]);
  // The Interaction and its files, then the comment that sends KB to them;
  // nothing touches the Campaign itself.
  const order = fake.calls
    .filter((c) => c.method !== "GET")
    .map(
      (c) =>
        `${c.method} ${c.url.hostname === "content.airtable.com" ? "upload" : c.url.pathname.split("/").slice(3).join("/")}`,
    );
  assert.deepEqual(order, [
    `POST ${AIRTABLE.interactions}`,
    "POST upload",
    "POST upload",
    `POST ${AIRTABLE.campaigns}/${CAMPAIGN_A}/comments`,
  ]);
});

test("attachments with text: the typed comment, mentions serialized, then the instruction line", async () => {
  const fake = useAirtable();
  const { session, cookie } = await sessionFor();
  const response = await worker.fetch(
    actionRequest(
      cookie,
      {
        campaign: CAMPAIGN_A,
        text: "@Nate they replied on WhatsApp",
        mentions: JSON.stringify([NATE]),
        csrf: session.csrf,
      },
      "https://snocap.vc",
      [PNG()],
    ),
    ENV,
  );
  assert.match(
    (await response.json()).message,
    /^Attachment saved\. KB will log the Interaction/,
  );
  assert.deepEqual(writes(fake).comments, [
    `@[${NATE.id}] they replied on WhatsApp\n${INSTRUCTION}`,
  ]);
});

test("a failed upload posts no comment, so KB is never sent to a half-saved record", async () => {
  const fake = useAirtable({ uploadStatus: 422 });
  const { session, cookie } = await sessionFor();
  const response = await worker.fetch(
    attachmentRequest(cookie, session.csrf, "hello", [PNG()]),
    ENV,
  );
  assert.equal(response.status, 502);
  const { message, reason } = await response.json();
  assert.match(message, /attachments did not save/);
  assert.equal(reason, "upload failed");
  assert.deepEqual(writes(fake).comments, []);
  assert.deepEqual(writes(fake).patches, []);
});

/** A submit read the way the page reads it: the NDJSON lines, in order. */
async function streamed(request: Request): Promise<Record<string, unknown>[]> {
  request.headers.set("Accept", "application/x-ndjson, application/json");
  const response = await worker.fetch(request, ENV);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/x-ndjson");
  return (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

test("a streamed submit reports each upload, then the comment, as they start", async () => {
  useAirtable();
  const { session, cookie } = await sessionFor();
  const lines = await streamed(
    attachmentRequest(cookie, session.csrf, "hi", [PNG(), PDF()]),
  );
  assert.deepEqual(lines.slice(0, -1), [
    { phase: "upload", n: 1, of: 2 },
    { phase: "upload", n: 2, of: 2 },
    { phase: "comment" },
  ]);
  assert.equal(lines.at(-1)?.done, true);
  assert.equal(lines.at(-1)?.ok, true);
  assert.match(String(lines.at(-1)?.message), /^2 attachments saved/);
});

test("a streamed comment has only the comment phase", async () => {
  useAirtable();
  const { session, cookie } = await sessionFor();
  const lines = await streamed(
    actionRequest(cookie, {
      campaign: CAMPAIGN_A,
      text: "hi",
      csrf: session.csrf,
    }),
  );
  assert.deepEqual(
    lines.map((l) => l.phase ?? "done"),
    ["comment", "done"],
  );
});

test("a streamed failure arrives in the last line with a short reason", async () => {
  useAirtable({ uploadStatus: 422 });
  const { session, cookie } = await sessionFor();
  const lines = await streamed(
    attachmentRequest(cookie, session.csrf, "", [PNG()]),
  );
  assert.deepEqual(lines.at(-1), {
    done: true,
    ok: false,
    reason: "upload failed",
    message: "The attachments did not save, so nothing was posted. Try again.",
  });
  assert.equal(
    lines.some((l) => l.phase === "comment"),
    false,
  );
});

test("a file over 5 MB or too many files is refused before anything is written", async () => {
  const fake = useAirtable();
  const { session, cookie } = await sessionFor();
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "deck.pdf", {
    type: "application/pdf",
  });
  for (const files of [[big], Array.from({ length: 11 }, PNG)]) {
    const response = await worker.fetch(
      attachmentRequest(cookie, session.csrf, "", files),
      ENV,
    );
    assert.equal(response.status, 400);
    const { ok, message } = await response.json();
    assert.equal(ok, false);
    assert.match(message, /5 MB|at most 10/);
  }
  assert.deepEqual(
    fake.calls.filter((c) => c.method !== "GET"),
    [],
  );
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

/** The fake Airtable, but every read of the Follow Ups view answers `status`. */
function failingView(status: number, body: object) {
  const fake = fakeAirtable();
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.searchParams.get("view") === AIRTABLE.followUpsView) {
      return new Response(JSON.stringify(body), { status });
    }
    return fake.impl(input, init);
  };
  return fake;
}

test("a 429 that outlasts the retries says Airtable is rate-limiting, with the status in small print", async () => {
  failingView(429, {
    errors: [{ error: "RATE_LIMIT_REACHED", message: "Rate limit exceeded" }],
  });
  const { cookie } = await sessionFor();
  const response = await worker.fetch(
    new Request(ROOT, { headers: { Cookie: cookie } }),
    ENV,
  );
  assert.equal(response.status, 429);
  const page = await response.text();
  assert.match(
    page,
    /Airtable is rate-limiting us\. Try again in 30 seconds\./,
  );
  assert.match(page, /Airtable 429 RATE_LIMIT_REACHED/);
  assert.doesNotMatch(page, /did not answer as expected/);
});

test("any other Airtable failure keeps the generic message and names its status and code", async () => {
  failingView(422, {
    error: { type: "INVALID_FILTER_BY_FORMULA", message: "bad formula" },
  });
  const { cookie } = await sessionFor();
  const response = await worker.fetch(
    new Request(ROOT, { headers: { Cookie: cookie } }),
    ENV,
  );
  assert.equal(response.status, 502);
  const page = await response.text();
  assert.match(page, /did not answer as expected/);
  assert.match(page, /Airtable 422 INVALID_FILTER_BY_FORMULA/);
});
