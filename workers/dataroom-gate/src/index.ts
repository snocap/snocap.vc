import { renderGatePage } from "./gate-page.ts";
import { derivePassword } from "./password.ts";
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

      const ref = refField || refFromEmail(email);
      const password = (formData.get("password") as string) || "";
      // Check the secret before deriving: HMAC key import rejects an empty
      // key, so an unset secret would otherwise throw a 500 instead of
      // turning the visitor away.
      const expected = env.DEALROOM_PW_SECRET
        ? await derivePassword(email, ref, env.DEALROOM_PW_SECRET)
        : null;
      if (expected === null || password !== expected) {
        return gateResponse(
          renderGatePage("Invalid access code.", returnTo, refField),
          400,
        );
      }

      await logViewer(env.DB, { email, ref, request });

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
