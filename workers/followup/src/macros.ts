// The shortcuts on a card. A macro never posts or writes on its own: it fills
// (or appends to) the comment box with an editable template, and Jon edits it
// and presses Comment. Adding a macro is one entry in MACROS; the page renders
// its chip from what macroEffect says the entry does.
//
// A template is comment text, with `{@kb}`, `{@rep}` (the Campaign's
// Representative) or `{@usr…}` (anyone) for a mention and `{reason}` for a
// picked Closed Lost Reason. A comment reaches KB only when it mentions KB:
// the base delivers every Campaign comment to kernelbot's comment intake, which
// acts on a KB mention and only classifies the rest.

import { KB } from "./mentions.ts";
import type { Person } from "./mentions.ts";

export interface Macro {
  id: string;
  label: string;
  template: string;
  /** Pick a Closed Lost Reason before the template fills in. */
  reason?: boolean;
}

export const MACROS: Macro[] = [
  {
    id: "snooze",
    label: "Snooze to date",
    template: "{@kb} snooze next touch point to ",
  },
  {
    id: "draft-followup",
    label: "Draft follow-up",
    template: "{@kb} draft a follow-up email for me to send: ",
  },
  {
    id: "log-interaction",
    label: "Log interaction",
    template: "{@kb} log this interaction: ",
  },
  {
    id: "close-lost",
    label: "Close lost",
    template: "{@kb} close lost: {reason}",
    reason: true,
  },
  { id: "ping-rep", label: "Ping rep", template: "{@rep} any update here?" },
];

export function macroById(id: string): Macro | undefined {
  return MACROS.find((m) => m.id === id);
}

export interface MacroContext {
  representative: Person | null;
  /** Everyone mentionable, for a template that names a user by id. */
  people: Person[];
  reason?: string;
}

export interface MacroEffect {
  /** Comment text with mentions as visible `@Name`. `{reason}` stays in until
   * a reason is picked; the page fills it from its picker. */
  text: string;
  /** The people the text mentions, sent with the comment to serialize them. */
  mentions: Person[];
}

/** What pressing the macro puts in the box, or null when its template mentions
 * someone the Campaign does not have (Ping rep with no Representative). */
export function macroEffect(
  macro: Macro,
  ctx: MacroContext,
): MacroEffect | null {
  const mentions: Person[] = [];
  let missing = false;
  const text = macro.template.replace(
    /\{@(\w+)\}|\{reason\}/g,
    (whole, who?: string) => {
      if (who === undefined) return ctx.reason ?? whole;
      const person =
        who === "kb"
          ? KB
          : who === "rep"
            ? ctx.representative
            : (ctx.people.find((p) => p.id === who) ?? null);
      if (!person) {
        missing = true;
        return whole;
      }
      if (!mentions.some((p) => p.id === person.id)) mentions.push(person);
      return `@${person.name}`;
    },
  );
  return missing ? null : { text, mentions };
}
