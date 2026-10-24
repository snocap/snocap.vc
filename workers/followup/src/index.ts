// snocap.vc/fundraising/followup — the LP follow-up review deck.
//
// One card per Campaign in the Campaign Tracker's "Follow Ups" view, in that
// view's order, with the Campaign's history, its contacts, and actions that
// write back to Airtable. Sign-in is Airtable OAuth (oauth.ts) and every
// Airtable call is made with the signed-in user's own token: the Worker holds
// no Airtable credential, so the page can only ever show what the visitor's own
// Airtable account can already see.

import { Airtable, AirtableError, selectOptions } from "./airtable.ts";
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
import { nextTouchAfterSubmit, nextTouchValue, shortDay } from "./dates.ts";
import {
  KB,
  choicePeople,
  commentPeople,
  mentionsUser,
  mergePeople,
  parseMentions,
  recordPeople,
  serializeComment,
} from "./mentions.ts";
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
  attachmentComment,
  saveAttachments,
  uploadProblem,
  uploadsOf,
} from "./attachments.ts";
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
  FIELD.createdBy,
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

/** Collaborator fields whose people can be mentioned. */
const PEOPLE_FIELDS = [FIELD.representative, FIELD.createdBy];

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
    [FIELD.lpEntity, FIELD.lpPrimaryContacts],
  );
  // Contact names only, for search; the full contact cards load per card.
  const contacts = await airtable.recordsByIds(
    AIRTABLE.contacts,
    lps.flatMap((lp) => linkedIds(lp, FIELD.lpPrimaryContacts)),
    [FIELD.contactName],
  );
  const interactions = await airtable.recordsByIds(
    AIRTABLE.interactions,
    campaigns.flatMap((c) => linkedIds(c, FIELD.interactions)),
    INTERACTION_FIELDS,
  );
  // Read on every page load, never cached: a Closed Lost Reason added in
  // Airtable shows on the next reload.
  const schema = await airtable.tableFields(AIRTABLE.campaigns);

  const lpNames = new Map(
    lps.map((lp) => [lp.id, String(lp.fields[FIELD.lpEntity] ?? "")]),
  );
  const lines = new Map<string, InteractionLine>(
    interactions.map((r) => [r.id, interactionLine(r)]),
  );
  const contactName = new Map(
    contacts.map((c) => [c.id, String(c.fields[FIELD.contactName] ?? "")]),
  );
  const contactNames = new Map(
    lps.map((lp) => [
      lp.id,
      linkedIds(lp, FIELD.lpPrimaryContacts)
        .map((id) => contactName.get(id) ?? "")
        .filter(Boolean),
    ]),
  );
  const now = Date.now();
  const cards = campaigns.map((c) =>
    cardOf(c, lpNames, lines, now, contactNames),
  );
  const people = mergePeople(
    recordPeople(campaigns, PEOPLE_FIELDS),
    recordPeople(interactions, [FIELD.triggeredBy]),
    choicePeople(schema.find((f) => f.name === FIELD.representative)?.options),
  );
  return html(
    renderReview(cards, session, {
      csrf: session.csrf,
      closedLostReasons: selectOptions(schema, FIELD.closedLostReason),
      people,
    }),
  );
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
      mergePeople(
        recordPeople([campaign], PEOPLE_FIELDS),
        recordPeople(interactions, [FIELD.triggeredBy]),
        commentPeople(comments),
      ),
    ),
  );
}

/** Every submit keeps the Campaign's Next Touch Point at least a week out,
 * which is what takes it down the Follow Ups list (dates.ts
 * nextTouchAfterSubmit). A non-empty box is posted as the user's comment,
 * exactly as typed but for its mentions. Attachments are saved on a new
 * Interaction first, and the comment then also asks KB to fill it in
 * (attachments.ts). KB reads every comment and moves the date again when one
 * implies another. */
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
  const id = String(form.get("campaign") ?? "");
  if (!RECORD_ID.test(id)) return reply(false, "Unknown Campaign.", 400);
  const typed = serializeComment(
    String(form.get("text") ?? "").trim(),
    parseMentions(form.get("mentions")),
  );
  const files = uploadsOf(form);
  const problem = uploadProblem(files);
  if (problem) return reply(false, problem, 400);
  const comment = files.length ? attachmentComment(typed) : typed;
  const now = Date.now();

  // The date first: the comment wakes KB, whose own date write must land after.
  const campaign = await airtable.getRecord(AIRTABLE.campaigns, id);
  const day = nextTouchAfterSubmit(campaign.fields[FIELD.nextTouch], now);
  if (day) {
    await airtable.updateRecord(AIRTABLE.campaigns, id, {
      [FIELD.nextTouch]: nextTouchValue(day),
    });
  }
  const next = day ? `Next touch ${shortDay(day)}.` : "Next touch unchanged.";
  // Then the files, so the Interaction exists when KB reads the comment.
  if (files.length) {
    try {
      await saveAttachments(airtable, id, files, now);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "followup_attachments_failed",
          id,
          error: String(err),
        }),
      );
      return reply(
        false,
        `${next} But the attachments did not save, so nothing was posted. Try again.`,
        502,
      );
    }
  }
  if (comment) {
    try {
      await airtable.createComment(AIRTABLE.campaigns, id, comment);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "followup_comment_failed",
          id,
          error: String(err),
        }),
      );
      return reply(
        false,
        files.length
          ? `${next} The attachments are saved on a new Interaction, but the comment did not post, so KB was not asked to read them. Post a comment asking it to.`
          : `${next} But the comment did not post. Try it again.`,
        502,
      );
    }
  }
  console.log(
    JSON.stringify({
      event: "followup_action",
      campaign: id,
      commented: Boolean(comment),
      attachments: files.length,
      by: session.email,
    }),
  );
  if (!wantsJson(request)) return redirect(`${TOOL_PATH}#c-${id}`, [], 303);
  const lead = files.length
    ? `${files.length === 1 ? "Attachment" : `${files.length} attachments`} saved. KB will log the Interaction and reply in the thread.`
    : !comment
      ? "Marked handled."
      : mentionsUser(comment, KB.id)
        ? "Comment posted. KB will reply in the thread."
        : "Comment posted.";
  return json({ ok: true, message: `${lead} ${next}` });
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
