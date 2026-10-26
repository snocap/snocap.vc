// The page's pure rules: search, the shown card's URL hash, the pick-list
// highlight, macro replace-or-append, the button label, photo intake, and the
// desktop row's window, and the submit button's states. Also that the copy the page actually runs (pages.ts
// clientScript) is these same functions.
import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import {
  acceptFiles,
  canPost,
  applyMacro,
  carouselSlots,
  cardIdFromHash,
  hashForCard,
  moveHighlight,
  readSubmit,
  shrinkable,
  searchDeck,
  shrinkScale,
  submitFlow,
  visibleCount,
} from "./client.ts";
import type { SubmitEvent } from "./client.ts";
import { clientScript } from "./pages.ts";

const DECK = [
  {
    name: "Zeta Partners",
    lp: "Zeta LP",
    contacts: ["Zoë Ångström"],
    rep: "Nate Salpeter",
  },
  {
    name: "Alpha Family Office",
    lp: "Alpha Holdings",
    contacts: ["Ann Lee"],
    rep: "",
  },
  {
    name: "SNØCAP Friends",
    lp: "Café Crème Trust",
    contacts: [],
    rep: "Shrina Kurani",
  },
  {
    name: "Alpine Endowment",
    lp: "",
    contacts: ["Bob Stone"],
    rep: "Nate Salpeter",
  },
];

test("search matches Campaign, LP, contact and rep names", () => {
  assert.deepEqual(searchDeck(DECK, "zeta"), [0]);
  assert.deepEqual(searchDeck(DECK, "holdings"), [1]);
  assert.deepEqual(searchDeck(DECK, "bob"), [3]);
  assert.deepEqual(searchDeck(DECK, "shrina"), [2]);
});

test("search is case- and accent-insensitive", () => {
  assert.deepEqual(searchDeck(DECK, "ZOE"), [0]);
  assert.deepEqual(searchDeck(DECK, "angstrom"), [0]);
  assert.deepEqual(searchDeck(DECK, "cafe creme"), [2]);
  assert.deepEqual(searchDeck(DECK, "snocap"), [2]);
});

test("search keeps deck order, needs every word, and matches word starts", () => {
  assert.deepEqual(searchDeck(DECK, "al"), [1, 3]);
  assert.deepEqual(searchDeck(DECK, "nate alpine"), [3]);
  assert.deepEqual(searchDeck(DECK, "eta"), [], "not mid-word");
  assert.deepEqual(searchDeck(DECK, "   "), []);
  assert.deepEqual(searchDeck(DECK, "a", 2).length, 2, "capped at the limit");
});

test("a card's hash is its id under a slash, URL-encoded", () => {
  assert.equal(hashForCard("recA"), "#/recA");
  assert.equal(hashForCard("rec/weird id"), "#/rec%2Fweird%20id");
});

test("the new hash form parses back to the id", () => {
  assert.equal(cardIdFromHash("#/recA"), "recA");
  assert.equal(cardIdFromHash("#/rec%2Fweird%20id"), "rec/weird id");
});

test("no hash or junk parses to null", () => {
  assert.equal(cardIdFromHash(""), null);
  assert.equal(cardIdFromHash("#"), null);
  assert.equal(cardIdFromHash("#/"), null);
  assert.equal(cardIdFromHash("#nonsense"), null);
  assert.equal(cardIdFromHash("#c-recA"), null, "the element-id form too");
  assert.equal(cardIdFromHash("#/%"), null, "an undecodable hash is junk too");
});

test("arrow keys move the highlight and wrap", () => {
  assert.equal(moveHighlight(-1, 3, 1), 0);
  assert.equal(moveHighlight(-1, 3, -1), 2);
  assert.equal(moveHighlight(0, 3, 1), 1);
  assert.equal(moveHighlight(2, 3, 1), 0);
  assert.equal(moveHighlight(0, 3, -1), 2);
  assert.equal(moveHighlight(0, 0, 1), -1);
});

test("a macro replaces an empty box or one only a macro has filled", () => {
  assert.equal(applyMacro("", null, "@KB snooze to "), "@KB snooze to ");
  assert.equal(applyMacro("  \n", null, "@KB snooze to "), "@KB snooze to ");
  assert.equal(
    applyMacro("@KB snooze to ", "@KB snooze to ", "@KB log this: "),
    "@KB log this: ",
  );
});

test("a macro appends once the user has typed anything", () => {
  assert.equal(
    applyMacro("they said Q1", null, "@KB snooze to "),
    "they said Q1\n@KB snooze to ",
  );
  assert.equal(
    applyMacro("@KB snooze to Jan 5", "@KB snooze to ", "@KB log this: "),
    "@KB snooze to Jan 5\n@KB log this: ",
  );
});

