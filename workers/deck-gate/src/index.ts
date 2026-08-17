import { renderGatePage, renderSuccessPage } from "./gate-page.ts";
import {
  readCookie,
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
  POSTHOG_API_KEY: string;
  DECK_PASSWORD: string;
}

const COOKIE_NAME = "snocap_viewer";
const REF_COOKIE_NAME = "snocap_ref";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Assigns a unique ref derived from the email alias. If the base ref is
// already owned by a different email in D1, appends 3 bytes of random hex
// so each viewer gets a stable, collision-free identifier.
async function assignRef(
  email: string,
  base: string,
  db: D1Database,
): Promise<string> {
  const existing = await db
    .prepare("SELECT email FROM viewers WHERE ref = ? LIMIT 1")
    .bind(base)
    .first<{ email: string }>();
  if (!existing || existing.email === email) return base;
  const entropy = [...crypto.getRandomValues(new Uint8Array(3))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${base}-${entropy}`;
}

function makeRefCookie(value: string): string {
  return setCookie({
    name: REF_COOKIE_NAME,
    value,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const adminResponse = await handleViewerAdmin(request, {
      path: "/deck/admin",
      db: env.DB,
      adminToken: env.ADMIN_TOKEN,
      title: "Deck Viewers",
    });
    if (adminResponse) return adminResponse;

    if (!url.pathname.startsWith("/deck")) {
      return fetch(request);
    }

    // POST: form submission
    if (request.method === "POST" && url.pathname === "/deck") {
      const formData = await request.formData();
      const returnTo = (formData.get("return_to") as string) || "/deck";
      const refField = (formData.get("ref") as string) || null;
      const refCookie = readCookie(request, REF_COOKIE_NAME);
      const safeReturn = returnTo.startsWith("/deck") ? returnTo : "/deck";

      const effectiveRef = refField || refCookie || null;
      const requirePassword = !effectiveRef;

      const email = normalizeEmail(formData.get("email"));

      if (!isValidEmail(email)) {
        return htmlResponse(
          renderGatePage(
            "Please enter a valid email address.",
            returnTo,
            refField || undefined,
            requirePassword,
          ),
          400,
        );
      }

      // Validate password when no ref is present
      const password = (formData.get("password") as string) || "";
      if (requirePassword) {
        if (!env.DECK_PASSWORD || password !== env.DECK_PASSWORD) {
          return htmlResponse(
            renderGatePage(
              "Invalid access code.",
              returnTo,
              refField || undefined,
              true,
            ),
            400,
          );
        }
      }

      // Determine ref: explicit/cookie ref takes precedence; otherwise derive
      // from email alias with a D1 conflict check to ensure uniqueness.
      const ref =
        effectiveRef ?? (await assignRef(email, refFromEmail(email), env.DB));

      await logViewer(env.DB, { email, ref, request });

      const headers = new Headers({
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      });
      headers.append(
        "Set-Cookie",
        setCookie({
          name: COOKIE_NAME,
          value: await signViewerCookie(email, env.HMAC_SECRET),
          path: "/",
          maxAge: COOKIE_MAX_AGE,
        }),
      );
      headers.append("Set-Cookie", makeRefCookie(ref));
      const continueUrl = new URL(safeReturn, url).toString();
      return new Response(renderSuccessPage(continueUrl), {
        status: 200,
        headers,
      });
    }

    // GET: email cookie is the only bypass
    const email = await verifiedEmail(
      request,
      COOKIE_NAME,
      env.HMAC_SECRET,
      COOKIE_MAX_AGE,
    );
    if (email) {
      const refCookie = readCookie(request, REF_COOKIE_NAME);
      const ref = refCookie || refFromEmail(email);

      // On the main deck page, ensure ref is in the URL so shared links carry it
      const isDeckRoot = url.pathname === "/deck" || url.pathname === "/deck/";
      if (isDeckRoot && !url.searchParams.has("ref")) {
        const redirectUrl = new URL(request.url);
        redirectUrl.searchParams.set("ref", ref);
        const headers = new Headers({ Location: redirectUrl.toString() });
        if (!refCookie) headers.append("Set-Cookie", makeRefCookie(ref));
        return new Response(null, { status: 302, headers });
      }

      if (refCookie) {
        return fetch(request);
      }
      // Email cookie set but no ref cookie — derive ref from email and set it
      const upstream = await fetch(request);
      const headers = new Headers(upstream.headers);
      headers.append("Set-Cookie", makeRefCookie(ref));
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }

    // No valid email cookie: show gate
    // Ref param or ref cookie removes password requirement
    const refParam = url.searchParams.get("ref") || undefined;
    const refCookie = readCookie(request, REF_COOKIE_NAME);
    const requirePassword = !refParam && !refCookie;

    const gateHtml = renderGatePage(
      undefined,
      url.pathname,
      refParam,
      requirePassword,
    );
    const headers = new Headers({
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
    });
    // Persist ref param as cookie for future visits to this gate
    if (refParam && !refCookie) {
      headers.append("Set-Cookie", makeRefCookie(refParam));
    }
    return new Response(gateHtml, { status: 200, headers });
  },
};
