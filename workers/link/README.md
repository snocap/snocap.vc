# workers/link

The short-link tool behind `snocap.vc/link`.

| Request                       | Response                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| `GET /link` (no session)      | Sign-in gate — never the form                               |
| `POST /link`                  | Sign in: email + access code, sets the session cookie       |
| `GET /link` (session)         | The create form: destination URL, short path, optional date |
| `POST /link/create` (session) | Stores the link, then redirects back with a confirmation    |
| `GET /link/<path>`            | `301` to the destination, or `302` if the link expires      |
| `GET /r/<path>` on `sno.llc`  | The same lookup on the short domain (see below)             |
| Anything else under `/link`   | `302` to `https://snocap.vc/` — never a 404                 |

## Why KV, and not redis

The ask was "save it into redis". A Cloudflare Worker runs at the edge and has
no route to kernelbot's internal `kernelbot-redis`, so honouring that literally
would mean standing up a public write endpoint on `api.sno.llc` and then
defending it — HMAC over the payload, a nonce and timestamp against replay, a
seen-nonce cache. That is a lot of machinery whose only purpose is to protect a
door we do not otherwise need to open.

Worker-owned KV removes the door instead of guarding it. **There is no write API
to abuse**: the sole writer is the authenticated form inside this worker, so the
"a bad actor posts straight to our API" failure mode does not exist to be
defended against. KV also expresses expiration natively as a per-key TTL, and
reads are edge-local, so a redirect costs no cross-service round trip.

What that gives up versus redis:

- **Links are invisible to kernelbot.** Nothing in the agent stack can list or
  create a short link; this worker is the only way in. A `/link/admin` listing
  page, or a kernelbot-side write path, would be new work.
- **KV writes are eventually consistent.** A freshly created link can miss for a
  few seconds in a distant region, and a miss lands on `snocap.vc` rather than
  erroring — briefly confusing, never broken.
- **No audit trail beyond the record itself.** Each record carries `createdBy`
  and `createdAt`, but there is no history of edits or hit counts. D1 (already
  used by both gate workers) is where to go if that is wanted later.

## Expiry: one timezone, checked on every read

A submitted `YYYY-MM-DD` means the **end of that day, UTC**. The link works
through all of the named date and dies at `00:00:00Z` the next day. That instant
is stored as `expiresAt` in epoch milliseconds, so the redirect path only ever
compares two numbers and never re-parses a date.

The record's `expiresAt` is authoritative on every read. The KV TTL is set as
well, but only as a garbage collector: KV's TTL floor is 60 seconds and deletion
is eventual, so a link expiring in the next minute would outlive its own date if
the TTL were the only check.

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

## Slugs and destinations

- A slug matches `^[a-z0-9][a-z0-9_-]{0,63}$`, lowercased on both write and
  read. No dots and no slashes, so traversal shapes fail the pattern outright
  rather than depending on path normalization.
- `admin`, `api`, `create`, `login`, `logout` and `new` are reserved, so a link
  can never shadow the tool's own paths.
- A destination must parse and must be `http:` or `https:`. The scheme
  allowlist is load-bearing: a redirector that echoes `javascript:` or `data:`
  into a `Location` header is an XSS vector, not just a bad link.
- A destination may not point back at `snocap.vc/link*` or `sno.llc/r/*`.
- **A live slug is refused, not repointed** (`409`). The old link is already in
  circulation and its `301` may sit in caches we cannot reach. An **expired**
  slug is free to claim again.

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

# 1. Create the store, then paste the printed id into wrangler.toml.
npx wrangler kv namespace create LINKS

# 2. The two secrets.
npx wrangler secret put LINK_SESSION_SECRET   # fresh random value, NOT a gate's HMAC_SECRET
npx wrangler secret put LINK_ADMIN_PASSWORD   # the shared access code
```

`LINK_ALLOWED_EMAIL_DOMAINS` is a plain `[vars]` entry in `wrangler.toml`, not a
secret. Leaving it empty allows any valid address.

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
the validation, expiry and TTL logic is unit-tested without a KV binding;
`src/index.test.ts` drives the worker's `fetch` against a fake KV.

`src/form-page.ts` carries its own stylesheet instead of rendering through
`workers/shared/gate-page.ts`, whose shell is hardwired to an email + access
code pair. Teaching that shell arbitrary fields would mean editing a module both
LP-facing gates render from, for no benefit to them.