test("Post comment is disabled while the box is empty and nothing is attached", () => {
  assert.equal(canPost("", 0), false);
  assert.equal(canPost(" \n ", 0), false);
  assert.equal(canPost("hi", 0), true);
  assert.equal(canPost("", 1), true, "attachments alone can be posted");
});

const LIMITS = { maxFiles: 3, maxBytes: 5 * 1048576 };
const MB = 1048576;

test("any file is attached, up to the count, and the page says what it skipped", () => {
  const png = { type: "image/png", name: "a.png", size: MB };
  const pdf = { type: "application/pdf", name: "memo.pdf", size: MB };
  assert.deepEqual(acceptFiles([], [png, pdf, png], LIMITS), {
    keep: [0, 1, 2],
    rejected: [],
  });
  assert.deepEqual(acceptFiles([1, 2], [png, pdf], LIMITS), {
    keep: [0],
    rejected: ["only 3 files per post"],
  });
});

test("an image over 5 MB is kept to be shrunk; any other file over it is refused", () => {
  const bigShot = { type: "image/jpeg", name: "shot.jpg", size: 12 * MB };
  const bigPdf = { type: "application/pdf", name: "deck.pdf", size: 12 * MB };
  const bigSvg = { type: "image/svg+xml", name: "logo.svg", size: 6 * MB };
  assert.deepEqual(acceptFiles([], [bigShot, bigPdf, bigSvg], LIMITS), {
    keep: [0],
    rejected: [
      "deck.pdf is over Airtable's 5 MB limit",
      "logo.svg is over Airtable's 5 MB limit",
    ],
  });
  assert.equal(shrinkable("image/png"), true);
  assert.equal(shrinkable("image/svg+xml"), false);
  assert.equal(shrinkable("application/pdf"), false);
});

test("an oversized image is scaled by area, with a margin, until it fits", () => {
  assert.equal(shrinkScale(4_000_000, 5_000_000), 1);
  const scale = shrinkScale(20_000_000, 5_000_000);
  assert.ok(scale < 0.5 && scale > 0.4, String(scale));
});

test("the row shows an odd number of cards, one on a phone", () => {
  assert.equal(visibleCount(390, 416), 1);
  assert.equal(visibleCount(800, 416), 1);
  assert.equal(visibleCount(1248, 416), 3);
  assert.equal(visibleCount(1412, 416), 3, "1440px less the page padding");
  assert.equal(visibleCount(1700, 416), 3, "four fit, three show");
  assert.equal(visibleCount(2080, 416), 5);
  assert.equal(visibleCount(4000, 416), 5, "capped");
  assert.equal(visibleCount(4000, 416, 6), 5, "an even cap rounds down");
  assert.equal(visibleCount(0, 416), 1);
});

test("the selected card is the center slot, with empty slots past the ends", () => {
  assert.deepEqual(carouselSlots(5, 10, 3), [4, 5, 6]);
  assert.deepEqual(carouselSlots(0, 10, 3), [-1, 0, 1]);
  assert.deepEqual(carouselSlots(9, 10, 3), [8, 9, -1]);
  assert.deepEqual(carouselSlots(0, 10, 5), [-1, -1, 0, 1, 2]);
  assert.deepEqual(carouselSlots(1, 2, 5), [-1, 0, 1, -1, -1]);
  assert.deepEqual(carouselSlots(0, 1, 1), [0]);
});

test("the page's copy of the helpers is these functions, runnable on their own", () => {
  const script = clientScript()
    .replace(/^<script>/, "")
    .replace(/<\/script>$/, "");
  const context: Record<string, unknown> = {};
  runInNewContext(
    `${script}\nthis.out = { search: searchDeck(deck, "cafe"), slots: carouselSlots(0, 4, 3), can: canPost("", 0) };`,
    Object.assign(context, { deck: DECK }),
  );
  assert.deepEqual(JSON.parse(JSON.stringify(context.out)), {
    search: [2],
    slots: [-1, 0, 1],
    can: false,
  });
});

interface FakeFile {
  name: string;
  size: number;
}

/** A card for submitFlow: what it did to the controls, in order, with the
 * Worker's answer scripted. `whileSending` runs mid-request, to look at the
 * card while the submit is in flight. */
function fakeCard(
  opts: {
    files?: FakeFile[];
    events?: SubmitEvent[];
    outcome?: SubmitEvent;
    throws?: boolean;
    prepare?: (file: FakeFile) => FakeFile;
    whileSending?: () => void;
  } = {},
) {
  const log: string[] = [];
  const card = {
    log,
    locked: false,
    labels: [] as string[],
    detail: "",
    sent: null as FakeFile[] | null,
    advanced: false,
  };
  const io = {
    files: opts.files ?? [],
    maxBytes: 5 * MB,
    lock(busy: boolean) {
      card.locked = busy;
      log.push(busy ? "lock" : "unlock");
    },
    label(text: string) {
      card.labels.push(text);
      log.push(text);
    },
    detail(text: string) {
      card.detail = text;
    },
    prepare: async (file: FakeFile) => (opts.prepare ?? ((f) => f))(file),
    async send(files: FakeFile[], onEvent: (e: SubmitEvent) => void) {
      card.sent = files;
      opts.whileSending?.();
      if (opts.throws) throw new TypeError("Failed to fetch");
      for (const event of opts.events ?? []) onEvent(event);
      return opts.outcome ?? { done: true, ok: true, message: "Posted." };
    },
    posted() {
      card.advanced = true;
      log.push("advance");
    },
  };
  return { card, io };
}

