// Days as Jon reads them: in Pacific time. Next Touch Point is a dateTime, and
// a day is written at 16:00 UTC (8 or 9am Pacific) so it is the same day in
// both zones.

const ZONE = "America/Los_Angeles";
/** Every submit moves the card this far out; a comment that implies another
 * day gets it from KB's comment intake afterwards. */
export const DEFAULT_PUNT_DAYS = 7;

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/** YYYY-MM-DD → "Oct 30", the form the submit button shows. */
export function shortDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

/** Today in Pacific time plus `days`, as YYYY-MM-DD. Calendar arithmetic on the
 * Pacific date, so a DST change in between cannot shift the day. */
export function pacificDayPlus(now: number, days: number): string {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(now))
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function defaultNextTouch(now: number): string {
  return pacificDayPlus(now, DEFAULT_PUNT_DAYS);
}

/** YYYY-MM-DD → the ISO time Next Touch Point is written with. */
export function nextTouchValue(day: string): string {
  return `${day}T16:00:00.000Z`;
}

/** The submit button's label: what pressing it does, with the day it sets. */
export function submitLabel(text: string, day: string): string {
  return `${text.trim() ? "Comment · next touch" : "Mark handled ·"} ${shortDay(day)}`;
}
