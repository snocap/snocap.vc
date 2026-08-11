# SNØCAP

<https://snocap.vc>

An Engineering-Led, Deeptech Venture Firm

## Scripts

Everything in `scripts/`. The `npm run` column lists the alias where one exists;
the rest are run directly.

| Script                     | `npm run`                            | What it does                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-charts.mjs`      | `generate:charts` (part of `build`)  | Renders each `src/data/seattle-investors/*.mmd` diagram to an inlined SVG via headless Chrome + mermaid, plus a branded OG share image. Skips gracefully if Chrome can't launch.                                                                                                                                  |
| `generate-sectors.mjs`     | `generate:sectors` (part of `build`) | Pulls the "Sectors" multi-select options from the Airtable Applications table into `src/data/sectors.ts`, which powers the `/apply` form's `<datalist>`. No-ops (keeps the committed file) without `AIRTABLE_TOKEN`.                                                                                              |
| `optimize-deck-images.mjs` | `optimize-deck`                      | Post-build pass over `dist/deck/`: caps images at 1920px (the deck canvas) and picks a codec per image — JPEG for opaque photographs, WebP for photographs that need alpha, palette PNG for flat art — rewriting references inside `dist/deck` when the extension changes. Only touches `dist/`, never `public/`. |
| `generate-pdf.mjs`         | `pdf` (with `compress-pdf.mjs`)      | Serves the built `dist/` and prints the `/deck` route to `deck.pdf` in headless Chrome using the deck's `@media print` styles.                                                                                                                                                                                    |
| `compress-pdf.mjs`         | `pdf` (after `generate-pdf.mjs`)     | Re-encodes the images Chrome embeds in `deck.pdf`. Chrome rasterises every composited slide layer losslessly at 300 DPI, which alone made this deck a 35MB PDF; ghostscript downsamples each image to the density it is displayed at (96 DPI = 1:1 on the 1920x1080 page) and JPEGs it, for ~3MB. Needs `gs`.     |
| `check-deck-budget.mjs`    | `check:deck`                         | Size guard, run in CI after `npm run pdf`: fails the build if `deck.pdf`, any single asset, the `/deck` page load, or the total deck image weight goes over budget. Every budget is env-overridable — see the header.                                                                                             |
| `pull-deck.sh`             | —                                    | Pulls an updated fundraising deck from a Claude Design handoff bundle (browser-minted token → gzip tar) and copies the deck files into `public/deck/`. See the header comment for how to mint a fresh token.                                                                                                      |
| `verify-deck-assets.mjs`   | `verify-deck`                        | Integrity gate for deck images. Flags any image in `public/deck` (or a dir passed as argv) that is exactly 262144 bytes (DesignSync's silent-truncation boundary) or fails a full `sharp` decode, and exits non-zero. Runs in CI before the build so truncated/corrupt images never ship.                         |

### The deck pipeline

`public/deck/` holds the deck exactly as `pull-deck.sh` pulled it from Claude
Design — pristine, and never optimized in place, because the next pull would
clobber any hand-editing. Everything that makes the deck small happens on the
way to `dist/`, in this order:

```
npm run verify-deck    # pulled assets decode cleanly
npm run build          # astro copies public/deck → dist/deck
npm run optimize-deck  # cap at 1920px, pick a codec per image
npm run pdf            # print to PDF, then re-encode its images
npm run check:deck     # fail if anything is over budget
```

## TODO

- [ ] CI/CD
- [ ] Mobile Mode
- [ ] Write through to the translation files when translations are missing in dev mode...
- [ ] Add warnings when translations are missing
- [ ] Copy review for the founders section
- [ ] Better transitions for slideshow? automatically move between them?
- [ ] Captions for the ecosystem images? Slideshow in a slideshow?
- [ ] Intercept redirects for smooth scrolling
- [ ] Get why-we-invested blog posts live so we can link out
- [ ] Full Apply page
