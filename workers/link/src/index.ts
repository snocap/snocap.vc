import { renderFormPage } from "./form-page.ts";
import { renderGatePage } from "./gate-page.ts";
import {
  RESERVED_SLUGS,
  emailAllowed,
  isExpired,
  normalizeSlug,
  parseExpiry,
  parseTargetUrl,
  shortUrlFor,
  slugError,
} from "./links.ts";
import type { LinkRecord } from "./links.ts";
import { createLink, readLink } from "./store.ts";
import {
  setCookie,
  signViewerCookie,
  verifiedEmail,
} from "../../shared/cookie.ts";
import { timingSafeEqual } from "../../shared/crypto.ts";
import { isValidEmail, normalizeEmail } from "../../shared/email.ts";
import { renderQrPng } from "../../shared/qr-png.ts";

interface Env {
  /** kernelbot-api origin the store passes through to. Optional — the store
   * defaults to https://api.sno.llc. */
  LINK_API_BASE?: string;
  /** Shared secret the store sends as x-link-secret. Distinct from the gates'
   * secrets; provisioned as a Worker secret. */
  LINK_API_SECRET: string;
  /** Signs the admin session cookie. MUST NOT be the value either gate worker
   * uses: an identical secret would let anyone holding a deck or data room
   * cookie re-label it `link_admin` and forge a session here. */
  LINK_SESSION_SECRET: string;
  LINK_ADMIN_PASSWORD: string;
  LINK_ALLOWED_EMAIL_DOMAINS: string;
}

const COOKIE_NAME = "link_admin";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12h — a tool session, not a reading session
const HOME = "https://snocap.vc/";
const TOOL_PATH = "/link";
const SHORT_PREFIX = "/r";
const QR_PREFIX = `${TOOL_PATH}/qr`;
const QR_SUFFIX = ".png";
/** Pixels per QR module. 8 keeps a ~300px image: big enough to paste into a doc
 * at full size, small enough to embed without thinking about it. */
const QR_SCALE = 8;

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
  });
}

/**
 * The single answer to every miss. Unknown and expired are deliberately
 * indistinguishable, so a probe cannot learn whether a slug ever existed, and
 * neither is a 404 — a dead short link should land on the site. Always 302: a
 * slug that misses today may be created tomorrow, so nothing here is permanent.
 */
function missResponse(): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: HOME, "Cache-Control": "no-store" },
  });
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

/** True for the short domain, which carries redirects only and no tool UI. */
function isShortHost(hostname: string): boolean {
  return hostname.toLowerCase() === "sno.llc";
}

async function handleRedirect(rawSlug: string, env: Env): Promise<Response> {
  const slug = normalizeSlug(rawSlug);
  if (slugError(slug)) return missResponse();

  // readLink returns null for every failure — unknown, expired, unreadable, and
  // crucially an unreachable / slow / 5xx api — so all of them fold into the one
  // uniform miss. isExpired stays as a defense-in-depth guard on the returned
  // record even though the api already drops expired ones server-side.
  const record = await readLink(env, slug);
  if (!record || isExpired(record, Date.now())) return missResponse();

  // Permanent only when nothing can ever retire the link. An expiring link must
  // never be cached past its date, which is the whole reason for the split.
  const permanent = record.expiresAt === null;
  return new Response(null, {
    status: permanent ? 301 : 302,
    headers: {
      Location: record.url,
      // A 301 with no explicit lifetime is cached by browsers indefinitely,
      // which would make a mistyped destination unfixable for those visitors.
      // An hour keeps the permanent semantics and still lets a correction land.
      "Cache-Control": permanent ? "public, max-age=3600" : "no-store",
    },
  });
}

/**
 * GET /link/qr/<slug>.png — the slug's short URL, as a QR code image at a URL
 * durable enough to paste into an `<img src>` anywhere and to right-click → Copy
 * Image out of the page.
 *
 * DELIBERATELY UNAUTHENTICATED, and that is the endpoint's whole reason to exist
 * rather than an oversight: an `<img>` in a Google Doc, an email, or a Slack
 * unfurl carries no session cookie, so a gated image would render as a broken one
 * in every place it is useful. It discloses nothing — the only thing it can ever
 * encode is `https://snocap.vc/link/<slug>`, a URL on our own domain that whoever
 * has the image already holds, and it never reads the store, so it cannot even
 * confirm whether a slug exists.
 *
 * Which is also why an unknown slug still gets an image: the QR encodes a URL,
 * and whether that URL resolves is the redirect path's business. A slug that
 * cannot be a slug at all is the one refusal, and it gets the uniform miss.
 */
