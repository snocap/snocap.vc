import { renderFormPage } from "./form-page.ts";
import { renderGatePage } from "./gate-page.ts";
import {
  RESERVED_SLUGS,
  decodeRecord,
  emailAllowed,
  expirationTtl,
  isExpired,
  linkKey,
  normalizeSlug,
  parseExpiry,
  parseTargetUrl,
  slugError,
} from "./links.ts";
import type { LinkRecord } from "./links.ts";
import {
  setCookie,
  signViewerCookie,
  verifiedEmail,
} from "../../shared/cookie.ts";
import { timingSafeEqual } from "../../shared/crypto.ts";
import { isValidEmail, normalizeEmail } from "../../shared/email.ts";

interface Env {
  LINKS: KVNamespace;
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
  const host = hostname.toLowerCase();
  return host === "sno.llc" || host === "www.sno.llc";
}

async function handleRedirect(rawSlug: string, env: Env): Promise<Response> {
  const slug = normalizeSlug(rawSlug);
  if (slugError(slug)) return missResponse();

  const stored = await env.LINKS.get(linkKey(slug));
  const record = decodeRecord(stored);
  if (stored && !record) {
    console.error("link: unreadable record, treating as a miss:", slug);
  }
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
  const now = Date.now();

  const reject = (error: string, status: number): Response =>
    htmlResponse(
      renderFormPage({
        email,
        error,
        values: { url: rawUrl, pathname: slug, expires: rawExpires },
      }),
      status,
    );

  const badSlug = slugError(slug);
  if (badSlug) return reject(badSlug, 400);

  const target = parseTargetUrl(rawUrl);
  if ("error" in target) return reject(target.error, 400);

  const expiry = parseExpiry(rawExpires, now);
  if ("error" in expiry) return reject(expiry.error, 400);

  // A live slug is never repointed, only refused: the old link is already in
  // circulation and its 301 may sit in caches we cannot reach. An EXPIRED slug
  // is free to claim again. (Check-then-set is not atomic in KV, so two
  // simultaneous creates of one slug resolve last-writer-wins — acceptable for
  // a tool with a handful of users behind a shared code.)
  const existing = decodeRecord(await env.LINKS.get(linkKey(slug)));
  if (existing && !isExpired(existing, now)) {
    return reject(`/link/${slug} is already taken — pick another path.`, 409);
  }

  const record: LinkRecord = {
    url: target.url,
    expiresAt: expiry.expiresAt,
    createdAt: now,
    createdBy: email,
  };
  const ttl = expirationTtl(expiry.expiresAt, now);
  await env.LINKS.put(
    linkKey(slug),
    JSON.stringify(record),
    ttl === undefined ? {} : { expirationTtl: ttl },
  );

  // The slug and its author, never the destination: a short link often exists
  // precisely because the URL behind it is not public.
  console.log(
    JSON.stringify({
      event: "link_created",
      slug,
      createdBy: email,
      expiresAt: expiry.expiresAt,
    }),
  );

  // Redirect rather than render, so a refresh does not resubmit the form.
  return redirectTo(`${TOOL_PATH}?created=${encodeURIComponent(slug)}`);
}

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

    // /link/<slug> resolves a link, unless the tail is one of the tool's own
    // reserved paths, which fall through to the UI routing below.
    const tail = normalizeSlug(url.pathname.slice(TOOL_PATH.length));
    if (tail && !RESERVED_SLUGS.has(tail)) {
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
