// The deck's pure in-page rules, shared by the page script and the tests. The
// page receives each function's own source (pages.ts → clientScript), so every
// function here must be self-contained: no imports, and no call to another
// module-level binding, or the copy in the browser would reference a name that
// is not there.

/** A Campaign as search sees it. */
export interface SearchEntry {
  name: string;
  lp: string;
  contacts: string[];
  rep: string;
}

/** The positions in the deck whose Campaign, LP, contacts or Representative
 * match every word of the query, case- and accent-insensitively, in deck
 * order. A word matches the start of any word in those fields. */
export function searchDeck(
  entries: SearchEntry[],
  query: string,
  limit = 8,
): number[] {
  const fold = (s: string): string =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ø/gi, "o").toLowerCase();
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const found: number[] = [];
  entries.forEach((entry, index) => {
    if (found.length >= limit) return;
    const words = fold(
      [entry.name, entry.lp, ...entry.contacts, entry.rep].join(" "),
    ).split(/[^\p{L}\p{N}]+/u);
    if (terms.every((t) => words.some((w) => w.startsWith(t)))) {
      found.push(index);
    }
  });
  return found;
}

/** Where the deck opens: the remembered Campaign if it is still in the view,
 * otherwise whatever now sits at its old index, clamped to the list. A
 * malformed memory opens the first card. */
export function restoreIndex(
  ids: string[],
  saved: { id?: unknown; index?: unknown } | null,
): number {
  if (ids.length === 0) return 0;
  if (!saved || typeof saved !== "object") return 0;
  const found = typeof saved.id === "string" ? ids.indexOf(saved.id) : -1;
  if (found >= 0) return found;
  const index = Number(saved.index);
  if (!Number.isInteger(index)) return 0;
  return Math.min(Math.max(index, 0), ids.length - 1);
}

/** The highlighted option after an arrow key, wrapping at both ends; -1 means
 * nothing is highlighted yet, so Down lands on the first and Up on the last. */
export function moveHighlight(
  current: number,
  count: number,
  delta: number,
): number {
  if (count <= 0) return -1;
  if (current < 0) return delta > 0 ? 0 : count - 1;
  return (((current + delta) % count) + count) % count;
}

/** The box after a macro: the macro REPLACES the box when it is empty or still
 * holds exactly what the previous macro put there, and is appended on its own
 * line once the user has typed anything. */
export function applyMacro(
  current: string,
  lastMacro: string | null,
  text: string,
): string {
  const untouched =
    current.trim() === "" || (lastMacro !== null && current === lastMacro);
  if (untouched) return text;
  return current.replace(/\s+$/, "") + "\n" + text;
}

/** The submit button's label: what pressing it does. It never shows a date,
 * since the day a submit sets depends on the current value and a comment can
 * move it again. The server renders the first label with this too. */
export function buttonLabel(text: string): string {
  return text.trim() ? "Post comment" : "Mark handled";
}

/** Whether the page can shrink this file by re-encoding it as a JPEG: any
 * raster image the browser can draw. */
export function shrinkable(type: string): boolean {
  return /^image\//.test(type) && type !== "image/svg+xml";
}

/** Which of a batch of picked, pasted or dropped files the page keeps, and why
 * it dropped the rest. Any file Airtable takes is fine; a raster image over
 * the size limit is kept (the page shrinks it before sending), any other file
 * over it is refused. The Worker checks again. */
export function acceptFiles(
  existing: unknown[],
  incoming: { type: string; name: string; size: number }[],
  limits: { maxFiles: number; maxBytes: number },
): { keep: number[]; rejected: string[] } {
  const keep: number[] = [];
  const rejected: string[] = [];
  let count = existing.length;
  incoming.forEach((file, index) => {
    const name = file.name || "A file";
    const image = /^image\//.test(file.type) && file.type !== "image/svg+xml";
    if (file.size > limits.maxBytes && !image) {
      rejected.push(
        `${name} is over Airtable's ${Math.round(limits.maxBytes / 1048576)} MB limit`,
      );
    } else if (count >= limits.maxFiles) {
      rejected.push(`only ${limits.maxFiles} files per post`);
    } else {
      keep.push(index);
      count++;
    }
  });
  return { keep, rejected: [...new Set(rejected)] };
}

/** The scale that brings a w×h photo under `maxBytes` as a JPEG, assuming
 * bytes grow with pixel area. `bytes` is the last encoding's size; the page
 * re-encodes at this scale (with a margin) until the result fits. */
export function shrinkScale(bytes: number, maxBytes: number): number {
  if (bytes <= maxBytes) return 1;
  return Math.sqrt(maxBytes / bytes) * 0.9;
}

/** How many cards fit side by side: as many `slot`-wide cards as the width
 * holds, rounded down to an odd number so there is always a true center, never
 * fewer than one (the phone layout) and never more than `max`. */
export function visibleCount(width: number, slot: number, max = 5): number {
  const fit = Math.max(1, Math.floor(width / slot));
  const cap = max % 2 === 1 ? max : max - 1;
  return Math.max(1, Math.min(fit % 2 === 1 ? fit : fit - 1, cap));
}

/** The deck index shown in each of `visible` slots, with the selected card
 * always in the center slot; -1 is an empty slot past either end of the list,
 * so the selected card stays centered rather than the row shifting. */
export function carouselSlots(
  at: number,
  total: number,
  visible: number,
): number[] {
  const half = Math.floor(visible / 2);
  return Array.from({ length: visible }, (_, slot) => {
    const index = at - half + slot;
    return index >= 0 && index < total ? index : -1;
  });
}
