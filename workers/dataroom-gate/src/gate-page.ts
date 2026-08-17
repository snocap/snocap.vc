import {
  renderGatePage as renderShell,
  renderSuccessPage as renderSuccessShell,
} from "../../shared/gate-page.ts";

// Private by design: no share card, no canonical URL, and noindex — the
// opposite of the deck gate, which is a link people forward.
const HEAD_EXTRA = `  <meta name="robots" content="noindex,nofollow" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="icon" href="/assets/metadata/favicon.svg" type="image/svg+xml" />`;

export function renderGatePage(
  error?: string,
  returnTo?: string,
  ref?: string,
): string {
  return renderShell({
    title: "SNØCAP Fund 2 Data Room",
    headExtra: HEAD_EXTRA,
    subtitle: "Fund 2 Data Room",
    prompt: "Enter your email and access code to view the data room.",
    action: "/dataroom",
    submitLabel: "Enter Data Room",
    finePrint:
      "This data room contains confidential SNØCAP fund materials. Access is logged and your access code is unique to you. Please don't share it.",
    error,
    returnTo,
    ref,
    // Always: the deal room has no ref-based bypass.
    requirePassword: true,
  });
}

// Shown after a successful code submission instead of the old instant
// redirect. The cookie is HttpOnly (see index.ts), so it doesn't carry over
// to a second device — the copy says so up front rather than let someone
// scan the QR and get gated again with no explanation.
export function renderSuccessPage(continueUrl: string): string {
  return renderSuccessShell({
    title: "SNØCAP Fund 2 Data Room",
    headExtra: HEAD_EXTRA,
    subtitle: "Fund 2 Data Room",
    message:
      "You're in. Continuing on another device? You'll need to re-enter your access code there — the session doesn't carry over.",
    continueUrl,
    continueLabel: "Enter the data room",
  });
}
