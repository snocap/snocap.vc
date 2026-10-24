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

/** The URL hash for a shown card: the one record of which Campaign is open,
 * so it is visible in the address bar and shareable. Not an element id, so
 * the browser never scroll-jumps to it on load. */
export function hashForCard(id: string): string {
  return "#/" + encodeURIComponent(id);
}

/** The Campaign a URL hash names, or null if it names none: the current
 * `#/<id>` form, the legacy `#c-<id>` form an old bookmark may still carry,
 * or anything else (no hash, junk). */
export function cardIdFromHash(hash: string): string | null {
  const m = /^#\/(.+)$/.exec(hash) ?? /^#c-(.+)$/.exec(hash);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]) || null;
  } catch {
    return null;
  }
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

/** Whether there is anything to post: the button stays disabled while the
 * box is empty and nothing is attached, since a submit only ever posts. */
export function canPost(text: string, files: number): boolean {
  return text.trim() !== "" || files > 0;
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

/** One line of a streamed submit: a phase as it starts, or, last, the
 * outcome (`done`). */
export interface SubmitEvent {
  phase?: "upload" | "comment";
  n?: number;
  of?: number;
  done?: boolean;
  ok?: boolean;
  message?: string;
  reason?: string;
}

/** Reads a streamed submit's NDJSON body, handing each phase to `onEvent`,
 * and resolves with the closing outcome line. A body that ends without one
 * was cut off, which throws. */
export async function readSubmit(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SubmitEvent) => void,
): Promise<SubmitEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffered += decoder.decode(value, { stream: !done });
    const lines = buffered.split("\n");
    buffered = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (!line.trim()) continue;
      const event: SubmitEvent = JSON.parse(line);
      if (event.done) return event;
      onEvent(event);
    }
    if (done) throw new Error("The submit ended without an outcome.");
  }
}

/** What the page lends a submit: its attachments, the button and the inputs
 * around it, and the two network-facing steps. */
export interface SubmitIO<F extends { name: string; size: number }> {
  files: F[];
  maxBytes: number;
  /** Disables the button and freezes the box, macros, reasons, attachments
   * and mention list; `false` gives them back as they were. */
  lock(busy: boolean): void;
  label(text: string): void;
  /** The longer error under the button; "" clears it. */
  detail(text: string): void;
  /** The file as it will be sent: an oversized photo re-encoded smaller. */
  prepare(file: F): Promise<F>;
  send(files: F[], onEvent: (event: SubmitEvent) => void): Promise<SubmitEvent>;
  /** Clears the card and moves on; called once the button reads its ✓. */
  posted(): void;
}

/** One press of the submit button. The controls lock at once, so a second
 * press cannot double-post, and the button's label follows the steps the
 * Worker reports as it takes them. A failure gives every control back with
 * the typed text and attachments untouched, the reason in the button and the
 * full sentence under it, and the deck stays on this card. */
export async function submitFlow<F extends { name: string; size: number }>(
  io: SubmitIO<F>,
): Promise<boolean> {
  io.lock(true);
  io.detail("");
  const fail = (reason: string, detail: string): boolean => {
    io.lock(false);
    io.label(`Failed: ${reason}, tap to retry`);
    io.detail(detail);
    return false;
  };
  const total = io.files.length;
  const limit = `${Math.round(io.maxBytes / 1048576)} MB`;
  try {
    const files: F[] = [];
    for (const [i, original] of io.files.entries()) {
      if (original.size > io.maxBytes) {
        io.label(`Shrinking ${i + 1} of ${total}…`);
      }
      const file = await io.prepare(original);
      if (file.size > io.maxBytes) {
        return fail(
          `file over ${limit}`,
          `${file.name || "A file"} is still over Airtable's ${limit} limit. Remove it or use a smaller one.`,
        );
      }
      files.push(file);
    }
    io.label(total ? `Uploading 1 of ${total}…` : "Posting comment…");
    const outcome = await io.send(files, (event) => {
      if (event.phase === "upload") {
        io.label(`Uploading ${event.n} of ${event.of}…`);
      } else if (event.phase === "comment") {
        io.label("Posting comment…");
      }
    });
    if (!outcome.ok) {
      return fail(
        outcome.reason || "not saved",
        outcome.message || "That did not go through. Try again.",
      );
    }
  } catch {
    return fail("network error", "That did not go through. Try again.");
  }
  io.label("Posted ✓");
  io.posted();
  return true;
}
