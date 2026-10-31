// Airtable records → what a card shows. Pure: index.ts fetches, these shape, so
// every rule about what a card says is testable without a network.

import { FIELD } from "./config.ts";
import type { AirtableComment, AirtableRecord } from "./airtable.ts";
import { formatDay } from "./dates.ts";
import { personOf } from "./mentions.ts";
import type { Person } from "./mentions.ts";

export interface InteractionLine {
  id: string;
  at: string | null;
  channel: string;
  summary: string;
  who: string;
  details: string;
}

export interface Card {
  id: string;
  name: string;
  lp: string;
  dealStatus: string;
  value: string;
  probability: string;
  representative: string;
  /** The LP's primary contacts' names, for search. */
  contacts: string[];
  /** The Representative as a mention target, for Ping rep. */
  rep: Person | null;
  nextTouch: string | null;
  nextTouchLabel: string;
  overdue: boolean;
  latest: InteractionLine | null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function ids(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function names(value: unknown): string {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((v) =>
      v && typeof v === "object" ? text((v as { name?: unknown }).name) : "",
    )
    .filter(Boolean)
    .join(", ");
}

export function linkedIds(record: AirtableRecord, field: string): string[] {
  return ids(record.fields[field]);
}

/** "2 - High" → "High". The numeric prefix is for sorting, not for reading. */
export function probabilityLabel(value: unknown): string {
  return text(value).replace(/^\d+\s*-\s*/, "");
}

/** Deal Value (K) is in thousands: 250 → "$250K", 1500 → "$1.5M". */
export function valueLabel(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  if (value >= 1000) return `$${Number((value / 1000).toFixed(2))}M`;
  return `$${Number(value.toFixed(1))}K`;
}

export function interactionLine(record: AirtableRecord): InteractionLine {
  const f = record.fields;
  return {
    id: record.id,
    at: text(f[FIELD.occurredOn]) || record.createdTime || null,
    channel: text(f[FIELD.channel]),
    summary: text(f[FIELD.summary]) || "(no summary)",
    who: names(f[FIELD.triggeredBy]),
    details: text(f[FIELD.details]),
  };
}

function time(iso: string | null): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/** The Campaign's most recent touch among the Interactions fetched, by
 * Occurred on. Background rows (KB's research, ingest provenance) are notes
 * about the LP, not a touch, so they never stand in for the last one. */
export function latestInteraction(
  campaign: AirtableRecord,
  interactions: Map<string, InteractionLine>,
): InteractionLine | null {
  let latest: InteractionLine | null = null;
  for (const id of linkedIds(campaign, FIELD.interactions)) {
    const line = interactions.get(id);
    if (!line || line.channel === "Background") continue;
    if (!latest || time(line.at) > time(latest.at)) latest = line;
  }
  return latest;
}

export function cardOf(
  campaign: AirtableRecord,
  lpNames: Map<string, string>,
  interactions: Map<string, InteractionLine>,
  now: number,
  contactNames: Map<string, string[]> = new Map(),
): Card {
  const f = campaign.fields;
  const nextTouch = text(f[FIELD.nextTouch]) || null;
  const lpIds = linkedIds(campaign, FIELD.limitedPartner);
  return {
    id: campaign.id,
    name: text(f[FIELD.campaign]) || "(unnamed Campaign)",
    lp: lpIds
      .map((id) => lpNames.get(id) ?? "")
      .filter(Boolean)
      .join(", "),
    dealStatus: text(f[FIELD.dealStatus]),
    value: valueLabel(f[FIELD.dealValue]),
    probability: probabilityLabel(f[FIELD.probability]),
    representative: names(f[FIELD.representative]),
    contacts: lpIds.flatMap((id) => contactNames.get(id) ?? []),
    rep: personOf(f[FIELD.representative]),
    nextTouch,
    nextTouchLabel: nextTouch ? formatDay(nextTouch) : "Not set",
    overdue: nextTouch !== null && time(nextTouch) < now,
    latest: latestInteraction(campaign, interactions),
  };
}

export interface TimelineEntry {
  kind: "interaction" | "comment";
  at: string;
  who: string;
  title: string;
  body: string;
}

/** `@[usr…]` in a comment's text, rendered as the mentioned person's name. */
export function renderMentions(comment: AirtableComment): string {
  const mentioned = comment.mentioned ?? {};
  return comment.text.replace(/@\[(usr\w+)\]/g, (whole, id: string) => {
    const name = mentioned[id]?.displayName;
    return name ? `@${name}` : whole;
  });
}

/** Interactions and the comment thread on one line, newest first. */
export function timeline(
  interactions: InteractionLine[],
  comments: AirtableComment[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...interactions.map((i) => ({
      kind: "interaction" as const,
      at: i.at ?? "",
      who: i.who,
      title: [i.channel, i.summary].filter(Boolean).join(" · "),
      body: i.details,
    })),
    ...comments.map((c) => ({
      kind: "comment" as const,
      at: c.createdTime,
      who: c.author?.name || c.author?.email || "Someone",
      title: "Comment",
      body: renderMentions(c),
    })),
  ];
  return entries.sort((a, b) => time(b.at) - time(a.at));
}

export interface ContactLink {
  label: string;
  href: string;
}

export interface ContactCard {
  name: string;
  links: ContactLink[];
}

/** A phone number as a tel:/sms: target: digits, with a leading + kept. */
export function phoneTarget(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/** Only an http(s) URL is linked; anything else (javascript:, junk) is dropped. */
export function webUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function contactCard(record: AirtableRecord): ContactCard {
  const f = record.fields;
  const links: ContactLink[] = [];
  const phone = phoneTarget(text(f[FIELD.phone]));
  if (phone) {
    links.push({ label: "Text", href: `sms:${phone}` });
    links.push({ label: "Call", href: `tel:${phone}` });
  }
  const email = text(f[FIELD.email]).trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    links.push({ label: "Email", href: `mailto:${email}` });
  }
  const profile = webUrl(text(f[FIELD.profile]));
  if (profile) {
    links.push({
      label: /linkedin\.com/i.test(profile) ? "LinkedIn" : "Profile",
      href: profile,
    });
  }
  return { name: text(f[FIELD.contactName]) || "(no name)", links };
}
