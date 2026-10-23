// snocap.vc/fundraising/followup — the LP follow-up review deck.
//
// One card per Campaign in the Campaign Tracker's "Follow Ups" view, in that
// view's order, with the Campaign's history, its contacts, and actions that
// write back to Airtable. Sign-in is Airtable OAuth (oauth.ts) and every
// Airtable call is made with the signed-in user's own token: the Worker holds
// no Airtable credential, so the page can only ever show what the visitor's own
// Airtable account can already see.

import { Airtable, AirtableError } from "./airtable.ts";
import type { AirtableRecord } from "./airtable.ts";
import {
  cardOf,
  contactCard,
  interactionLine,
  linkedIds,
  timeline,
} from "./campaigns.ts";
import type { InteractionLine } from "./campaigns.ts";
import {
  AIRTABLE,
  FIELD,
  OAUTH_PATH,
  ORIGIN,
  TOOL_PATH,
  configFrom,
} from "./config.ts";
import type { Config, Env } from "./config.ts";
import { macroById } from "./macros.ts";
import {
  STATE_TTL_MS,
  beginAuthorization,
  exchangeCode,
  verifierFor,
} from "./oauth.ts";
import {
  ACTION_PATH,
  DETAIL_PATH,
  SIGN_OUT_PATH,
  renderDetail,
  renderError,
  renderNoAccess,
  renderReview,
  renderSignIn,
  renderUnconfigured,
} from "./pages.ts";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  clearCookie,
  cookieHeader,
  csrfOk,
  ensureFresh,
  newSession,
  readSession,
  sessionCookie,
} from "./session.ts";
import type { Session } from "./session.ts";
import { readCookie } from "../../shared/cookie.ts";

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
};

function html(body: string, status = 200, cookies: string[] = []): Response {
  const headers = new Headers({
    ...BASE_HEADERS,
    "Content-Type": "text/html; charset=utf-8",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(body, { status, headers });
}

function json(body: { ok: boolean; message: string }, status = 200): Response {
  return Response.json(body, { status, headers: BASE_HEADERS });
}

function redirect(
  location: string,
  cookies: string[] = [],
  status = 302,
): Response {
  const headers = new Headers({ ...BASE_HEADERS, Location: location });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status, headers });
}

function wantsJson(request: Request): boolean {
  return (request.headers.get("Accept") ?? "").includes("application/json");
}

const CAMPAIGN_FIELDS = [
  FIELD.campaign,
  FIELD.limitedPartner,
  FIELD.representative,
  FIELD.dealStatus,
  FIELD.dealValue,
  FIELD.nextTouch,
  FIELD.probability,
  FIELD.interactions,
];
const INTERACTION_FIELDS = [
  FIELD.summary,
  FIELD.channel,
  FIELD.occurredOn,
  FIELD.triggeredBy,
];
const CONTACT_FIELDS = [
  FIELD.contactName,
  FIELD.email,
  FIELD.phone,
  FIELD.profile,
];

const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;

/** A status that means "this account cannot open the base", not "try again". */
function isNoAccess(err: unknown): boolean {
  return err instanceof AirtableError && [403, 404].includes(err.status);
}

async function handleCallback(
  request: Request,
  url: URL,
  config: Config,
): Promise<Response> {
  const clearState = clearCookie(STATE_COOKIE, OAUTH_PATH);
  const denied = url.searchParams.get("error");
  if (denied) {
    return html(
      renderSignIn(
        `Airtable did not grant access (${denied}). Try again when ready.`,
      ),
      400,
      [clearState],
    );
  }
  const verifier = await verifierFor(
    readCookie(request, STATE_COOKIE),
    url.searchParams.get("state"),
    config,
  );
  const code = url.searchParams.get("code");
  if (!verifier || !code) {
    // A missing, expired or mismatched state is either a stale tab or a forged
    // callback. Either way the answer is to start over, never to proceed.
    return html(
      renderSignIn("That sign-in expired or did not match. Start it again."),
      400,
      [clearState],
    );
  }
  const tokens = await exchangeCode(code, verifier, config);
  if (!tokens) {
    return html(renderError("Airtable refused the sign-in. Try again."), 502, [
      clearState,
    ]);
  }

  const airtable = new Airtable(tokens.accessToken);
  const user = await airtable.whoami();
  try {
    await airtable.listView(
      AIRTABLE.campaigns,
      AIRTABLE.followUpsView,
      [FIELD.campaign],
      1,
    );
  } catch (err) {
    if (isNoAccess(err)) {
      // No session is kept for an account that cannot read the base.
      return html(renderNoAccess(user.email ?? ""), 403, [clearState]);
    }
    throw err;
  }

  const session = newSession(tokens, { email: user.email ?? "", id: user.id });
  console.log(
    JSON.stringify({ event: "followup_signed_in", email: session.email }),
  );
  return redirect(TOOL_PATH, [
    clearState,
    await sessionCookie(session, config),
  ]);
}

