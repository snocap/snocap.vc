# Deck sync — hybrid flow

The deck is authored in Claude Design (project `019dea98-5a96-714f-83d2-4067d2999030`)
and mirrored into `public/deck/` in this repo. There are two ways to pull an update
down; use the lighter one when you can.

## Headless first: DesignSync for text and code

Slide layout, copy, CSS, and JS live in small files. Pull those with the DesignSync
(`/design`) integration over the existing claude.ai login — no browser, no token.
This covers the common edit (a number change on a slide, a copy tweak, a layout
fix).

**Never re-pull images through DesignSync.** Its `get_file` caps every file at
256 KiB (exactly 262144 bytes) and truncates anything larger **silently** — no error,
just a short file that then gets committed as a corrupt image. `list_files` exposes
no size and no hash, so there is nothing to size-check or checksum-match before
pulling. The deck's images are the full-res source (47 of ~102 are over 256 KiB), so
they stay in git at full resolution and are optimized in place at build time by
`optimize-deck-images.mjs`. A headless pull touches code and copy only.

## After any pull: verify

```bash
node scripts/verify-deck-assets.mjs        # defaults to public/deck
```

This is the integrity gate. Since there is no server-provided checksum, it leans on
the image's own format validity instead: it flags any asset that is exactly 262144
bytes (the truncation boundary) or that fails a full sharp decode (a truncated
PNG/JPEG cannot decode — the incomplete chunk/scan CRC is the check). It exits
non-zero if anything is flagged, so it can gate a sync script or CI step.

## When images actually change: browser-minted tar

If a slide edit adds or replaces an image, the headless path cannot carry it and
`verify-deck-assets.mjs` will flag the truncated result. For that update, fall back
to the full handoff bundle, which returns every asset untruncated:

```bash
./scripts/pull-deck.sh <handoff-token>
```

Minting that token needs a real browser session (Cloudflare gates the mint RPC), so
it is the one step that still needs a browser. Keep it for image-bearing updates
only; everything else stays headless.
