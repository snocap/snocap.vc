// The actions on a card. Each macro turns the reviewer's input into a plan — a
// field write made with the user's own token, a comment on the Campaign, or
// both — and index.ts carries the plan out. Adding a macro is one entry in
// MACROS; the page renders its button and inputs from the entry.
//
// A comment that @-mentions KB is an instruction: the base's campaign-comment
// automation delivers every Campaign comment to kernelbot's comment intake,
// which acts on a KB mention and replies in the thread. So the comment is both
// the instruction and its audit trail, and this worker needs no endpoint of its
// own on the kernelbot side.

import { AIRTABLE, FIELD } from "./config.ts";

/** `@[usr…]` is how the REST API writes a mention into a comment's text. */
export function mention(userId: string = AIRTABLE.kbUserId): string {
  return `@[${userId}]`;
}

/** A comment KB will act on. The closing line tells KB (and anyone reading the
 * thread later) where the instruction came from. */
export function kbInstruction(instruction: string): string {
  return `${mention()} ${instruction.trim()}\n\n(Sent from the LP follow-up review.)`;
}

export type MacroInputKind = "text" | "date" | "reasons" | "none";

export interface MacroInput {
  text?: string;
  /** YYYY-MM-DD from a date picker. */
  date?: string;
  reasons?: string[];
}

export interface MacroContext {
  campaignName: string;
  /** The Campaign's Next Touch Point as Airtable returned it, if set. */
  nextTouch: string | null;
  /** The Closed Lost Reason field's live options. */
  closedLostReasons: string[];
  now: number;
  input: MacroInput;
}

export interface MacroPlan {
  fields?: Record<string, unknown>;
  comment?: string;
  /** What the card shows once the plan has been carried out. */
  result: string;
}

export interface Macro {
  id: string;
  label: string;
  /** Which input the card shows for this macro. */
  input: MacroInputKind;
  /** Whether the text box must be filled (it is optional extra context otherwise). */
  textRequired?: boolean;
  placeholder?: string;
  plan(ctx: MacroContext): MacroPlan | { error: string };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** A picked date lands at 16:00 UTC: 8 or 9am in Pacific time, so the day is the
 * same one Jon picked in both zones. */
const DATE_TIME_UTC = "T16:00:00.000Z";

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function withNote(sentence: string, text?: string): string {
  const note = text?.trim();
  return note ? `${sentence} ${note}` : sentence;
}

/** Valid YYYY-MM-DD → the ISO time the field is written with; else null. */
export function pickedDate(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const iso = `${value}${DATE_TIME_UTC}`;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  // Date.parse rolls 2026-02-31 over into March; refuse that instead.
  return new Date(time).toISOString().slice(0, 10) === value ? iso : null;
}

export const MACROS: Macro[] = [
  {
    id: "instruct",
    label: "Ask KB",
    input: "text",
    textRequired: true,
    placeholder: "Tell KB what to do next on this Campaign…",
    plan: ({ input }) => {
      const text = input.text?.trim();
      if (!text) return { error: "Write the instruction first." };
      return {
        comment: kbInstruction(text),
        result: "Sent to KB as a comment. KB replies in the thread.",
      };
    },
  },
  {
    id: "punt-week",
    label: "Punt 1 week",
    input: "text",
    placeholder: "Optional note",
    plan: ({ nextTouch, now, input }) => {
      // A week from the later of the current touch point and now: punting an
      // overdue Campaign a week from its old date would leave it overdue.
      const current = nextTouch ? Date.parse(nextTouch) : NaN;
      const from = Number.isNaN(current) ? now : Math.max(current, now);
      const next = new Date(from + 7 * DAY_MS).toISOString();
      const day = formatDay(next);
      return {
        fields: { [FIELD.nextTouch]: next },
        comment: withNote(
          `Punted a week: Next Touch Point is now ${day}.`,
          input.text,
        ),
        result: `Next Touch Point moved to ${day}.`,
      };
    },
  },
  {
    id: "snooze",
    label: "Snooze to date",
    input: "date",
    placeholder: "Optional note",
    plan: ({ input }) => {
      const iso = pickedDate(input.date);
      if (!iso) return { error: "Pick a date." };
      const day = formatDay(iso);
      return {
        fields: { [FIELD.nextTouch]: iso },
        comment: withNote(
          `Snoozed: Next Touch Point is now ${day}.`,
          input.text,
        ),
        result: `Next Touch Point set to ${day}.`,
      };
    },
  },
  {
    id: "draft-followup",
    label: "Draft follow-up",
    input: "text",
    placeholder: "Optional: what the email should say",
    plan: ({ input }) => ({
      comment: kbInstruction(
        withNote(
          "Draft a follow-up email to this Campaign's primary contact for Jon to send. Save it as a draft; do not send it.",
          input.text,
        ),
      ),
      result:
        "Asked KB for a draft. It will reply in the thread when it is ready.",
    }),
  },
  {
    id: "log-interaction",
    label: "Log interaction",
    input: "text",
    textRequired: true,
    placeholder: "What happened, when, and how (call, email, coffee…)",
    plan: ({ input }) => {
      const text = input.text?.trim();
      if (!text) return { error: "Describe the interaction first." };
      return {
        comment: kbInstruction(`Log this as an Interaction: ${text}`),
        result: "Sent to KB to log as an Interaction.",
      };
    },
  },
  {
    id: "close-lost",
    label: "Close lost",
    input: "reasons",
    placeholder: "Optional note",
    plan: ({ input, closedLostReasons }) => {
      const reasons = (input.reasons ?? []).filter((r) =>
        closedLostReasons.includes(r),
      );
      if (reasons.length === 0) return { error: "Pick a Closed Lost Reason." };
      const listed = reasons.join(", ");
      return {
        fields: { [FIELD.closedLostReason]: reasons },
        comment: kbInstruction(
          withNote(
            `Close this Campaign as lost: set Deal Status to 11.0 - Closed Lost. Reason: ${listed}.`,
            input.text,
          ),
        ),
        result: `Reason set to ${listed}. KB is closing it.`,
      };
    },
  },
];

export function macroById(id: string): Macro | undefined {
  return MACROS.find((m) => m.id === id);
}