async function handleReview(
  airtable: Airtable,
  session: Session,
): Promise<Response> {
  const campaigns = await airtable.listView(
    AIRTABLE.campaigns,
    AIRTABLE.followUpsView,
    CAMPAIGN_FIELDS,
  );
  const lps = await airtable.recordsByIds(
    AIRTABLE.limitedPartners,
    campaigns.flatMap((c) => linkedIds(c, FIELD.limitedPartner)),
    [FIELD.lpEntity],
  );
  const interactions = await airtable.recordsByIds(
    AIRTABLE.interactions,
    campaigns.flatMap((c) => linkedIds(c, FIELD.interactions)),
    INTERACTION_FIELDS,
  );
  const reasons = await airtable.selectOptions(
    AIRTABLE.campaigns,
    FIELD.closedLostReason,
  );

  const lpNames = new Map(
    lps.map((lp) => [lp.id, String(lp.fields[FIELD.lpEntity] ?? "")]),
  );
  const lines = new Map<string, InteractionLine>(
    interactions.map((r) => [r.id, interactionLine(r)]),
  );
  const now = Date.now();
  const cards = campaigns.map((c) => cardOf(c, lpNames, lines, now));
  return html(renderReview(cards, session, reasons));
}

async function handleDetail(airtable: Airtable, id: string): Promise<Response> {
  if (!RECORD_ID.test(id)) return html("Not found", 404);
  const campaign = await airtable.getRecord(AIRTABLE.campaigns, id);
  const interactions = await airtable.recordsByIds(
    AIRTABLE.interactions,
    linkedIds(campaign, FIELD.interactions),
    [...INTERACTION_FIELDS, FIELD.details],
  );
  const comments = await airtable.listComments(AIRTABLE.campaigns, id);
  const lps = await airtable.recordsByIds(
    AIRTABLE.limitedPartners,
    linkedIds(campaign, FIELD.limitedPartner),
    [FIELD.lpPrimaryContacts],
  );
  const contacts: AirtableRecord[] = await airtable.recordsByIds(
    AIRTABLE.contacts,
    lps.flatMap((lp) => linkedIds(lp, FIELD.lpPrimaryContacts)),
    CONTACT_FIELDS,
  );
  return html(
    renderDetail(
      contacts.map(contactCard),
      timeline(interactions.map(interactionLine), comments),
    ),
  );
}

async function handleAction(
  request: Request,
  airtable: Airtable,
  session: Session,
): Promise<Response> {
  const form = await request.formData();
  const reply = (ok: boolean, message: string, status: number): Response =>
    wantsJson(request)
      ? json({ ok, message }, status)
      : html(renderError(message), status);

  if (!csrfOk(request, session, form.get("csrf"), ORIGIN)) {
    return reply(false, "This page is stale. Reload it and try again.", 403);
  }
  const macro = macroById(String(form.get("macro") ?? "instruct"));
  if (!macro) return reply(false, "Unknown action.", 400);
  const id = String(form.get("campaign") ?? "");
  if (!RECORD_ID.test(id)) return reply(false, "Unknown Campaign.", 400);

  const campaign = await airtable.getRecord(AIRTABLE.campaigns, id);
  const planned = macro.plan({
    campaignName: String(campaign.fields[FIELD.campaign] ?? ""),
    nextTouch: (campaign.fields[FIELD.nextTouch] as string | undefined) ?? null,
    closedLostReasons:
      macro.input === "reasons"
        ? await airtable.selectOptions(
            AIRTABLE.campaigns,
            FIELD.closedLostReason,
          )
        : [],
    now: Date.now(),
    input: {
      text: String(form.get("text") ?? ""),
      date: String(form.get("date") ?? ""),
      reasons: form.getAll("reasons").map(String),
    },
  });
  if ("error" in planned) return reply(false, planned.error, 400);

  if (planned.fields) {
    await airtable.updateRecord(AIRTABLE.campaigns, id, planned.fields);
  }
  if (planned.comment) {
    try {
      await airtable.createComment(AIRTABLE.campaigns, id, planned.comment);
    } catch (err) {
      // The field write already landed; say so rather than report a clean failure.
      console.error(
        JSON.stringify({
          event: "followup_comment_failed",
          id,
          error: String(err),
        }),
      );
      return reply(
        false,
        planned.fields
          ? "The field was updated, but the comment did not post. Add it by hand."
          : "The comment did not post. Try again.",
        502,
      );
    }
  }
  console.log(
    JSON.stringify({
      event: "followup_action",
      macro: macro.id,
      campaign: id,
      by: session.email,
    }),
  );
  if (!wantsJson(request)) return redirect(`${TOOL_PATH}#c-${id}`, [], 303);
  return json({ ok: true, message: planned.result });
}

