// Days as Jon reads them: in Pacific time. A dateTime field holding a day is
// written at 16:00 UTC (8 or 9am Pacific) so it is the same day in both zones.

const ZONE = "America/Los_Angeles";

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/** An instant's Pacific date, YYYY-MM-DD. */
export function pacificDay(at: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

/** YYYY-MM-DD → the ISO time a day is written to a dateTime field with. */
export function dayValue(day: string): string {
  return `${day}T16:00:00.000Z`;
}
