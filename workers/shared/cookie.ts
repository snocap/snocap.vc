// The signed viewer cookie, shared by both gates.
//
// Value format: base64(email) + "." + hex(HMAC-SHA256(secret, email)). The
// email is readable by the browser on purpose — public/deck/deck-tracker.js
// reads it to identify the viewer in PostHog — and the HMAC is what makes it
// unforgeable. Cookie name, Path, lifetime and HttpOnly are per-worker; see
// each worker's index.ts.

import { hmacHex, verifyHmacHex } from "./crypto.ts";

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function encodeViewerCookie(email: string, hmac: string): string {
  return btoa(email) + "." + hmac;
}

export function decodeViewerCookie(
  value: string,
): { email: string; hmac: string } | null {
  const dot = value.indexOf(".");
  if (dot === -1) return null;
  try {
    const email = atob(value.slice(0, dot));
    const hmac = value.slice(dot + 1);
    if (!email || !hmac) return null;
    return { email, hmac };
  } catch {
    return null;
  }
}

export async function signViewerCookie(
  email: string,
  secret: string,
): Promise<string> {
  return encodeViewerCookie(email, await hmacHex(email, secret));
}

// Returns the email from a present, well-formed, correctly signed cookie, and
// null for every other case — missing, malformed, or a bad signature.
export async function verifiedEmail(
  request: Request,
  cookieName: string,
  secret: string,
): Promise<string | null> {
  const raw = readCookie(request, cookieName);
  if (!raw) return null;
  const parsed = decodeViewerCookie(raw);
  if (!parsed) return null;
  return (await verifyHmacHex(parsed.email, parsed.hmac, secret))
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
