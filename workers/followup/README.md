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
| `POST …/action` (session + CSRF)         | Sets Next Touch Point to +7 days; posts the comment, if any     |
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

## Commenting

Each card has one comment box and one button. Pressing it does two things, with
the user's own token:

1. **Moves Next Touch Point to today + 7 days** (Pacific date, written at 16:00
   UTC). That is what takes the card down the Follow Ups list, so every handled
   card is punted a week by default. The button shows the day:
   `Comment · next touch Oct 30`, or `Mark handled · Oct 30` when the box is
   empty, which only moves the date.
2. **Posts the box as an Airtable comment** on the Campaign, exactly as typed.
   Nothing is prepended; KB is not mentioned unless the comment mentions it.

The date is written first, then the comment. KB's comment intake reads every
Campaign comment (`campaign-tracker` skill, `bin/campaign-comment.ts`): a
comment that implies another day ("reach out in December", "@KB snooze next
touch point to Jan 5") gets Next Touch Point moved again by KB, so **KB's later
write wins** over this page's default. A comment that @-mentions KB is also an
instruction KB acts on and answers in the thread. One that mentions only Nate
or Shrina gets no KB reply: Airtable notifies them, and KB just logs and
classifies it as usual.

### @-mentions

Typing `@` opens a tap-to-pick list under the box (no hover; the keyboard
stays up). Picking a person inserts a visible `@Name`; on submit the page sends
the people it inserted, and `serializeComment` (`src/mentions.ts`) turns each
`@Name` still in the text into Airtable's mention form, `@[usr…]`, so Airtable
notifies them. A token edited into something else stays plain text.

The list does not use the base-collaborators endpoint (Enterprise-only). It is
built from what the user's token already sees: Representative and Created By
on the loaded Campaigns, Triggered By on their Interactions, the Representative
field's schema choices when Airtable returns any, and the authors and mentions
in each comment thread as it opens. KB (`usrt57orTxVb75I3W`) is always on it.
The page caches the list in `sessionStorage` for the browser session.

### Macros

A macro never writes or posts. It fills (or appends a line to) the comment box
with an editable template, and Jon edits it and presses the button. They live
in `src/macros.ts` as one registry: an entry is a label and a template, where
`{@kb}`, `{@rep}` (the Campaign's Representative) or `{@usr…}` (anyone) is a
mention and `{reason}` is a picked Closed Lost Reason.

| Macro           | Fills the box with                                        |
| --------------- | --------------------------------------------------------- |
| Snooze to date  | `@KB snooze next touch point to `                         |
| Draft follow-up | `@KB draft a follow-up email for me to send: `            |
| Log interaction | `@KB log this interaction: `                              |
| Close lost      | `@KB close lost: <reason>`, from the field's live options |
| Ping rep        | `@<Representative> any update here?` (hidden without one) |

There is no Punt macro: every submit already punts a week.

The Next Touch Point write uses `typecast: false`, so a malformed value fails
rather than being coerced.

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
comment + date write, a date-only submit, and a token refresh mid-visit. The
macro prefills, mention serialization and the PT default date are unit tests.
