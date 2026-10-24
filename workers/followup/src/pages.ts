// Page rendering. The markup lives in templates/*.html; this module only passes
// values in through renderTemplate, which escapes them (workers/shared/template.ts).

import { ATTACHMENT_LIMITS, OAUTH_PATH, TOOL_PATH } from "./config.ts";
import type { Card, ContactCard, TimelineEntry } from "./campaigns.ts";
import * as client from "./client.ts";
import type { SearchEntry } from "./client.ts";
import { formatDay } from "./dates.ts";
import { MACROS, macroEffect } from "./macros.ts";
import type { Person } from "./mentions.ts";
import { renderTemplate } from "../../shared/template.ts";
import cardTemplate from "./templates/card.html";
import contactLinkTemplate from "./templates/contact-link.html";
import contactTemplate from "./templates/contact.html";
import detailTemplate from "./templates/detail.html";
import layoutTemplate from "./templates/layout.html";
import linkButtonTemplate from "./templates/link-button.html";
import macroChipTemplate from "./templates/macro-chip.html";
import noticeTemplate from "./templates/notice.html";
import reasonTemplate from "./templates/reason.html";
import reviewTemplate from "./templates/review.html";
import timelineEntryTemplate from "./templates/timeline-entry.html";

export const SIGN_OUT_PATH = `${TOOL_PATH}/signout`;
export const ACTION_PATH = `${TOOL_PATH}/action`;
export const DETAIL_PATH = `${TOOL_PATH}/campaign`;

function layout(title: string, body: string): string {
  return renderTemplate(layoutTemplate, { title, body });
}

function button(href: string, label: string): string {
  return renderTemplate(linkButtonTemplate, { href, label });
}

function notice(heading: string, message: string, action = ""): string {
  return layout(
    `${heading} · LP follow-ups`,
    renderTemplate(noticeTemplate, { heading, message, action }),
  );
}

export function renderUnconfigured(): string {
  return notice(
    "Not configured yet",
    "The Airtable sign-in for this tool has not been set up. Once its OAuth client and session secret are in place, this page becomes the review deck.",
  );
}

export function renderSignIn(message?: string): string {
  return notice(
    "Sign in with Airtable",
    message ??
      "Review the Campaign Tracker's follow-ups. Everything here is read and written with your own Airtable account.",
    button(`${OAUTH_PATH}/start`, "Sign in with Airtable"),
  );
}

export function renderNoAccess(email: string): string {
  return notice(
    "No access",
    `Your Airtable account${email ? ` (${email})` : ""} cannot open the Campaign Tracker, so there is nothing to show here.`,
    button(`${OAUTH_PATH}/start`, "Try another account"),
  );
}

export function renderError(message: string): string {
  return notice("Something went wrong", message, button(TOOL_PATH, "Reload"));
}

function macroChips(card: Card, people: Person[]): string {
  return MACROS.map((macro) => {
    const effect = macroEffect(macro, {
      representative: card.rep,
      people,
    });
    if (!effect) return "";
    return renderTemplate(macroChipTemplate, {
      id: macro.id,
      label: macro.label,
      text: effect.text,
      mentions: JSON.stringify(effect.mentions),
      reason: macro.reason ? "1" : "",
    });
  }).join("");
}

export interface DeckContext {
  csrf: string;
  closedLostReasons: string[];
  people: Person[];
}

/** The page's pure helpers (client.ts), each as its own source text so the
 * browser runs the exact functions the tests cover. `__name` is the no-op
 * esbuild's keepNames (on in wrangler) wraps nested functions with. */
export function clientScript(): string {
  const helpers = Object.entries(client)
    .filter(([, value]) => typeof value === "function")
    .map(([name, fn]) => `const ${name} = ${String(fn)};`)
    .join("\n");
  return `<script>\nvar __name = (fn) => fn;\n${helpers}\n</script>`;
}

/** What search matches a card on. */
export function searchEntry(card: Card): SearchEntry {
  return {
    name: card.name,
    lp: card.lp,
    contacts: card.contacts,
    rep: card.representative,
  };
}

export function renderCard(
  card: Card,
  position: number,
  total: number,
  deck: DeckContext,
): string {
  const latest = card.latest
    ? `Last: ${card.latest.at ? formatDay(card.latest.at) : "undated"} · ${[card.latest.channel, card.latest.summary].filter(Boolean).join(" · ")}`
    : "No interactions logged yet.";
  return renderTemplate(cardTemplate, {
    id: card.id,
    position,
    total,
    name: card.name,
    lp: card.lp || "No Limited Partner linked",
    dealStatus: card.dealStatus || "No status",
    value: card.value || "—",
    probability: card.probability || "—",
    representative: card.representative || "—",
    nextTouch: card.nextTouchLabel,
    touchClass: card.overdue ? "overdue" : "",
    latest,
    actionPath: ACTION_PATH,
    csrf: deck.csrf,
    submitLabel: client.buttonLabel(""),
    macros: macroChips(card, deck.people),
    reasons: deck.closedLostReasons
      .map((reason) => renderTemplate(reasonTemplate, { reason }))
      .join(""),
  });
}

export function renderReview(
  cards: Card[],
  session: { email: string; userId: string },
  deck: DeckContext,
): string {
  const body = cards.length
    ? cards
        .map((card, i) => renderCard(card, i + 1, cards.length, deck))
        .join("")
    : `<p class="empty">Nothing in the Follow Ups view right now.</p>`;
  return layout(
    "LP follow-ups",
    renderTemplate(reviewTemplate, {
      total: cards.length,
      cards: body,
      csrf: deck.csrf,
      email: session.email,
      userId: session.userId,
      people: JSON.stringify(deck.people),
      index: JSON.stringify(cards.map(searchEntry)),
      limits: JSON.stringify(ATTACHMENT_LIMITS),
      helpers: clientScript(),
      signOutPath: SIGN_OUT_PATH,
      detailPath: DETAIL_PATH,
    }),
  );
}

/** The expanded card's fragment, fetched when it is opened. */
export function renderDetail(
  contacts: ContactCard[],
  entries: TimelineEntry[],
  people: Person[],
): string {
  const contactHtml = contacts.length
    ? contacts
        .map((c) =>
          renderTemplate(contactTemplate, {
            name: c.name,
            links: c.links
              .map((link) =>
                renderTemplate(contactLinkTemplate, {
                  ...link,
                  // Web links open a tab; sms:/tel:/mailto: hand off to an app.
                  target: link.href.startsWith("http") ? "_blank" : "_self",
                }),
              )
              .join(""),
          }),
        )
        .join("")
    : `<div class="contact">No primary contacts on the Limited Partner.</div>`;
  const entryHtml = entries.length
    ? entries
        .map((e) =>
          renderTemplate(timelineEntryTemplate, {
            kind: e.kind,
            when: e.at ? formatDay(e.at) : "undated",
            who: e.who || "—",
            title: e.title,
            body: e.body,
          }),
        )
        .join("")
    : `<li>No interactions or comments yet.</li>`;
  return renderTemplate(detailTemplate, {
    contacts: contactHtml,
    entries: entryHtml,
    people: JSON.stringify(people),
  });
}
