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
| `GET /fundraising/followup` (session)    | The deck: one card per Campaign, `n of N` (see Navigating)      |
| `GET …/campaign/<recId>` (session)       | The expanded card: contacts + Interactions and comments merged  |
| `POST …/action` (session + CSRF)         | Attachments, then the comment; sets no dates                    |
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

## Navigating

On a phone the deck shows one card: swipe, or the **First / Prev / Next / Last**
buttons under it. On a keyboard: ← → (or j k), **Home** and **End**.

On a wide screen it is a row. As many 400px cards as fit show side by side,
always an odd number (1, 3 or 5) so the selected card sits in the center,
outlined; its neighbours are dimmed and read-only, and clicking one selects it
and re-centers the row. At either end of the list the selected card stays in the
center with empty slots beside it. Opening a card's history grows that card
downward in place; the row does not move. It is one set of cards and one
`show()` either way: the page measures the width, picks the count
(`visibleCount`) and lays the window out (`carouselSlots`), both in
`src/client.ts`.

**Search** (the Search button, or `/` on a keyboard) finds a Campaign in the
loaded view by its name, its LP, the LP's primary contacts or its
Representative, ignoring case and accents (`Cafe` finds `Café`). ↑ ↓ and Enter
work in the results, and so does a tap. Picking one jumps the deck to that
Campaign's real place in the view; the deck itself is never filtered, so
Prev/Next carry on from there.

