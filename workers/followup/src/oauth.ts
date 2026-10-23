// Airtable OAuth 2.0: authorization code with PKCE, as a confidential client.
// https://airtable.com/developers/web/api/oauth-reference
//
// The round trip: /oauth/start seals a fresh state + code verifier into a
// ten-minute cookie and redirects to Airtable with the S256 challenge; Airtable
// sends the user back to /oauth/callback with the code and the state, which must
// match the cookie's; the code is exchanged (with the verifier and the client
// secret) for an access token (an hour) and a refresh token (single-use, about
// sixty days). Refresh rotates both.

import { REDIRECT_URI, SCOPES } from "./config.ts";
import type { Config } from "./config.ts";
import { base64url, open, randomToken, seal } from "./seal.ts";
import { timingSafeEqual } from "../../shared/crypto.ts";

export const AUTHORIZE_URL = "https://airtable.com/oauth2/v1/authorize";
export const TOKEN_URL = "https://airtable.com/oauth2/v1/token";

const STATE_PURPOSE = "oauth-state";
export const STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthState {
  state: string;
  verifier: string;
  exp: number;
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(new Uint8Array(digest));
}

/** A new state + verifier, the sealed cookie value that remembers them, and the
 * Airtable URL to send the browser to. */
export async function beginAuthorization(
  config: Config,
  now: number = Date.now(),
): Promise<{ cookieValue: string; location: string }> {
  // 32 random bytes → a 43-character verifier, inside RFC 7636's 43..128.
  const pending: OAuthState = {
    state: randomToken(16),
    verifier: randomToken(32),
    exp: now + STATE_TTL_MS,
  };
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", pending.state);
  url.searchParams.set("code_challenge", await codeChallenge(pending.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  return {
    cookieValue: await seal(pending, config.sessionSecret, STATE_PURPOSE),
    location: url.toString(),
  };
}

/** The verifier for this callback, or null when the cookie is missing, expired
 * or forged, or its state is not the one Airtable sent back. */
export async function verifierFor(
  cookieValue: string | null,
  returnedState: string | null,
  config: Config,
  now: number = Date.now(),
): Promise<string | null> {
  if (!cookieValue || !returnedState) return null;
  const pending = await open<OAuthState>(
    cookieValue,
    config.sessionSecret,
    STATE_PURPOSE,
    now,
  );
  if (!pending) return null;
  return timingSafeEqual(pending.state, returnedState)
    ? pending.verifier
    : null;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms the access token stops working. */
  accessExpiresAt: number;
  /** Epoch ms the refresh token stops working — the session's hard end. */
  refreshExpiresAt: number;
}

/** Airtable documents 60 days; used only if a response leaves it out. */
const DEFAULT_REFRESH_SECONDS = 60 * 24 * 60 * 60;

async function tokenRequest(
  body: URLSearchParams,
  config: Config,
  fetchImpl: typeof fetch,
  now: number,
): Promise<Tokens | null> {
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
    },
    body,
  });
  if (!response.ok) {
    console.warn(
      JSON.stringify({
        event: "followup_token_error",
        grant: body.get("grant_type"),
        status: response.status,
        body: (await response.text()).slice(0, 300),
      }),
    );
    return null;
  }
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
  };
  if (!json.access_token || !json.refresh_token) return null;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    accessExpiresAt: now + (json.expires_in ?? 3600) * 1000,
    refreshExpiresAt:
      now + (json.refresh_expires_in ?? DEFAULT_REFRESH_SECONDS) * 1000,
  };
}

export function exchangeCode(
  code: string,
  verifier: string,
  config: Config,
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<Tokens | null> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URI,
      client_id: config.clientId,
    }),
    config,
    fetchImpl,
    now,
  );
}

export function refreshTokens(
  refreshToken: string,
  config: Config,
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<Tokens | null> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
    }),
    config,
    fetchImpl,
    now,
  );
}
