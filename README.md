# SNØCAP

<https://snocap.vc>

An Engineering-Led, Deeptech Venture Firm

## Scripts

Everything in `scripts/`. The `npm run` column lists the alias where one exists;
the rest are run directly.

| Script                     | `npm run`                            | What it does                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-charts.mjs`      | `generate:charts` (part of `build`)  | Renders each `src/data/seattle-investors/*.mmd` diagram to an inlined SVG via headless Chrome + mermaid, plus a branded OG share image. Skips gracefully if Chrome can't launch.                                                                                                                               |
| `generate-sectors.mjs`     | `generate:sectors` (part of `build`) | Pulls the "Sectors" multi-select options from the Airtable Applications table into `src/data/sectors.ts`, which powers the `/apply` form's `<datalist>`. No-ops (keeps the committed file) without `AIRTABLE_TOKEN`.                                                                                           |
| `optimize-deck-images.mjs` | `optimize-deck`                      | Post-build pass over `dist/deck/`: resizes images to max 1920px and recompresses JPEG/PNG. Only touches `dist/`, never the `public/` source.                                                                                                                                                                   |
| `generate-pdf.mjs`         | `pdf`                                | Serves the built `dist/` and prints the `/deck` route to `deck.pdf` in headless Chrome using the deck's `@media print` styles.                                                                                                                                                                                 |
| `pull-deck.sh`             | —                                    | Pulls an updated fundraising deck from a Claude Design handoff bundle (browser-minted token → gzip tar) and copies the deck files into `public/deck/`. See the header comment for how to mint a fresh token.                                                                                                   |
| `verify-deck-assets.mjs`   | —                                    | Integrity gate for deck images. Flags any image in `public/deck` (or a dir passed as argv) that is exactly 262144 bytes (DesignSync's silent-truncation boundary) or fails a full `sharp` decode, and exits non-zero. Run it after a headless DesignSync pull so truncated/corrupt images never get committed. |

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
