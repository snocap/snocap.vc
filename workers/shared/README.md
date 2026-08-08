# workers/shared

Code used by both gate workers, `deck-gate` (`snocap.vc/deck*`) and
`dealroom-gate` (`snocap.vc/dealroom*`). They are the same idea — collect an
email, check an access code, set a signed cookie, log the viewer to D1 — with
different policies on top.

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

|             | deck-gate                      | dealroom-gate                                      |
| ----------- | ------------------------------ | -------------------------------------------------- |
| Access code | one shared `DECK_PASSWORD`     | derived per (email, ref) from a secret             |
| Ref bypass  | yes — a ref skips the code     | no — the cookie is the only way in                 |
| Cookie      | `snocap_viewer`, 30d, `Path=/` | `dealroom_viewer`, 24h, `Path=/dealroom`, HttpOnly |
| D1          | `deck-viewers`                 | `dealroom-viewers`                                 |

Nothing about routes, bindings, secrets or migrations is shared. Each worker
declares its own in its `wrangler.toml`.

## Working on it

```bash
npm test          # from the repo root: node --test over workers/**/*.test.ts
```

The tests need no dependencies. Node runs the TypeScript directly (type
stripping, built in since 22.18), which is also what lets
`dealroom-gate/scripts/derive-password.mjs` call the worker's own
`derivePassword` instead of keeping a second copy of the formula.

Imports carry the `.ts` extension so Node can resolve them; wrangler bundles
with esbuild, which resolves them the same way.

**Editing anything here redeploys `deck-gate`** — `.github/workflows/deploy-worker.yml`
watches this directory. `dealroom-gate` has no deploy workflow and is deployed
by hand.
