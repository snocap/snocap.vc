// The OAuth round trip's own guarantees: the S256 challenge matches the verifier
// it was made from, the state cookie gives the verifier back only for the state
// it was issued with, and the token calls authenticate as a confidential client.
import assert from "node:assert/strict";
import { test } from "node:test";
import { REDIRECT_URI, SCOPES } from "./config.ts";
import type { Config } from "./config.ts";
import {
  AUTHORIZE_URL,
  STATE_TTL_MS,
  TOKEN_URL,
  beginAuthorization,
  codeChallenge,
  exchangeCode,
  refreshTokens,
  verifierFor,
} from "./oauth.ts";

const CONFIG: Config = {
  clientId: "client-123",
  clientSecret: "shh-secret",
  sessionSecret: "session-secret",
};

test("codeChallenge is RFC 7636's S256 of the verifier", async () => {
  // The worked example from RFC 7636 appendix B.
  assert.equal(
    await codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("beginAuthorization sends the browser to Airtable with PKCE and every scope", async () => {
  const { location } = await beginAuthorization(CONFIG);
  const url = new URL(location);
  assert.equal(`${url.origin}${url.pathname}`, AUTHORIZE_URL);
  assert.equal(url.searchParams.get("client_id"), "client-123");
  assert.equal(url.searchParams.get("redirect_uri"), REDIRECT_URI);
  assert.equal(
    REDIRECT_URI,
    "https://snocap.vc/fundraising/followup/oauth/callback",
  );
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.deepEqual(url.searchParams.get("scope")?.split(" "), SCOPES);
  assert.ok(url.searchParams.get("state"));
  assert.ok(url.searchParams.get("code_challenge"));
});

test("the state cookie returns the verifier whose challenge was sent, for that state only", async () => {
  const { cookieValue, location } = await beginAuthorization(CONFIG);
  const sent = new URL(location).searchParams;
  const verifier = await verifierFor(cookieValue, sent.get("state"), CONFIG);
  assert.ok(verifier && verifier.length >= 43 && verifier.length <= 128);
  assert.equal(await codeChallenge(verifier), sent.get("code_challenge"));

  assert.equal(
    await verifierFor(cookieValue, "someone-elses-state", CONFIG),
    null,
  );
  assert.equal(await verifierFor(null, sent.get("state"), CONFIG), null);
  assert.equal(await verifierFor(cookieValue, null, CONFIG), null);
});

test("the state cookie expires and cannot be opened under another secret", async () => {
  const now = Date.now();
  const { cookieValue, location } = await beginAuthorization(CONFIG, now);
  const state = new URL(location).searchParams.get("state");
  assert.equal(
    await verifierFor(cookieValue, state, CONFIG, now + STATE_TTL_MS + 1),
    null,
  );
  assert.equal(
    await verifierFor(cookieValue, state, {
      ...CONFIG,
      sessionSecret: "other",
    }),
    null,
  );
});

function recordingFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return response;
  }) as typeof fetch;
  return { calls, impl };
}

const TOKEN_BODY = {
  access_token: "access-1",
  refresh_token: "refresh-1",
  expires_in: 3600,
  refresh_expires_in: 5184000,
};

test("exchangeCode posts the code and verifier with client credentials", async () => {
  const { calls, impl } = recordingFetch(Response.json(TOKEN_BODY));
  const tokens = await exchangeCode(
    "the-code",
    "the-verifier",
    CONFIG,
    impl,
    1000,
  );
  assert.deepEqual(tokens, {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    accessExpiresAt: 1000 + 3600 * 1000,
    refreshExpiresAt: 1000 + 5184000 * 1000,
  });
  assert.equal(calls[0].url, TOKEN_URL);
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, `Basic ${btoa("client-123:shh-secret")}`);
  const body = calls[0].init.body as URLSearchParams;
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("code"), "the-code");
  assert.equal(body.get("code_verifier"), "the-verifier");
  assert.equal(body.get("redirect_uri"), REDIRECT_URI);
});

test("refreshTokens uses the refresh grant and returns null when refused", async () => {
  const ok = recordingFetch(Response.json(TOKEN_BODY));
  assert.ok(await refreshTokens("refresh-0", CONFIG, ok.impl));
  const body = ok.calls[0].init.body as URLSearchParams;
  assert.equal(body.get("grant_type"), "refresh_token");
  assert.equal(body.get("refresh_token"), "refresh-0");

  const refused = recordingFetch(
    Response.json({ error: "invalid_grant" }, { status: 400 }),
  );
  assert.equal(await refreshTokens("used-already", CONFIG, refused.impl), null);
});
