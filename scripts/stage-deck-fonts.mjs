/**
 * Mirror the brand fonts into dist/deck/fonts/ after a build.
 *
 * The deck's own stylesheet asks for the fonts relatively —
 *
 *   dist/deck/colors_and_type.css:  url("./fonts/NB Akademie Std/...woff2")
 *
 * which resolves to /deck/fonts/..., a directory that has never existed. The
 * canonical copies live at public/assets/fonts/ (site-absolute /assets/fonts/,
 * used by src/styles/fonts.css). So both the live deck AND every generated PDF
 * were silently falling back to system type — on slide 9 the team names collapse
 * into smears at the mono face's -0.04em tracking.
 *
 * Staging into dist/ at build time satisfies the deck's reference without
 * keeping a second copy of the font files under public/deck/ (public/deck/ is
 * the deck's source of truth, edited in place since 2026-11-10; the Claude
 * Design pull that used to overwrite it is retired). If a deck edit ever
 * renames the fonts or moves the reference, scripts/check-deck-budget.mjs fails
 * the build on the unresolved url() rather than shipping fallback type again.
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = `${ROOT}public/assets/fonts`;
const DEST = `${ROOT}dist/deck/fonts`;

if (!existsSync(SRC)) {
  console.error(
    `stage-deck-fonts: ${SRC} is missing — cannot stage deck fonts`,
  );
  process.exit(1);
}
if (!existsSync(`${ROOT}dist/deck`)) {
  console.error("stage-deck-fonts: dist/deck missing — run the build first");
  process.exit(1);
}

await mkdir(DEST, { recursive: true });
await cp(SRC, DEST, { recursive: true });

const families = await readdir(DEST);
console.log(
  `stage-deck-fonts: mirrored ${families.length} font families into dist/deck/fonts (${families.join(", ")})`,
);