function handleQrImage(request: Request, name: string): Response {
  // Wrong method falls through to the same miss as any other unmatched request.
  if (request.method !== "GET") return missResponse();
  if (!name.toLowerCase().endsWith(QR_SUFFIX)) return missResponse();

  let decoded: string;
  try {
    decoded = decodeURIComponent(name.slice(0, -QR_SUFFIX.length));
  } catch {
    return missResponse(); // a malformed percent-escape is not a slug
  }
  const slug = normalizeSlug(decoded);
  if (slugError(slug)) return missResponse();

  return new Response(renderQrPng(shortUrlFor(slug), { scale: QR_SCALE }), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // The bytes are a pure function of the slug, so they can never go stale:
      // a year is the longest lifetime caches honour, and immutable stops a
      // reload from revalidating one that is already on disk.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

async function handleSignIn(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const email = normalizeEmail(form.get("email"));
  if (!isValidEmail(email)) {
    return htmlResponse(
      renderGatePage("Please enter a valid email address."),
      400,
    );
  }

  const password =
    typeof form.get("password") === "string"
      ? (form.get("password") as string)
      : "";
  // Check the secret is set BEFORE comparing, so an unconfigured worker locks
  // everyone out instead of matching an empty submission.
  const codeMatches =
    Boolean(env.LINK_ADMIN_PASSWORD) &&
    password.length > 0 &&
    timingSafeEqual(password, env.LINK_ADMIN_PASSWORD);
  const domainAllowed = emailAllowed(email, env.LINK_ALLOWED_EMAIL_DOMAINS);

  if (!codeMatches || !domainAllowed) {
    console.warn(
      JSON.stringify({
        event: "link_gate_denied",
        email,
        reason: !env.LINK_ADMIN_PASSWORD
          ? "secret-unset"
          : !codeMatches
            ? password
              ? "code-mismatch"
              : "code-missing"
            : "domain-not-allowed",
      }),
    );
    // One message for every rejection, so the form cannot be used to discover
    // which addresses are allowed.
    return htmlResponse(renderGatePage("Invalid access code."), 400);
  }

  const headers = new Headers({
    Location: TOOL_PATH,
    "Cache-Control": "no-store",
  });
  headers.append(
    "Set-Cookie",
    setCookie({
      name: COOKIE_NAME,
      value: await signViewerCookie(email, env.LINK_SESSION_SECRET),
      path: TOOL_PATH,
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
    }),
  );
  return new Response(null, { status: 302, headers });
}

async function handleCreate(
  request: Request,
  env: Env,
  email: string,
): Promise<Response> {
  const form = await request.formData();
  const rawUrl = String(form.get("url") ?? "");
  const rawExpires = String(form.get("expires") ?? "");
  const slug = normalizeSlug(form.get("pathname"));
  // The checkbox. Its presence in the body is the confirmation — a browser omits
  // an unticked box entirely — and it is re-checked HERE rather than trusted from
  // the page: the live lookup that revealed it is a convenience, not the gate.
  const replace = form.get("replace") !== null;
  const now = Date.now();

  const reject = (error: string, status: number, taken?: boolean): Response =>
    htmlResponse(
      renderFormPage({
        email,
        error,
        values: { url: rawUrl, pathname: slug, expires: rawExpires, replace },
        // Keeps the replace box on screen (and ticked, if it was) after a
        // rejection, so the fix is one click and not a retype.
        taken,
      }),
      status,
    );

  const badSlug = slugError(slug);
  if (badSlug) return reject(badSlug, 400);

  const target = parseTargetUrl(rawUrl);
  if ("error" in target) return reject(target.error, 400);

  const expiry = parseExpiry(rawExpires, now);
  if ("error" in expiry) return reject(expiry.error, 400);

  const record: LinkRecord = {
    url: target.url,
    expiresAt: expiry.expiresAt,
    createdAt: now,
    createdBy: email,
  };

  // A live slug is repointed ONLY on an explicit confirmation. The default is
  // still refuse-don't-repoint: the old link is already in circulation and a
  // permanent one's 301 sits in browser caches for up to an hour (see
  // handleRedirect's max-age), so a silent repoint would strand visitors on a
  // destination nobody chose. An EXPIRED slug is free to claim with no ceremony.
  // The api owns the check-then-set atomically against Redis, answering 409 when a
  // live record holds the slug and the confirmation is absent.
  const stored = await createLink(env, slug, record, { replace });
  if (stored.status === "conflict") {
    // Name the destination being replaced — a confirmation that does not say what
    // it is overwriting is not one. The api sends the live record with its 409;
    // if it could not, the refusal still stands, just less specific.
    const pointsAt = stored.record
      ? ` It currently points at ${stored.record.url}.`
      : "";
    return reject(
      `/link/${slug} is already taken.${pointsAt} Tick "replace the existing link" to repoint it, ` +
        "or pick another path.",
      409,
      true,
    );
  }
  if (stored.status === "error") {
    // The create path has no safe silent fallback: refusing loudly is better
    // than dropping the link on the floor. Tell the admin to retry.
    return reject(
      "The link store is unavailable right now — try again in a moment.",
      502,
    );
  }

  // The slug and its author, never the destination: a short link often exists
  // precisely because the URL behind it is not public. That a live link was
  // repointed is logged as a flag for the same reason.
  console.log(
    JSON.stringify({
      event: stored.replaced ? "link_replaced" : "link_created",
      slug,
      createdBy: email,
      expiresAt: expiry.expiresAt,
    }),
  );

  // Redirect rather than render, so a refresh does not resubmit the form.
  return redirectTo(`${TOOL_PATH}?created=${encodeURIComponent(slug)}`);
}

/**
 * GET /link/peek?slug=<slug> — is this short path free? The form calls it as the
 * admin types, so the "already taken" answer arrives BEFORE the submission rather
 * than as a rejected form, and the replace confirmation can name what it would
 * overwrite.
 *
 * Authenticated: it is reached only after the session check below, because it
 * answers a question the uniform public miss deliberately refuses to
 * (handleRedirect makes unknown and expired indistinguishable so a probe learns
 * nothing). A signed-in admin may already create and replace links, so telling
 * them what a slug holds reveals nothing they cannot already reach.
 *
 * A malformed slug is `{ taken: false }` with the reason, not an error: the field
 * is mid-typing on every keystroke, and half a slug is not a failure.
 */
async function handlePeek(url: URL, env: Env): Promise<Response> {
  const slug = normalizeSlug(url.searchParams.get("slug"));
  const invalid = slugError(slug);
  if (invalid)
    return Response.json({ taken: false, invalid }, { headers: NO_STORE });
  const record = await readLink(env, slug);
  if (!record || isExpired(record, Date.now())) {
    return Response.json({ taken: false, slug }, { headers: NO_STORE });
  }
  return Response.json(
    {
      taken: true,
      slug,
      url: record.url,
      createdBy: record.createdBy,
      expiresAt: record.expiresAt,
    },
    { headers: NO_STORE },
  );
}

const NO_STORE = { "Cache-Control": "no-store" };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // sno.llc/r/<slug> — the short domain resolves links and nothing else.
    if (isShortHost(url.hostname)) {
      if (
        url.pathname === SHORT_PREFIX ||
        url.pathname.startsWith(`${SHORT_PREFIX}/`)
      ) {
        return handleRedirect(url.pathname.slice(SHORT_PREFIX.length), env);
      }
      return fetch(request);
    }

    const onToolPath =
      url.pathname === TOOL_PATH || url.pathname.startsWith(`${TOOL_PATH}/`);
    if (!onToolPath) return fetch(request);

    // The QR image sits above the resolve branch because its path has two
    // segments (`qr/<slug>.png`) where a slug has exactly one, so the resolve
    // branch below would only ever see it as an invalid slug and miss. Above the
    // session check too — see handleQrImage on why it is unauthenticated.
    if (
      url.pathname === QR_PREFIX ||
      url.pathname.startsWith(`${QR_PREFIX}/`)
    ) {
      return handleQrImage(request, url.pathname.slice(QR_PREFIX.length + 1));
    }

    // /link/<slug> resolves a link, unless the tail STARTS with one of the tool's
    // own reserved paths, which fall through to the UI routing below. The check is
    // on the first segment, not the whole tail, now that a slug may nest: without
    // that, /link/create/anything would be read as a slug rather than as the
    // tool's own path.
    const tail = normalizeSlug(url.pathname.slice(TOOL_PATH.length));
    if (tail && !RESERVED_SLUGS.has(tail.split("/")[0])) {
      return handleRedirect(tail, env);
    }

    // Sign-in is the one unauthenticated POST.
    if (request.method === "POST" && url.pathname === TOOL_PATH) {
      return handleSignIn(request, env);
    }

    const isToolRoot =
      url.pathname === TOOL_PATH || url.pathname === `${TOOL_PATH}/`;
    const email = await verifiedEmail(
      request,
      COOKIE_NAME,
      env.LINK_SESSION_SECRET,
      COOKIE_MAX_AGE,
    );

    if (!email) {
      // The gate, never the form. Any other unauthenticated path under /link
      // gets the same miss as an unknown slug and reveals nothing.
      if (request.method === "GET" && isToolRoot) {
        return htmlResponse(renderGatePage(), 200);
      }
      if (url.pathname === `${TOOL_PATH}/create`) {
        return htmlResponse(
          renderGatePage("Your session expired — sign in again."),
          401,
        );
      }
      return missResponse();
    }

    // Behind the session check, above the form: the answer is for a signed-in
    // admin only.
    if (request.method === "GET" && url.pathname === `${TOOL_PATH}/peek`) {
      return handlePeek(url, env);
    }

    if (request.method === "GET" && isToolRoot) {
      const created = normalizeSlug(url.searchParams.get("created"));
      return htmlResponse(
        renderFormPage({
          email,
          created: created && !slugError(created) ? created : undefined,
        }),
        200,
      );
    }

    // The session cookie is SameSite=Lax, so a cross-site POST arrives without
    // it and this endpoint is unreachable from another origin.
    if (request.method === "POST" && url.pathname === `${TOOL_PATH}/create`) {
      return handleCreate(request, env, email);
    }

    return missResponse();
  },
};
