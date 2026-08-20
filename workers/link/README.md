# workers/link

The short-link tool behind `snocap.vc/link`.

| Request                       | Response                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| `GET /link` (no session)      | Sign-in gate — never the form                               |
| `POST /link`                  | Sign in: email + access code, sets the session cookie       |
| `GET /link` (session)         | The create form: destination URL, short path, optional date |
| `POST /link/create` (session) | Stores the link, then redirects back with a confirmation    |
| `GET /link/<path>`            | `301` to the destination, or `302` if the link expires      |
| `GET /link/qr/<path>.png`     | The link's QR code as a PNG — no session, cached forever    |
| `GET /r/<path>` on `sno.llc`  | The same lookup on the short domain (see below)             |
| Anything else under `/link`   | `302` to `https://snocap.vc/` — never a 404                 |

## Redis, via the api

The ask was "save it into redis". A Cloudflare Worker runs at the edge and
cannot open a raw TCP connection to kernelbot's internal `kernelbot-redis`, so it
reaches the store the same way the data room override does (`workers/dataroom-gate`):
it POSTs to the **kernelbot-api** at `https://api.sno.llc` (kernelbot-api `:3010`
via the existing cloudflared-web tunnel — no new tunnel, hostname or proxy
worker), authenticating with a shared-secret header `x-link-secret:
<LINK_API_SECRET>`. The api owns the Redis read and write under the namespace
`link:slug:<slug>`; this worker never touches Redis directly. All of that lives
in `src/store.ts`.

Two routes:

- `POST /link/resolve` `{ slug }` → `{ found: false }` for an unknown **or
  expired** slug, or `{ found: true, record }` for a live one.
- `POST /link/create` `{ slug, destination, createdBy, expiresAt, replace? }` →
  `2xx` on store (with `replaced` naming the displaced record, if any), or `409`
  **carrying the live `record`** when one already holds the slug and `replace`
  is absent (an expired one is claimable without ceremony). The check-then-set is
  atomic server-side against Redis — a strict improvement on KV's
  last-writer-wins.
- `GET /link/peek?slug=<slug>` is this worker's own, not the api's: the form calls
  it as the admin types so "already taken" arrives before the submission. Behind
  the session cookie, because it answers precisely the question the public
  redirect refuses to.

What this buys over the previous KV design: **short links are now visible to the
agent stack** — kernelbot can list or create one through the api — instead of
being sealed inside a Worker-only KV namespace. It also removes a pre-merge
blocker: there is no `wrangler kv namespace create` step any more.

The cost, accepted knowingly: **every public redirect now depends on
`api.sno.llc`.** A redirect has nothing meaningful to fail open to, so when the
api is unreachable, times out, or 5xxs, the worker returns the **same uniform
302** a miss returns — never a 301 (see "Availability" below). A short ~2s
timeout keeps a hung api from holding the request open.

## Expiry: one timezone, checked on every read

A submitted `YYYY-MM-DD` means the **end of that day, UTC**. The link works
through all of the named date and dies at `00:00:00Z` the next day. That instant
is stored as `expiresAt` in epoch milliseconds, so the redirect path only ever
compares two numbers and never re-parses a date.

The record's `expiresAt` is authoritative on every read. Enforcement is
server-side: the api's `resolve` route drops a record whose date has passed
(answering `found:false`), and may set a Redis TTL as a collector so dead keys
do not accumulate. The worker keeps its own `isExpired` guard on the returned
record as defense-in-depth, so a record is never trusted past its date even if
the api mis-serves one.

## 301 versus 302

A link with **no** expiry redirects `301`. A link **with** an expiry redirects
`302` with `Cache-Control: no-store`, because a permanent redirect is exactly
what a caching browser will keep following after the link is supposed to be
dead.

The `301` carries an explicit `Cache-Control: public, max-age=3600`. A `301`
without one is cached indefinitely by browsers, which would make a mistyped
destination unfixable for anyone who had already followed it; an hour keeps the
permanent semantics while leaving a correction possible.

## Misses look identical

