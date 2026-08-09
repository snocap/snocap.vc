// The signed viewer cookie, shared by both gates.
//
// Value format: base64(email) + "." + issuedAt + "." + hex(HMAC-SHA256(secret,
// "email|issuedAt")). The email is readable by the browser on purpose —
// public/deck/deck-tracker.js reads it to identify the viewer in PostHog, and
// it slices to the FIRST dot, so the timestamp segment does not disturb it —
// and the HMAC is what makes it unforgeable. Cookie name, Path, lifetime and
// HttpOnly are per-worker; see each worker's index.ts.
//
// `issuedAt` (epoch seconds) is inside the signed message, not merely alongside
// it, so it cannot be swapped for a later one without invalidating the HMAC.
// Without it the cookie was valid forever: Max-Age only asks the BROWSER to
// forget the cookie, and a copied value replayed past that date still verified.
// verifiedEmail() now enforces the same lifetime server-side, which is what
// bounds a stolen session.

import { hmacHex, verifyHmacHex } from "./crypto.ts";

// A cookie stamped in the future would outlive its window, so it is refused.
// Small allowance for clock skew between the signing and verifying edge nodes.
const FUTURE_SKEW_SECONDS = 60;

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// The message the HMAC covers. Binds the identity to the moment it was issued.
function signedPayload(email: string, issuedAt: number): string {
  return `${email}|${issuedAt}`;
}

export function encodeViewerCookie(
  email: string,
  issuedAt: number,
  hmac: string,
): string {
  return `${btoa(email)}.${issuedAt}.${hmac}`;
}

// Returns null for anything not in the current three-segment format. That
// includes the old two-segment cookies, which carry no issue time and so cannot
// be aged out — treating them as valid would leave exactly the unbounded
// sessions this format exists to end. Everyone re-authenticates once.
export function decodeViewerCookie(
  value: string,
): { email: string; issuedAt: number; hmac: string } | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [encodedEmail, rawIssuedAt, hmac] = parts;
  if (!encodedEmail || !rawIssuedAt || !hmac) return null;
  if (!/^\d+$/.test(rawIssuedAt)) return null;
  const issuedAt = Number(rawIssuedAt);
  if (!Number.isSafeInteger(issuedAt)) return null;
  try {
    const email = atob(encodedEmail);
    if (!email) return null;
    return { email, issuedAt, hmac };
  } catch {
    return null;
  }
}

export async function signViewerCookie(
  email: string,
  secret: string,
  issuedAt: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const hmac = await hmacHex(signedPayload(email, issuedAt), secret);
  return encodeViewerCookie(email, issuedAt, hmac);
}

// Returns the email from a present, well-formed, correctly signed, unexpired
// cookie, and null for every other case — missing, malformed, legacy-format,
// bad signature, older than maxAgeSeconds, or stamped in the future.
//
// maxAgeSeconds should be the same value the worker passes to setCookie, so the
// server-side lifetime and the browser-side Max-Age agree.
export async function verifiedEmail(
  request: Request,
  cookieName: string,
  secret: string,
  maxAgeSeconds: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string | null> {
  const raw = readCookie(request, cookieName);
  if (!raw) return null;
  const parsed = decodeViewerCookie(raw);
  if (!parsed) return null;

  const age = nowSeconds - parsed.issuedAt;
  if (age > maxAgeSeconds) return null;
  if (age < -FUTURE_SKEW_SECONDS) return null;

  return (await verifyHmacHex(
    signedPayload(parsed.email, parsed.issuedAt),
    parsed.hmac,
    secret,
  ))
    ? parsed.email
    : null;
}

export interface CookieOptions {
  name: string;
  value: string;
  path: string;
  maxAge: number;
  httpOnly?: boolean;
}

export function setCookie({
  name,
  value,
  path,
  maxAge,
  httpOnly = false,
}: CookieOptions): string {
  const attrs = `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; Secure; SameSite=Lax`;
  return httpOnly ? `${attrs}; HttpOnly` : attrs;
}
