# workers/followup

The LP follow-up review deck at `snocap.vc/fundraising/followup`. Jon walks the
Campaign Tracker's **Campaigns → Follow Ups** view at every LP Review (Wednesday
and Friday mornings PT), often from his phone. This page shows one card per
Campaign in that view's own sort order, with its history and contacts, and the
actions that write back to Airtable.

| Request                                  | Response                                                        |
| ---------------------------------------- | --------------------------------------------------------------- |
| any path, before the secrets are set     | `503` "Not configured yet"                                      |
| `GET /fundraising/followup` (no session) | "Sign in with Airtable"                                         |
| `GET …/oauth/start`                      | `302` to Airtable's consent screen (state + PKCE S256)          |
| `GET …/oauth/callback`                   | Exchanges the code, checks base access, sets the session cookie |
| `GET /fundraising/followup` (session)    | The deck: one card per Campaign, `n of N`, swipe / ← → / j k    |
| `GET …/campaign/<recId>` (session)       | The expanded card: contacts + Interactions and comments merged  |
| `POST …/action` (session + CSRF)         | Runs a macro: a field write, a comment, or both                 |
| `POST …/signout` (session + CSRF)        | Clears the session cookie                                       |

## No Airtable token of its own

The Worker holds **no Airtable PAT**. Sign-in is Airtable OAuth (authorization
code + PKCE, confidential client), and every read and write is made with the
signed-in user's own access token. Someone who finds the page can only ever see
what their own Airtable account can already see; an account that cannot open the
Campaign Tracker gets a plain "No access" page and no session.

The tokens live only in an AES-GCM-encrypted cookie (`followup_session`,
`HttpOnly; Secure; SameSite=Lax`, `Path=/fundraising/followup`), whose lifetime
is the refresh token's. The access token lasts an hour; once it has run out the
next request refreshes it and re-sets the cookie (Airtable rotates the refresh
token on every use). Every POST carries the session's CSRF token, and one with a
foreign `Origin` is refused.

## Actions

The default action is a free-text box: it posts an Airtable **comment** on the
Campaign, written as the signed-in user and @-mentioning KB (`@[usrt57orTxVb75I3W]`).
The Campaign Tracker's comment automation already delivers every Campaign
comment to kernelbot's comment intake (`campaign-tracker` skill,
`bin/campaign-comment.ts`), which acts on a KB-mentioned instruction and replies
in the thread. So the comment is both the instruction and its audit trail, and
this Worker needs no kernelbot endpoint.

Macros live in `src/macros.ts` as one registry; adding one is one entry.

| Macro           | Writes                                              | Comment                                         |
| --------------- | --------------------------------------------------- | ----------------------------------------------- |
| Ask KB          | —                                                   | the instruction, to KB                          |
| Punt 1 week     | Next Touch Point = later of (now, current) + 7 days | a note (no KB mention)                          |
| Snooze to date  | Next Touch Point = the picked day, 16:00 UTC        | a note (no KB mention)                          |
| Draft follow-up | —                                                   | KB: draft a follow-up email for Jon, never send |
| Log interaction | —                                                   | KB: log this as an Interaction                  |
| Close lost      | Closed Lost Reason (from the field's live options)  | KB: set Deal Status 11.0 - Closed Lost          |

Field writes use `typecast: false`, so a stale select label fails rather than
minting a new option.

## Setup — Jon, once

1. Open **https://airtable.com/create/oauth** and click **Register new OAuth
   integration**.
2. **Name:** `SNØCAP LP Follow-up Review`.
3. **OAuth redirect URL:** `https://snocap.vc/fundraising/followup/oauth/callback`
   (exactly; no trailing slash).
4. **Scopes** — tick these six and nothing else:
   - `data.records:read`
   - `data.records:write`
   - `data.recordComments:read`
   - `data.recordComments:write`
   - `schema.bases:read`
   - `user.email:read`
5. Save, then click **Generate client secret** and copy it. It is shown once.
6. Send KB the **client ID** and the **client secret** (a DM, not a channel).

## Setup — KB, once Jon hands over the client

KB sets the three Worker secrets itself with wrangler, using the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in kernelbot's `.env`:

```bash
cd workers/followup
npx wrangler secret put AIRTABLE_CLIENT_ID
npx wrangler secret put AIRTABLE_CLIENT_SECRET
openssl rand -base64 48 | npx wrangler secret put FOLLOWUP_SESSION_SECRET
```

`FOLLOWUP_SESSION_SECRET` is a fresh random value and never another worker's
secret. Until all three are set, every path answers the `503` page. Rotating the
session secret signs everyone out; nothing else is lost.

## Deploying

Merging to `main` deploys it (`.github/workflows/deploy-followup-worker.yml`,
which also watches `workers/shared/`). Nothing is deployed by hand.

## Working on it

```bash
npm test   # from the repo root; the followup tests are workers/followup/src/*.test.ts
```

The tests stub `globalThis.fetch` with a fake Airtable and drive the Worker's
`fetch`: the 503, the OAuth round trip, the no-access page, the CSRF gate, the
macros' payloads, and a token refresh mid-visit.