**Where you were** is remembered per Airtable user in `localStorage`
(`followup-position:<user id>`: the Campaign's record id and its index), on every
move. A reload reopens that Campaign if it is still in Follow Ups; if it has left,
the page opens whatever now sits at its old index, clamped to the list. Storage
that is unavailable or holds junk just opens the first card.

## Commenting

Each card has one comment box and one button, **Post comment**. It is disabled
while the box is empty and nothing is attached, and the Worker refuses an empty
submit too. Pressing it does, with the user's own token, in this order:

1. **Saves any attachments** on a new Interaction (see Attachments). If that
   fails nothing else is written.
2. **Posts the box as an Airtable comment** on the Campaign, exactly as typed
   but for its mentions. Nothing is prepended; KB is not mentioned unless the
   comment mentions it, or files are attached (see Attachments).

Nothing else is written. **The page sets no dates**: Next Touch Point is KB's.
KB's comment intake reads every human-authored Campaign comment, whether it was
posted here or typed in Airtable (`campaign-tracker` skill, step 1c), and
decides the next touch from it: a day the comment implies ("reach out in
December", "@KB snooze next touch point to Jan 5"), or else the later of the
current Next Touch Point, when still in the future, and the comment's Pacific
date + 7 days. A comment that says to leave the date alone is followed. That
change is what takes the card down the Follow Ups list. The comment is last
because it is what wakes KB, so the Interaction must exist when KB reads it. A
comment that @-mentions KB is also an instruction KB acts on and answers in the
thread. One that mentions only Nate or Shrina gets no KB reply: Airtable
notifies them, and KB just logs and classifies it as usual.

### While it posts

The press locks the card at once: the button is disabled, so a second tap
cannot post twice, and the box, macros, Closed Lost Reason, attachment controls
and mention list are frozen. The page asks for `application/x-ndjson`, and the
Worker streams one line per step as it starts (`{"phase":"upload","n":1,"of":2}`,
`{"phase":"comment"}`), then the outcome
(`{"done":true,"ok":…,"message":…,"reason":…}`). The button names each step:
**Uploading 1 of N…**, **Posting comment…**, then **Posted ✓** before the deck moves to the next Campaign. A
refusal before anything is written (stale page, signed out, a bad file) comes
back as plain JSON.

On a failure nothing advances: the button comes back as **Failed: <reason>, tap
to retry**, the typed text and attachments stay, and the full message shows
under it. The steps live in `submitFlow` (`src/client.ts`), the stream reader
in `readSubmit`.

### @-mentions

Typing `@` opens a pick list under the box (no hover; on a phone the keyboard
stays up and a tap picks). On a keyboard ↑ ↓ move the highlight, Enter or Tab
picks, Esc closes. Picking a person inserts a visible `@Name`; on submit the page sends
the people it inserted, and `serializeComment` (`src/mentions.ts`) turns each
`@Name` still in the text into Airtable's mention form, `@[usr…]`, so Airtable
notifies them. A token edited into something else stays plain text.

The list does not use the base-collaborators endpoint (Enterprise-only). It is
built from what the user's token already sees: Representative and Created By
on the loaded Campaigns, Triggered By on their Interactions, the Representative
field's schema choices when Airtable returns any, and the authors and mentions
in each comment thread as it opens. Everyone shows under their Airtable display
name, KB included (`Kernel Bottie`, `usrt57orTxVb75I3W`, always on the list so
the macros can mention it); there is no alias.
The page caches the list in `sessionStorage` for the browser session.

### Macros

A macro never writes or posts. It puts an editable template in the comment box,
and Jon edits it and presses the button. When the box is empty, or still holds
exactly what the previous macro put there, the macro replaces it; once anything
has been typed, it appends a line instead (`applyMacro`, `src/client.ts`). They live
in `src/macros.ts` as one registry: an entry is a label and a template, where
`{@kb}`, `{@rep}` (the Campaign's Representative) or `{@usr…}` (anyone) is a
mention and `{reason}` is a picked Closed Lost Reason.

| Macro           | Fills the box with                                        |
| --------------- | --------------------------------------------------------- |
| Snooze to date  | `@Kernel Bottie snooze next touch point to `              |
| Draft follow-up | `@Kernel Bottie draft a follow-up email for me to send: ` |
| Log interaction | `@Kernel Bottie log this interaction: `                   |
| Close lost      | `@Kernel Bottie close lost: <reason>`, live options       |
| Ping rep        | `@<Representative> any update here?` (hidden without one) |

There is no Punt macro: every comment already gets a next touch from KB, a week out by default.

The Closed Lost Reasons are read from the base schema on every page load, never
hardcoded or cached, so an option added in Airtable shows on the next reload.
The options carry their own colors for both OS themes (an open select's popup
once drew white text on white); `src/options.test.ts` holds both pairs to AA
contrast.

## Attachments

"Attach" (a file picker), pasting from the clipboard into the box, or dropping
files on the card attaches them: any file Airtable takes, up to 10 a post.
Images show as thumbnails and other files as named chips, each with a × to drop
it before posting. Airtable's `uploadAttachment` takes at most 5 MB a file, so
the page re-encodes a larger image as a smaller JPEG first; any other file over
5 MB is refused on the page with a message, and the Worker refuses one again.
An image the browser cannot shrink under 5 MB (HEIC outside Safari) stops the
submit with the button back and **Failed: file over 5 MB**.

On submit, with the user's own token, the Worker:

1. creates one Interaction on the Campaign: Summary `New Interaction
Attachment` (`PLACEHOLDER_SUMMARY`, `src/attachments.ts`; KB's
   campaign-tracker looks for the same string), Triggered By the user as
   Airtable's `whoami` names them, Occurred on today (Pacific), Channel blank;
2. uploads each file into its Attachments field (`content.airtable.com`);
3. posts the Campaign comment: the typed text, if any, then on its own line
   `@[usrt57orTxVb75I3W] extract and update relevant information from recent
interaction`, which Airtable shows as `@Kernel Bottie extract …`.

That comment is KB's only signal, through its ordinary Campaign comment intake:
it reads the files and fills that Interaction in (Channel from the canonical
labels, the date when visible, Summary, Details), or moves them onto an
Interaction on the same channel within a day that already records it and
deletes the placeholder. Anything else the comment says is handled as usual.
If the uploads fail no comment is posted, so KB is never sent to a half-saved
record. No new scope or secret: uploading is `data.records:write`.

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
comment posted with no other write, an empty submit refused, attachments (the
Interaction, the uploads, the comment with and without text, a failed upload,
refused files), live
Closed Lost Reasons, the search index, and a token refresh mid-visit. Pacific days,
macro prefills, mention
serialization, and the page's own rules (`src/client.ts`: search, the restored
position, highlight keys, macro replace, file intake and image shrinking, the
row's window) are
unit tests. The page runs those same functions: `clientScript` (`src/pages.ts`)
inlines their source, so each must stay self-contained.
