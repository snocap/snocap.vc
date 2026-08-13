import { renderGatePage } from "./gate-page.ts";
import { derivePassword } from "./password.ts";
import { checkEmailOverride } from "./override.ts";
import { listFolder, streamFile } from "./drive.ts";
import {
  setCookie,
  signViewerCookie,
  verifiedEmail,
} from "../../shared/cookie.ts";
import {
  isValidEmail,
  normalizeEmail,
  refFromEmail,
} from "../../shared/email.ts";
import { handleViewerAdmin, logViewer } from "../../shared/viewers.ts";

interface Env {
  DB: D1Database;
  HMAC_SECRET: string;
  ADMIN_TOKEN: string;
  DEALROOM_PW_SECRET: string;
  DEALROOM_SA_KEY: string;
  DRIVE_ROOT_FOLDER_ID: string;
  // TEMPORARY per-email password overrides (see override.ts). The override lives
  // in the kernelbot-host Redis; the gate POSTs to the kernelbot-api endpoint at
  // OVERRIDE_API_BASE, authenticating with the DATAROOM_OVERRIDE_SECRET Worker
  // secret. Both are optional — absent until provisioned, in which case the gate
  // falls through to the derived code for everyone.
  OVERRIDE_API_BASE?: string;
  DATAROOM_OVERRIDE_SECRET?: string;
}

const COOKIE_NAME = "dataroom_viewer";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h — shorter-lived than deck's 30 days

function gateResponse(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
  });
}

