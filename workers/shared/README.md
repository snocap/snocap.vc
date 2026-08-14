# workers/shared

Code used by the workers that put a sign-in in front of something: `deck-gate`
(`snocap.vc/deck*`), `dataroom-gate` (`snocap.vc/dataroom*`) and `link`
(`snocap.vc/link*`). They are the same idea — collect an email, check an access
code, set a signed cookie — with different policies on top. The two gates also
log the viewer to D1; `link` does not.

| Module         | What it holds                                                             |
| -------------- | ------------------------------------------------------------------------- |
| `crypto.ts`    | HMAC-SHA256 signing, constant-time compare, base32                        |
| `cookie.ts`    | The signed viewer cookie: read, sign, verify, and the `Set-Cookie` header |
| `email.ts`     | Normalizing, validating, and the default referral slug                    |
| `gate-page.ts` | The gate page shell — chrome and CSS, with the copy passed in             |
| `viewers.ts`   | The `viewers` D1 write and the token-gated admin table                    |

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

**Editing anything here redeploys every worker that imports it** — `deck-gate`,
`dataroom-gate` and `link` each watch this directory in their own workflow
(`.github/workflows/deploy-worker.yml`, `deploy-dataroom-worker.yml`,
`deploy-link-worker.yml`), so a shared change goes live on all three within a
couple of minutes of the merge. Editing one worker's own directory redeploys
only that worker. Nothing here is deployed by hand any more.
