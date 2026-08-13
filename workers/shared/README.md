# workers/shared

Code used by both gate workers, `deck-gate` (`snocap.vc/deck*`) and
`dataroom-gate` (`snocap.vc/dataroom*`). They are the same idea — collect an
email, check an access code, set a signed cookie, log the viewer to D1 — with
different policies on top.

**Directory names are not Worker names here.** `workers/dataroom-gate` deploys a
Cloudflare Worker named `dealroom-gate`, and its D1 database is
`dealroom-viewers` — the pre-rename spelling, kept on purpose. Anything you run
against that gate (`wrangler secret …`, `wrangler d1 …`, the dashboard) wants
`dealroom-gate`. The reasons, and why renaming it is a production migration
rather than an edit, are at the top of `dataroom-gate/wrangler.toml`.
`deck-gate` matches its directory.

| Module         | What it holds                                                             |
| -------------- | ------------------------------------------------------------------------- |
| `crypto.ts`    | HMAC-SHA256 signing, constant-time compare, base32                        |
| `cookie.ts`    | The signed viewer cookie: read, sign, verify, and the `Set-Cookie` header |
| `email.ts`     | Normalizing, validating, and the default referral slug                    |
| `gate-page.ts` | The gate page shell — chrome and CSS, with the copy passed in             |
| `viewers.ts`   | The `viewers` D1 write and the token-gated admin table                    |

## What is not shared

Each gate keeps its own policy in its own `src/index.ts`, because those
differences are the point:

|             | deck-gate                      | dataroom-gate (Worker `dealroom-gate`)             |
| ----------- | ------------------------------ | -------------------------------------------------- |
| Access code | one shared `DECK_PASSWORD`     | derived per (email, ref) from a secret             |
| Ref bypass  | yes — a ref skips the code     | no — the cookie is the only way in                 |
| Cookie      | `snocap_viewer`, 30d, `Path=/` | `dataroom_viewer`, 24h, `Path=/dataroom`, HttpOnly |
| D1          | `deck-viewers`                 | `dealroom-viewers`                                 |

Nothing about routes, bindings, secrets or migrations is shared. Each worker
declares its own in its `wrangler.toml`.

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

**Editing anything here redeploys BOTH gates** — `deploy-worker.yml` (deck) and
`deploy-dataroom-worker.yml` (data room) both watch this directory, so a shared
change goes live on both within a couple of minutes of the merge. Editing
`dataroom-gate/` alone redeploys only the data room gate. Nothing here is
deployed by hand any more.
