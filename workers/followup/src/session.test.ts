// The session cookie: sealed so it cannot be read or altered, refreshed once the
// access token runs out, and the CSRF check every POST goes through.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Config } from "./config.ts";
import { open, seal } from "./seal.ts";
import {
  SESSION_COOKIE,
  csrfOk,
  ensureFresh,
  newSession,
  readSession,
  sessionCookie,
} from "./session.ts";

const CONFIG: Config = {
  clientId: "client-123",
  clientSecret: "shh-secret",
  sessionSecret: "session-secret",
};
const NOW = 1_800_000_000_000;

function session(accessExpiresAt = NOW + 3_600_000) {
  return newSession(
    {
      accessToken: "access-1",
      refreshToken: "refresh-1",
      accessExpiresAt,
      refreshExpiresAt: NOW + 86_400_000,
    },
    { email: "jon@sno.llc", id: "usrJon" },
  );
}

function requestWith(cookie: string): Request {
  return new Request("https://snocap.vc/fundraising/followup", {
    headers: { Cookie: cookie },
  });
}

test("the session cookie is HttpOnly, Secure, SameSite=Lax and scoped to the tool", async () => {
  const header = await sessionCookie(session(), CONFIG, NOW);
  assert.match(header, /^followup_session=/);
  assert.match(header, /; Path=\/fundraising\/followup;/);
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Max-Age=86400;/);
  // The tokens are encrypted, not merely signed.
  assert.doesNotMatch(header, /access-1|refresh-1|jon@sno\.llc/);
});

test("a session cookie round-trips, and a tampered one is refused", async () => {
  const header = await sessionCookie(session(), CONFIG, NOW);
  const value = header.split(";")[0];
  const read = await readSession(requestWith(value), CONFIG, NOW);
  assert.equal(read?.email, "jon@sno.llc");
  assert.equal(read?.accessToken, "access-1");

  const raw = value.slice(`${SESSION_COOKIE}=`.length);
  const flipped =
    raw.slice(0, -2) + (raw.endsWith("A") ? "B" : "A") + raw.slice(-1);
  assert.equal(
    await readSession(requestWith(`${SESSION_COOKIE}=${flipped}`), CONFIG, NOW),
    null,
  );
  assert.equal(
    await readSession(
      requestWith(value),
      { ...CONFIG, sessionSecret: "other" },
      NOW,
    ),
    null,
  );
});

test("a value sealed for one purpose does not open as another", async () => {
  const sealed = await seal({ exp: NOW + 1000 }, "s", "oauth-state");
  assert.equal(await open(sealed, "s", "session", NOW), null);
  assert.ok(await open(sealed, "s", "oauth-state", NOW));
});

test("ensureFresh leaves a live access token alone", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    return Response.json({});
  }) as typeof fetch;
  const result = await ensureFresh(session(), CONFIG, fetchImpl, NOW);
  assert.equal(result?.refreshed, false);
  assert.equal(calls, 0);
});

test("ensureFresh refreshes an expired access token and keeps the identity", async () => {
  const fetchImpl = (async () =>
    Response.json({
      access_token: "access-2",
      refresh_token: "refresh-2",
      expires_in: 3600,
      refresh_expires_in: 5184000,
    })) as typeof fetch;
  const before = session(NOW - 1);
  const result = await ensureFresh(before, CONFIG, fetchImpl, NOW);
  assert.equal(result?.refreshed, true);
  assert.equal(result?.session.accessToken, "access-2");
  assert.equal(result?.session.refreshToken, "refresh-2");
  assert.equal(result?.session.email, "jon@sno.llc");
  assert.equal(result?.session.csrf, before.csrf);
  assert.equal(result?.session.exp, NOW + 5184000 * 1000);
});

test("ensureFresh refreshes a token about to expire, and signs out when refused", async () => {
  const refused = (async () =>
    Response.json({ error: "invalid_grant" }, { status: 400 })) as typeof fetch;
  assert.equal(
    await ensureFresh(session(NOW + 30_000), CONFIG, refused, NOW),
    null,
  );
});

test("csrfOk wants the session's token and, if named, this origin", () => {
  const s = session();
  const post = (origin?: string) =>
    new Request("https://snocap.vc/fundraising/followup/action", {
      method: "POST",
      headers: origin ? { Origin: origin } : {},
    });
  const origin = "https://snocap.vc";
  assert.equal(csrfOk(post(origin), s, s.csrf, origin), true);
  assert.equal(csrfOk(post(), s, s.csrf, origin), true);
  assert.equal(csrfOk(post(origin), s, "wrong", origin), false);
  assert.equal(csrfOk(post(origin), s, null, origin), false);
  assert.equal(csrfOk(post(origin), s, "", origin), false);
  assert.equal(csrfOk(post("https://evil.example"), s, s.csrf, origin), false);
});
