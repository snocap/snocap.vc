// Who can be @-mentioned in a comment, and how a typed mention reaches Airtable.
//
// The base-collaborators endpoint is Enterprise-only, so the list is built from
// the collaborators the user's own token already sees: the Representative and
// Created By values on the loaded Campaigns, the collaborator field's schema
// choices when Airtable returns any, and the authors and mentions in comment
// threads. KB is always on it. The page caches the merged list for the browser
// session and grows it as threads load.
//
// In the box a mention is a visible `@Name`; on submit the page sends the people
// it inserted alongside the text, and serializeComment turns each `@Name` still
// present into Airtable's `@[usr…]`, which notifies that person.

import type { AirtableComment, AirtableRecord } from "./airtable.ts";
import { AIRTABLE } from "./config.ts";

export interface Person {
  id: string;
  name: string;
}

export const KB: Person = { id: AIRTABLE.kbUserId, name: "KB" };

const USER_ID = /^usr[A-Za-z0-9]{14}$/;

/** A collaborator-shaped value ({id, name, email}) → a Person, or null. */
export function personOf(value: unknown): Person | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { id?: unknown; name?: unknown; email?: unknown };
  if (typeof v.id !== "string" || !USER_ID.test(v.id)) return null;
  const name =
    (typeof v.name === "string" && v.name.trim()) ||
    (typeof v.email === "string" && v.email.trim()) ||
    "";
  return name ? { id: v.id, name } : null;
}

function peopleOf(value: unknown): Person[] {
  const list = Array.isArray(value) ? value : [value];
  return list.map(personOf).filter((p): p is Person => p !== null);
}

/** Collaborators in the named fields of each record (single or multiple). */
export function recordPeople(
  records: AirtableRecord[],
  fields: string[],
): Person[] {
  return records.flatMap((r) => fields.flatMap((f) => peopleOf(r.fields[f])));
}

/** A collaborator field's schema choices, when Airtable lists any. */
export function choicePeople(options: unknown): Person[] {
  const choices = (options as { choices?: unknown } | undefined)?.choices;
  return Array.isArray(choices) ? peopleOf(choices) : [];
}

/** Comment authors and the users their text mentions. */
export function commentPeople(comments: AirtableComment[]): Person[] {
  return comments.flatMap((c) => [
    ...peopleOf(c.author),
    ...Object.values(c.mentioned ?? {})
      .filter((m) => m.type === "user")
      .map((m) => personOf({ id: m.id, name: m.displayName, email: m.email }))
      .filter((p): p is Person => p !== null),
  ]);
}

/** One entry per user id: KB first under its own name, the rest by name. */
export function mergePeople(...sources: Person[][]): Person[] {
  const byId = new Map<string, Person>();
  for (const person of sources.flat()) {
    if (person.id !== KB.id && !byId.has(person.id))
      byId.set(person.id, person);
  }
  const rest = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  return [KB, ...rest];
}

/** The people the page says it inserted, from the form's JSON; junk is dropped. */
export function parseMentions(raw: unknown): Person[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? peopleOf(parsed) : [];
  } catch {
    return [];
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The typed text with every `@Name` of an inserted person as `@[usr…]`. A
 * token the user edited into something else stays the plain text it now is.
 * Longer names go first, so `@Jon Azoff` is not taken as `@Jon` + " Azoff". */
export function serializeComment(text: string, mentions: Person[]): string {
  const people = [...mentions].sort((a, b) => b.name.length - a.name.length);
  let out = text;
  for (const person of people) {
    const token = new RegExp(`@${escapeRegExp(person.name)}(?![\\w-])`, "g");
    out = out.replace(token, `@[${person.id}]`);
  }
  return out;
}

export function mentionsUser(serialized: string, id: string): boolean {
  return serialized.includes(`@[${id}]`);
}