async function route(
  request: Request,
  url: URL,
  config: Config,
): Promise<Response> {
  const path = url.pathname;

  if (request.method === "GET" && path === `${OAUTH_PATH}/start`) {
    const { cookieValue, location } = await beginAuthorization(config);
    return redirect(location, [
      cookieHeader(STATE_COOKIE, cookieValue, OAUTH_PATH, STATE_TTL_MS / 1000),
    ]);
  }
  if (request.method === "GET" && path === `${OAUTH_PATH}/callback`) {
    return handleCallback(request, url, config);
  }

  const isRoot = path === TOOL_PATH || path === `${TOOL_PATH}/`;
  const stored = await readSession(request, config);
  const fresh = stored ? await ensureFresh(stored, config) : null;
  if (!fresh) {
    const cookies = stored ? [clearCookie(SESSION_COOKIE, TOOL_PATH)] : [];
    const message = stored
      ? "Your Airtable session ended. Sign in again."
      : undefined;
    if (request.method === "POST" && wantsJson(request)) {
      return json(
        { ok: false, message: "Signed out. Reload and sign in again." },
        401,
      );
    }
    if (isRoot) return html(renderSignIn(message), 200, cookies);
    return redirect(TOOL_PATH, cookies);
  }

  const session = fresh.session;
  const airtable = new Airtable(session.accessToken);
  let response: Response;
  try {
    if (request.method === "GET" && isRoot) {
      response = await handleReview(airtable, session);
    } else if (request.method === "GET" && path.startsWith(`${DETAIL_PATH}/`)) {
      response = await handleDetail(
        airtable,
        path.slice(DETAIL_PATH.length + 1),
      );
    } else if (request.method === "POST" && path === ACTION_PATH) {
      response = await handleAction(request, airtable, session);
    } else if (request.method === "POST" && path === SIGN_OUT_PATH) {
      const form = await request.formData();
      if (!csrfOk(request, session, form.get("csrf"), ORIGIN)) {
        return html(
          renderError("This page is stale. Reload it and try again."),
          403,
        );
      }
      return redirect(TOOL_PATH, [clearCookie(SESSION_COOKIE, TOOL_PATH)], 303);
    } else {
      return redirect(TOOL_PATH);
    }
  } catch (err) {
    if (err instanceof AirtableError && err.status === 401) {
      return html(
        renderSignIn("Airtable signed you out. Sign in again."),
        401,
        [clearCookie(SESSION_COOKIE, TOOL_PATH)],
      );
    }
    if (isNoAccess(err)) return html(renderNoAccess(session.email), 403);
    console.error(
      JSON.stringify({ event: "followup_error", path, error: String(err) }),
    );
    const message =
      "Airtable did not answer as expected. Try again in a moment.";
    return wantsJson(request)
      ? json({ ok: false, message }, 502)
      : html(renderError(message), 502);
  }
  if (fresh.refreshed) {
    // Airtable rotates the refresh token on every use, so the new pair must reach
    // the browser or the next refresh fails.
    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", await sessionCookie(session, config));
    return new Response(response.body, { status: response.status, headers });
  }
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const onTool =
      url.pathname === TOOL_PATH || url.pathname.startsWith(`${TOOL_PATH}/`);
    if (!onTool) return fetch(request);

    const config = configFrom(env);
    if (!config) return html(renderUnconfigured(), 503);
    return route(request, url, config);
  },
};