test("the button disables the moment it is pressed and stays so while the post is in flight", async () => {
  let midFlight: boolean | null = null;
  const { card, io } = fakeCard({
    whileSending: () => (midFlight = card.locked),
  });
  const run = submitFlow(io);
  assert.equal(card.log[0], "lock", "locked before anything awaits");
  await run;
  assert.equal(midFlight, true);
  assert.equal(card.log.filter((l) => l === "unlock").length, 0);
});

test("the button steps through the real phases with attachments, then advances", async () => {
  const { card, io } = fakeCard({
    files: [
      { name: "a.png", size: MB },
      { name: "b.pdf", size: MB },
    ],
    events: [
      { phase: "upload", n: 1, of: 2 },
      { phase: "upload", n: 2, of: 2 },
      { phase: "comment" },
    ],
  });
  assert.equal(await submitFlow(io), true);
  assert.deepEqual(card.log, [
    "lock",
    "Uploading 1 of 2…",
    "Uploading 1 of 2…",
    "Uploading 2 of 2…",
    "Posting comment…",
    "Posted ✓",
    "advance",
  ]);
});

test("without attachments the button goes straight to posting the comment", async () => {
  const { card, io } = fakeCard({ events: [{ phase: "comment" }] });
  await submitFlow(io);
  assert.deepEqual(card.labels, [
    "Posting comment…",
    "Posting comment…",
    "Posted ✓",
  ]);
});

test("a failure re-enables the button with the reason in it, keeps the inputs, and stays on the card", async () => {
  const files = [{ name: "a.png", size: MB }];
  const { card, io } = fakeCard({
    files,
    events: [{ phase: "upload", n: 1, of: 1 }],
    outcome: {
      done: true,
      ok: false,
      reason: "upload failed",
      message:
        "The attachments did not save, so nothing was posted. Try again.",
    },
  });
  assert.equal(await submitFlow(io), false);
  assert.equal(card.locked, false);
  assert.equal(card.labels.at(-1), "Failed: upload failed, tap to retry");
  assert.match(card.detail, /did not save/);
  assert.equal(card.advanced, false);
  assert.deepEqual(io.files, files, "the attachments are still there");

  const offline = fakeCard({ throws: true });
  assert.equal(await submitFlow(offline.io), false);
  assert.equal(offline.card.locked, false);
  assert.equal(
    offline.card.labels.at(-1),
    "Failed: network error, tap to retry",
  );
  assert.equal(offline.card.advanced, false);
});

test("a photo still over 5 MB after shrinking re-enables the button and sends nothing", async () => {
  const { card, io } = fakeCard({
    files: [{ name: "huge.heic", size: 12 * MB }],
    prepare: (file) => file,
  });
  assert.equal(await submitFlow(io), false);
  assert.equal(card.sent, null, "nothing was posted");
  assert.equal(card.locked, false);
  assert.deepEqual(card.labels, [
    "Shrinking 1 of 1…",
    "Failed: file over 5 MB, tap to retry",
  ]);
  assert.match(card.detail, /huge\.heic is still over Airtable's 5 MB limit/);
  assert.equal(card.advanced, false);
});

test("a shrunk photo goes up in place of the original", async () => {
  const small = { name: "shot.jpg", size: 2 * MB };
  const { card, io } = fakeCard({
    files: [{ name: "shot.png", size: 9 * MB }],
    prepare: () => small,
  });
  await submitFlow(io);
  assert.deepEqual(card.sent, [small]);
});

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

test("a streamed submit is read line by line, even split mid-line, to its outcome", async () => {
  const seen: SubmitEvent[] = [];
  const outcome = await readSubmit(
    streamOf(
      '{"phase":"upload","n":1,"of":1}\n{"pha',
      'se":"comment"}\n',
      '{"done":true,"ok":true,"message":"Done."}\n',
    ),
    (event) => seen.push(event),
  );
  assert.deepEqual(seen, [
    { phase: "upload", n: 1, of: 1 },
    { phase: "comment" },
  ]);
  assert.deepEqual(outcome, { done: true, ok: true, message: "Done." });
});

test("a stream cut off before its outcome is an error", async () => {
  await assert.rejects(
    readSubmit(streamOf('{"phase":"comment"}\n'), () => {}),
    /without an outcome/,
  );
});
