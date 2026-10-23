// The signed-in user's session: their Airtable tokens, who they are, and the
// CSRF token every POST must echo. It lives only in an encrypted, HttpOnly,
// Secure, SameSite=Lax cookie scoped to the tool's path — there is no server-side
// store, and nothing the browser's scripts can read.

import { TOOL_PATH } from "./config.ts";
import type { Config } from "./config.ts";
import { refreshTokens } from "./oauth.ts";
import type { Tokens } from "./oauth.ts";
import { open, randomToken, seal } from "./seal.ts";
import { readCookie } from "../../shared/cookie.ts";
import { timingSafeEqual } from "../../shared/crypto.ts";

export const SESSION_COOKIE = "followup_session";
export const STATE_COOKIE = "followup_oauth";
const PURPOSE = "session";
/** Refresh this long before the access token's stated expiry, so a request that
 * starts just before it does not reach Airtable just after. */
const REFRESH_SKEW_MS = 60 * 1000;

export interface Session extends Tokens {
  email: string;
  userId: string;
  csrf: string;
  /** The seal's expiry: the refresh token's, past which nothing can renew it. */
  exp: number;
}

export function newSession(
  tokens: Tokens,
  user: { email: string; id: string },
): Session {
  return {
    ...tokens,
    email: user.email,
    userId: user.id,
    csrf: randomToken(24),
    exp: tokens.refreshExpiresAt,
  };
}

export async function readSession(
  request: Request,
  config: Config,
  now: number = Date.now(),
): Promise<Session | null> {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return null;
  return open<Session>(raw, config.sessionSecret, PURPOSE, now);
}

export async function sessionCookie(
  session: Session,
  config: Config,
  now: number = Date.now(),
): Promise<string> {
  const value = await seal(session, config.sessionSecret, PURPOSE);
  const maxAge = Math.max(0, Math.floor((session.exp - now) / 1000));
  return cookieHeader(SESSION_COOKIE, value, TOOL_PATH, maxAge);
}

export function cookieHeader(
  name: string,
  value: string,
  path: string,
  maxAge: number,
): string {
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name: string, path: string): string {
  return cookieHeader(name, "", path, 0);
}

/**
 * The session with a live access token: unchanged while the token has time
 * left, refreshed (both tokens rotate) once it has run out, and null when the
 * refresh is refused — the user signs in again. `refreshed` tells the caller to
 * re-set the cookie, since Airtable has already retired the old refresh token.
 */
export async function ensureFresh(
  session: Session,
  config: Config,
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<{ session: Session; refreshed: boolean } | null> {
  if (session.accessExpiresAt - REFRESH_SKEW_MS > now) {
    return { session, refreshed: false };
  }
  const tokens = await refreshTokens(
    session.refreshToken,
    config,
    fetchImpl,
    now,
  );
  if (!tokens) return null;
  return {
    session: { ...session, ...tokens, exp: tokens.refreshExpiresAt },
    refreshed: true,
  };
}

/**
 * A POST is accepted only with the session's CSRF token in its `csrf` field and,
 * when the browser names one, an Origin of this site. SameSite=Lax already keeps
 * the cookie off a cross-site POST; the token is the check that does not depend
 * on the browser getting that right.
 */
export function csrfOk(
  request: Request,
  session: Session,
  submitted: unknown,
  origin: string,
): boolean {
  const from = request.headers.get("Origin");
  if (from && from !== origin) return false;
  return (
    typeof submitted === "string" &&
    submitted.length > 0 &&
    timingSafeEqual(submitted, session.csrf)
  );
}
