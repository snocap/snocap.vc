// The "Make suggestion" chip's two routes. The page never talks to KB itself:
// the Worker checks the session and CSRF token, then proxies to KB's suggest
// API with the shared secret, naming the signed-in Airtable user as the
// requester. KB queues a read-only job that drafts the comment Jon would most
// likely write on this card; the page polls until it is done. Nothing here
// posts or writes to Airtable.

import { ORIGIN, RECORD_ID, SUGGEST_API } from "./config.ts";
import { csrfOk } from "./session.ts";
import type { Session } from "./session.ts";

/** What the page reads back. `id` answers a start; `status` a poll. */
export type SuggestBody =
  | { ok: true; id: string }
  | { ok: true; status: "pending" }
  | { ok: true; status: "done"; text: string }
  | { ok: false; message: string };

export interface SuggestOutcome {
  status: number;
  body: SuggestBody;
}

/** KB's job ids: a tag prefix and a short hex hash. Checked before the id is
 * put in a URL. */
const JOB_ID = /^[a-z0-9][a-z0-9-]{0,80}$/;

const STALE: SuggestOutcome = {
  status: 403,
  body: { ok: false, message: "This page is stale. Reload it and try again." },
};

const refused = (status: number, message: string): SuggestOutcome => ({
  status,
  body: { ok: false, message },
});

function logFailure(step: string, detail: Record<string, unknown>): void {
  console.error(
    JSON.stringify({ event: "followup_suggest_failed", step, ...detail }),
  );
}

/** POST …/suggest {csrf, campaign}: asks KB for a suggestion, answers its id. */
export async function startSuggestion(
  request: Request,
  session: Session,
  secret: string,
): Promise<SuggestOutcome> {
  const form = await request.formData();
  if (!csrfOk(request, session, form.get("csrf"), ORIGIN)) return STALE;
  const campaign = String(form.get("campaign") ?? "");
  if (!RECORD_ID.test(campaign)) return refused(400, "Unknown Campaign.");
  if (!session.email) {
    return refused(
      400,
      "Your Airtable account shows no email, so KB cannot tell who asked.",
    );
  }
  let response: Response;
  try {
    response = await fetch(SUGGEST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-followup-secret": secret,
      },
      body: JSON.stringify({ campaign, requester: session.email }),
    });
  } catch (err) {
    logFailure("start", { campaign, error: String(err) });
    return refused(502, "KB did not answer. Try again.");
  }
  const body = (await response.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (response.status !== 202 || !JOB_ID.test(id)) {
    logFailure("start", { campaign, status: response.status });
    return refused(
      502,
      `KB could not start a suggestion (${response.status}). Try again.`,
    );
  }
  console.log(
    JSON.stringify({
      event: "followup_suggest",
      campaign,
      id,
      by: session.email,
    }),
  );
  return { status: 202, body: { ok: true, id } };
}

/** GET …/suggest/<id> (CSRF token in X-CSRF-Token): where that suggestion is. */
export async function pollSuggestion(
  request: Request,
  session: Session,
  secret: string,
  id: string,
): Promise<SuggestOutcome> {
  if (!csrfOk(request, session, request.headers.get("X-CSRF-Token"), ORIGIN)) {
    return STALE;
  }
  if (!JOB_ID.test(id)) return refused(404, "Unknown suggestion.");
  let response: Response;
  try {
    response = await fetch(`${SUGGEST_API}/${id}`, {
      headers: { "x-followup-secret": secret },
    });
  } catch (err) {
    logFailure("poll", { id, error: String(err) });
    return refused(502, "KB did not answer. Try again.");
  }
  if (response.status === 404) {
    return refused(404, "KB lost that suggestion. Ask for a new one.");
  }
  const body = (await response.json().catch(() => null)) as {
    status?: unknown;
    text?: unknown;
    error?: unknown;
  } | null;
  if (!response.ok || !body) {
    logFailure("poll", { id, status: response.status });
    return refused(502, `KB did not answer as expected (${response.status}).`);
  }
  if (body.status === "done" && typeof body.text === "string" && body.text) {
    return { status: 200, body: { ok: true, status: "done", text: body.text } };
  }
  if (body.status === "error") {
    // A failed job's reason can be a long worker message; the card shows a line.
    const said =
      typeof body.error === "string" ? body.error.trim().slice(0, 200) : "";
    logFailure("job", { id, error: said });
    return refused(
      200,
      `KB could not make a suggestion${said ? `: ${said}` : "."}`,
    );
  }
  return { status: 200, body: { ok: true, status: "pending" } };
}
