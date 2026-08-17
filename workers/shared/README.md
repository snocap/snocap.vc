# workers/shared

Code used by the workers that put a sign-in in front of something: `deck-gate`
(`snocap.vc/deck*`), `dataroom-gate` (`snocap.vc/dataroom*`) and `link`
(`snocap.vc/link*`). They are the same idea — collect an email, check an access
code, set a signed cookie — with different policies on top. The two gates also
log the viewer to D1; `link` does not.

| Module           | What it holds                                                             |
| ---------------- | ------------------------------------------------------------------------- |
| `crypto.ts`      | HMAC-SHA256 signing, constant-time compare, base32                        |
| `cookie.ts`      | The signed viewer cookie: read, sign, verify, and the `Set-Cookie` header |
| `email.ts`       | Normalizing, validating, and the default referral slug                    |
| `gate-page.ts`   | The gate page shell — chrome and CSS, with the copy passed in             |
| `qr-png.ts`      | A QR code as PNG bytes: the vendored encoder plus a PNG writer            |
| `viewers.ts`     | The `viewers` D1 write and the token-gated admin table                    |
| `deny-report.ts` | The other half: a REJECTED sign-in, reported to the kernelbot-api         |
| `vendor/`        | Third-party sources copied in, because the workers take no dependencies   |

`viewers.ts` and `deny-report.ts` are a pair. D1 records who got in; a rejection
is not a row anywhere, and a Worker's only native log sink is Cloudflare's
ephemeral tail stream — so before `deny-report.ts` a visitor who bounced off a
gate left no trace and "it won't let me in" was undiagnosable. It POSTs the
email, the gate, the reason and the ref (never the submitted code) to
`api.sno.llc/gate/denied`, fire-and-forget through `ctx.waitUntil`, so the gate's
own response is never delayed or changed by it.

## What is not shared

Each worker keeps its own policy in its own `src/index.ts`, because those
differences are the point:

|             | deck-gate                      | dataroom-gate                                      | link                                      |
| ----------- | ------------------------------ | -------------------------------------------------- | ----------------------------------------- |
| Access code | one shared `DECK_PASSWORD`     | derived from the email alone, via a secret         | one shared `LINK_ADMIN_PASSWORD`          |
| Ref bypass  | yes — a ref skips the code     | no — the cookie is the only way in                 | no; sign-in is also domain-restricted     |
| Cookie      | `snocap_viewer`, 30d, `Path=/` | `dataroom_viewer`, 24h, `Path=/dataroom`, HttpOnly | `link_admin`, 12h, `Path=/link`, HttpOnly |
| Storage     | D1 `deck-viewers`              | D1 `dealroom-viewers`                              | Redis via the api (`link:slug:<slug>`)    |

The data room's D1 database is `dealroom-viewers`, not `dataroom-viewers`: the
Worker was renamed, the database was not. Renaming it would be a second
migration with no upside — `database_id`, not the name, is what binds — and it
would strand the viewer history. So `wrangler d1 …` against the data room wants
`dealroom-viewers`.

Nothing about routes, bindings, secrets or migrations is shared. Each worker
declares its own in its `wrangler.toml`.

**Each worker signs with its own secret value.** The cookie format is common, so
two workers sharing one signing secret would accept each other's cookies under a
renamed cookie — which is why `link` names its own `LINK_SESSION_SECRET`.

## Working on it

```bash
npm test          # from the repo root: node --test over workers/**/*.test.ts
```

The tests need no dependencies. Node runs the TypeScript directly (type
stripping, built in since 22.18), which is also what lets
`dataroom-gate/scripts/derive-password.mjs` call the worker's own
`derivePassword` instead of keeping a second copy of the formula.

Imports carry the `.ts` extension so Node can resolve them; wrangler bundles
with esbuild, which resolves them the same way.

**Nothing here may import a bare module specifier.** The workers take no
dependencies, and two separate things enforce it: `test-workers.yml` runs
`npm test` with no install step, and each worker's own `package.json` declares
nothing but wrangler. So an `import x from "some-package"` fails the test run
with `ERR_MODULE_NOT_FOUND` and fails `wrangler deploy` with "Could not
resolve", even when the package is in the root `package.json` — the root install
only ever backs the Astro site. When shared code genuinely needs a library, copy
its source into `vendor/` and import it by relative path, as `gate-page.ts` does
for its QR encoder. `vendor/` is listed in `.prettierignore` so those copies stay
diffable against upstream, and each one carries a header saying what it is, which
version, and how to re-vendor it.

**Editing anything here redeploys every worker that imports it** — `deck-gate`,
`dataroom-gate` and `link` each watch this directory in their own workflow
(`.github/workflows/deploy-worker.yml`, `deploy-dataroom-worker.yml`,
`deploy-link-worker.yml`), so a shared change goes live on all three within a
couple of minutes of the merge. Editing one worker's own directory redeploys
only that worker. Nothing here is deployed by hand any more.