An expired link, an unknown link, a malformed slug and an unreadable record all
return the **same** `302` to `https://snocap.vc/` with the same headers and an
empty body. Nothing distinguishes "this expired" from "this never existed", so
the redirect surface cannot be probed for which slugs are real. A miss is never
a `301` — a slug that misses today may be created tomorrow.

## Availability

Every public redirect now depends on `api.sno.llc`. When the api is unreachable,
times out (~2s), or answers `5xx`, the resolve returns the **same uniform `302`
to `https://snocap.vc/`** a miss returns — deliberately **never a `301`**. A
transient outage must never be cached into a permanently wrong redirect, and a
redirect has nothing meaningful to fail open to, so it degrades to the temporary
miss and self-heals when the api returns. This is a knowingly-accepted
dependency, the same one the data room gate took on when its override moved to
the api.

The **create** path is different: it is one authenticated admin, not a public
redirect, so a store outage there is surfaced loudly (`502`, "try again in a
moment") rather than silently dropping the link.

## Slugs and destinations

- A slug may be almost anything `encodeURIComponent` can represent, lowercased on
  both write and read, and it **may nest**: `deck/fund2` serves at
  `snocap.vc/link/deck/fund2`, up to four `/`-separated segments. Slugs are escaped
  where rendered and percent-encoded where they enter a URL.
- Nesting is validated SEGMENT BY SEGMENT, which is what preserves the point of
  the old no-slash rule now that the slash is legal: `.` and `..` are refused by
  name, and an empty segment (`a//b`, a trailing slash) is a missing segment
  rather than a permitted one. The URL parser also normalizes `..` away before
  routing sees it, so the segment check is the second line of defence, not the
  only one.
- `create`, `qr` and `peek` are reserved as the **first** segment, because each is
  a live endpoint (`POST /link/create`, `GET /link/qr/<slug>.png`,
  `GET /link/peek`) that a slug rooted at the same name would shadow. Deeper down
  they shadow nothing, so `deck/create` is a fine path.
- A destination must parse and must be `http:` or `https:`. The scheme
  allowlist is load-bearing: a redirector that echoes `javascript:` or `data:`
  into a `Location` header is an XSS vector, not just a bad link.
- A destination may not point back at `snocap.vc/link*` or `sno.llc/r/*`.
- **A live slug is refused, not repointed** (`409`) — unless the admin confirms
  the replacement. The default holds because the old link is already in
  circulation and a permanent one's `301` sits in browser caches for up to an hour
  (see the `max-age` on the redirect), so a silent repoint would strand visitors
  on a destination nobody chose. An **expired** slug is free to claim again with
  no confirmation at all.
- The confirmation is a **ticked checkbox**, revealed by the form's live
  `/link/peek` lookup as the short path is typed — so the admin sees what the path
  currently points at _before_ submitting, and the refusal message names that
  destination too. The box is re-checked server-side on every create: the lookup
  is a convenience, not the gate, and a page with JavaScript off still gets the
  `409` and the same checkbox on the way back.

## The QR code

`GET /link/qr/<slug>.png` returns the QR code for `https://snocap.vc/link/<slug>`
as a PNG. The success banner embeds it as an `<img>`, but the endpoint is the
point: it is a durable URL, so the same code can be dropped into a Google Doc, an
email or a deck by `<img src>`, or copied straight off the page with right-click →
Copy Image.

Three decisions worth knowing:

- **Unauthenticated, deliberately.** An `<img>` in a doc or an email carries no
  cookie, so a gated image would render as a broken one everywhere it is useful.
  It discloses nothing: the only thing it can ever encode is a `snocap.vc` URL
  that whoever holds the image already has.
- **It never reads the store**, so an unknown slug still gets an image. The QR
  encodes a URL; whether that URL resolves is the redirect path's business. Only a
  slug that could never be a slug gets the uniform miss. It also means the
  endpoint cannot be probed to learn whether a slug exists.
- **PNG, not SVG**, because a raster image is what pastes into Docs, Slack and
  mail clients. Workers have no canvas and no `node:zlib`, so
  `workers/shared/qr-png.ts` writes the bytes by hand: a 1-bit greyscale image
  whose IDAT is a zlib stream of _stored_ (uncompressed) DEFLATE blocks, which
  leaves only the CRC-32 and Adler-32 checksums to compute. Output is a pure
  function of the slug, which is what lets the response claim
  `max-age=31536000, immutable`.

## Auth

Email plus a single shared access code (`LINK_ADMIN_PASSWORD`), on the deck
gate's model, restricted to the domains in `LINK_ALLOWED_EMAIL_DOMAINS`. A
success sets the signed cookie from `workers/shared/cookie.ts` — `link_admin`,
12 hours, `HttpOnly`, `Path=/link`. Every rejection returns the same wording, so
the form cannot be used to discover which addresses are allowed.

`SameSite=Lax` on that cookie is what protects `POST /link/create`: a cross-site
form submission arrives without the cookie and is rejected as unauthenticated.

**`LINK_SESSION_SECRET` must not be the value either gate worker signs with.**
The cookie format is shared, so an identical secret would let anyone holding a
deck or data room cookie re-label it `link_admin` and forge a session here. It
is deliberately not called `HMAC_SECRET` for that reason.

## Setup

Once, before the first deploy:

```bash
cd workers/link

# The three secrets. There is no `wrangler kv namespace create` step any more —
# the store is Redis, owned by the api.
npx wrangler secret put LINK_API_SECRET       # the shared secret the api also holds
npx wrangler secret put LINK_SESSION_SECRET   # fresh random value, NOT a gate's HMAC_SECRET
npx wrangler secret put LINK_ADMIN_PASSWORD   # the shared access code
```

`LINK_API_SECRET` must be the **same** long random string the kernelbot side
holds as `LINK_API_SECRET` (its `.env` / `.env.enc`), mirroring how the apply
worker shares its secret. Until it is set, every resolve fails open to the
uniform miss and every create returns `502`.

`LINK_API_BASE` (the `api.sno.llc` origin) and `LINK_ALLOWED_EMAIL_DOMAINS` are
plain `[vars]` entries in `wrangler.toml`, not secrets. Leaving the domain list
empty allows any valid address.

## Enabling `sno.llc/r/*`

The worker already answers this surface and it is covered by tests; the route is
commented out in `wrangler.toml` because two things outside this repo have to be
true first.

1. **The CI Cloudflare token needs the `sno.llc` zone.** `sno.llc` and
   `snocap.vc` resolve to the same Cloudflare nameservers, so both zones sit in
   one account — but `CLOUDFLARE_API_TOKEN` must carry edit rights on `sno.llc`
   or adding the route fails the deploy.
2. **The existing catch-all redirect must stop shadowing `/r/`.** Today
   `https://sno.llc/r/anything` answers `301 → https://snocap.vc`, so something
   already matches every path on that zone. Which product it is decides the fix,
   and they behave oppositely:

   - A **Redirect Rule** (Rules → Redirect Rules) runs **before** Workers. The
     rule must be given an exception so it skips `/r/*`, otherwise the worker
     never executes.
   - A legacy **Page Rule** with _Forwarding URL_ is **ignored** for a request
     that matches a Worker route, so the worker would win with no further
     change.

   Check which exists on the `sno.llc` zone, apply the matching fix, then
   uncomment the route.

## Working on it

```bash
npm test          # from the repo root: node --test over workers/**/*.test.ts
```

`src/links.ts` holds every rule with no dependency on the Workers runtime, so
the validation and expiry logic is unit-tested without a network round trip;
`src/store.ts` is the thin HTTP passthrough to the api; `src/index.test.ts`
drives the worker's `fetch` against a fake api stubbed onto `globalThis.fetch`.

`src/form-page.ts` renders external `.html` templates (`src/form-page*.html`)
through `workers/shared/template.ts` rather than interpolating markup in code —
the markup stays in a file prettier and an HTML linter can see. A `.html` import
resolves to the file's text: wrangler inlines it via `[[rules]] type = "Text"`,
and `node --test` via the `workers/html.mjs` loader (wired up by the root `test`
script). It carries its own stylesheet instead of rendering through
`workers/shared/gate-page.ts`, whose shell is hardwired to an email + access
code pair. Teaching that shell arbitrary fields would mean editing a module both
LP-facing gates render from, for no benefit to them.