async function handleApi(
  request: Request,
  env: Env,
  email: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/dataroom/api/")) return null;

  // Who is looking. The session cookie is HttpOnly, so the page cannot read
  // the email out of it the way the deck's tracker does — this is how
  // dataroom-tracker.js names the viewer to PostHog. Answered before the
  // Drive check below: it needs no Drive grant, and analytics should still
  // work while Drive is unconfigured.
  if (url.pathname === "/dataroom/api/viewer") {
    return Response.json(
      { email },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!env.DEALROOM_SA_KEY) {
    return Response.json(
      { error: "Drive integration not configured yet" },
      { status: 503 },
    );
  }

  try {
    if (url.pathname === "/dataroom/api/list") {
      const folderId =
        url.searchParams.get("folder") || env.DRIVE_ROOT_FOLDER_ID;
      const { folder, files } = await listFolder(env.DEALROOM_SA_KEY, folderId);
      return Response.json({
        folder,
        files,
        isRoot: folderId === env.DRIVE_ROOT_FOLDER_ID,
      });
    }

    if (url.pathname === "/dataroom/api/file") {
      const fileId = url.searchParams.get("id");
      if (!fileId)
        return Response.json({ error: "missing id" }, { status: 400 });
      return await streamFile(env.DEALROOM_SA_KEY, fileId);
    }
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }

  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // The room used to live at /dealroom. Links to the old path are already in
    // inboxes, so keep them working rather than 404ing an LP.
    if (url.pathname === "/dealroom" || url.pathname.startsWith("/dealroom/")) {
      const moved = new URL(url);
      moved.pathname = url.pathname.replace(/^\/dealroom/, "/dataroom");
      return Response.redirect(moved.toString(), 301);
    }

    const adminResponse = await handleViewerAdmin(request, {
      path: "/dataroom/admin",
      db: env.DB,
      adminToken: env.ADMIN_TOKEN,
      title: "Fund 2 Data Room Viewers",
    });
    if (adminResponse) return adminResponse;

    if (!url.pathname.startsWith("/dataroom")) {
      return fetch(request);
    }

    // POST: gate form submission
    if (request.method === "POST" && url.pathname === "/dataroom") {
      const formData = await request.formData();
      const returnTo = (formData.get("return_to") as string) || "/dataroom";
      const safeReturn = returnTo.startsWith("/dataroom")
        ? returnTo
        : "/dataroom";
      const refField = (formData.get("ref") as string) || "";

      const email = normalizeEmail(formData.get("email"));
      if (!isValidEmail(email)) {
        return gateResponse(
          renderGatePage(
            "Please enter a valid email address.",
            returnTo,
            refField,
          ),
          400,
        );
      }

      // The access code is keyed on the EMAIL alone — HMAC(email). `ref` comes
      // off the URL and is attribution only (who sent this person), never part
      // of the credential, so the link someone clicked can no longer decide
      // which code is valid. That was a real bug: a code minted for an LP's own
      // email was rejected on a `/dataroom?ref=<someone-else>` link that
      // expected a different HMAC(email|ref) code, and it looked unreproducible
      // because a request omitting `ref` fell back to the default and succeeded.
      // Keying on the email retires that whole class of failure. (A tradeoff
      // azoff signed off on in snocap/snocap.vc#11: every code previously issued
      // as HMAC(email|ref) is invalidated and must be re-handed-out.)
      const password = (formData.get("password") as string) || "";

      // TEMPORARY per-email override (see override.ts), checked BEFORE the
      // derived code. This POSTs to the kernelbot-api endpoint, which owns the
      // override store (kernelbot-host Redis). `null` means no override is set for
      // this email (or the endpoint is unavailable → fail-open), so we fall
      // through to the unchanged derived-code path. When an override IS set it is
      // authoritative — it SHADOWS the default for that email alone, so a mismatch
      // does not fall back to the derived code. Scoped to Philip Chow's diligence;
      // built to be ripped out cleanly once his deal closes.
      const override = await checkEmailOverride(env, email, password);

      // Check the secret before deriving: HMAC key import rejects an empty
      // key, so an unset secret would otherwise throw a 500 instead of
      // turning the visitor away.
      let matched: boolean;
      let reason: string;
      if (override !== null) {
        matched = override;
        reason = "override-mismatch";
      } else {
        matched = false;
        reason = !env.DEALROOM_PW_SECRET
          ? "secret-unset"
          : password
            ? "code-mismatch"
            : "code-missing";
        if (env.DEALROOM_PW_SECRET && password) {
          const expected = await derivePassword(email, env.DEALROOM_PW_SECRET);
          matched = password === expected;
        }
      }
      if (!matched) {
        // Only successful logins reach the viewers table, so a rejection left
        // no trace at all and "it won't let me in" was undiagnosable. Record
        // enough to tell a wrong code from a missing one — never the code.
        console.warn(
          JSON.stringify({
            event: "dataroom_gate_denied",
            email,
            submittedRef: refField || null,
            reason,
          }),
        );
        return gateResponse(
          renderGatePage("Invalid access code.", returnTo, refField),
          400,
        );
      }

      // The row keeps the ref the visitor ARRIVED with, which is what
      // attribution means — now cleanly separate from the credential.
      await logViewer(env.DB, {
        email,
        ref: refField || refFromEmail(email),
        request,
      });

      const headers = new Headers({ Location: safeReturn });
      headers.append(
        "Set-Cookie",
        setCookie({
          name: COOKIE_NAME,
          value: await signViewerCookie(email, env.HMAC_SECRET),
          path: "/dataroom",
          maxAge: COOKIE_MAX_AGE,
          httpOnly: true,
        }),
      );
      return new Response(null, { status: 302, headers });
    }

    // Cookie is the sole bypass past this point — no ref/password shortcut.
    const email = await verifiedEmail(
      request,
      COOKIE_NAME,
      env.HMAC_SECRET,
      COOKIE_MAX_AGE,
    );
    if (!email) {
      const refParam = url.searchParams.get("ref") || undefined;
      return gateResponse(
        renderGatePage(undefined, url.pathname, refParam),
        200,
      );
    }

    const apiResponse = await handleApi(request, env, email);
    if (apiResponse) return apiResponse;

    // Authenticated, non-API path — let origin serve the static folder-browser shell.
    return fetch(request);
  },
};
