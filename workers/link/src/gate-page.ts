import { renderGatePage as renderShell } from "../../shared/gate-page.ts";

// Private like the data room gate: noindex, no share card. Nobody should ever
// arrive here from a search result.
const HEAD_EXTRA = `  <meta name="robots" content="noindex,nofollow" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="icon" href="/assets/metadata/favicon.svg" type="image/svg+xml" />`;

export function renderGatePage(error?: string): string {
  return renderShell({
    title: "SNØCAP Links",
    headExtra: HEAD_EXTRA,
    subtitle: "Link Shortener",
    prompt: "Sign in to create a short link.",
    action: "/link",
    submitLabel: "Sign In",
    finePrint: "Internal tool. Every link records the address that created it.",
    error,
    requirePassword: true,
  });
}
