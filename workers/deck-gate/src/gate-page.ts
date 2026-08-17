import {
  renderGatePage as renderShell,
  renderSuccessPage as renderSuccessShell,
} from "../../shared/gate-page.ts";

// The deck gate is a public, shareable link, so it carries full share-card
// metadata. The deal room gate deliberately does not.
const HEAD_EXTRA = `  <meta name="description" content="View the SNØCAP US II, LP pitch deck. Enter your email to access." />
  <meta property="og:title" content="SNØCAP US II, LP — Pitch Deck" />
  <meta property="og:description" content="View the SNØCAP US II, LP pitch deck. Enter your email to access." />
  <meta property="og:image" content="https://snocap.vc/assets/metadata/card-twitter.gif" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://snocap.vc/deck" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="SNØCAP US II, LP — Pitch Deck" />
  <meta name="twitter:description" content="View the SNØCAP US II, LP pitch deck. Enter your email to access." />
  <meta name="twitter:image" content="https://snocap.vc/assets/metadata/card-twitter.gif" />
  <link rel="canonical" href="https://snocap.vc/deck" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="icon" href="/assets/metadata/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/assets/metadata/icon-apple-180.png" />`;

export function renderGatePage(
  error?: string,
  returnTo?: string,
  ref?: string,
  requirePassword = true,
): string {
  return renderShell({
    title: "SNØCAP US II, LP — Pitch Deck",
    headExtra: HEAD_EXTRA,
    backgroundImage: "https://snocap.vc/deck/assets/hero-mountains.jpg",
    subtitle: "US II, LP — Pitch Deck",
    prompt: "Enter your email to view the deck.",
    action: "/deck",
    submitLabel: "View Deck",
    finePrint: "Your information is kept confidential and will not be shared.",
    error,
    returnTo,
    ref,
    requirePassword,
  });
}

// Shown after a successful submit — password-checked or ref-bypassed alike —
// instead of the old instant redirect, so a viewer on a laptop can hand off
// to their phone via the QR code.
export function renderSuccessPage(continueUrl: string): string {
  return renderSuccessShell({
    title: "SNØCAP US II, LP — Pitch Deck",
    headExtra: HEAD_EXTRA,
    subtitle: "US II, LP — Pitch Deck",
    message: "You're in.",
    continueUrl,
    continueLabel: "View the deck",
  });
}
