// Page rendering. The markup lives in templates/*.html; this module only passes
// values in through renderTemplate, which escapes them (workers/shared/template.ts).

import { OAUTH_PATH, TOOL_PATH } from "./config.ts";
import type { Card, ContactCard, TimelineEntry } from "./campaigns.ts";
import { MACROS, formatDay } from "./macros.ts";
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

function macroChips(): string {
  return MACROS.map((macro, i) =>
    renderTemplate(macroChipTemplate, {
      id: macro.id,
      label: macro.label,
      input: macro.input,
      placeholder: macro.placeholder ?? "",
      checked: i === 0 ? "checked" : "",
    }),
  ).join("");
}

export function renderCard(
  card: Card,
  position: number,
  total: number,
  csrf: string,
  closedLostReasons: string[],
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
    csrf,
    macros: macroChips(),
    reasons: closedLostReasons
      .map((reason) => renderTemplate(reasonTemplate, { reason }))
      .join(""),
  });
}

export function renderReview(
  cards: Card[],
  session: { csrf: string; email: string },
  closedLostReasons: string[],
): string {
  const body = cards.length
    ? cards
        .map((card, i) =>
          renderCard(
            card,
            i + 1,
            cards.length,
            session.csrf,
            closedLostReasons,
          ),
        )
        .join("")
    : `<p class="empty">Nothing in the Follow Ups view right now.</p>`;
  return layout(
    "LP follow-ups",
    renderTemplate(reviewTemplate, {
      total: cards.length,
      cards: body,
      csrf: session.csrf,
      email: session.email,
      signOutPath: SIGN_OUT_PATH,
      detailPath: DETAIL_PATH,
    }),
  );
}

/** The expanded card's fragment, fetched when it is opened. */
export function renderDetail(
  contacts: ContactCard[],
  entries: TimelineEntry[],
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
  });
}
