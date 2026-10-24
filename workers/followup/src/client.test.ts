// The page's pure rules: search, the restored position, the pick-list
// highlight, macro replace-or-append, the button label, photo intake, and the
// desktop row's window. Also that the copy the page actually runs (pages.ts
// clientScript) is these same functions.
import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import {
  acceptFiles,
  applyMacro,
  buttonLabel,
  carouselSlots,
  moveHighlight,
  restoreIndex,
  shrinkable,
  searchDeck,
  shrinkScale,
  visibleCount,
} from "./client.ts";
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

const IDS = ["recA", "recB", "recC", "recD"];

test("a reload reopens the remembered Campaign wherever it now sits", () => {
  assert.equal(restoreIndex(IDS, { id: "recC", index: 0 }), 2);
});

test("a Campaign that left the view opens whatever sits at its old index, clamped", () => {
  assert.equal(restoreIndex(IDS, { id: "recGone", index: 1 }), 1);
  assert.equal(restoreIndex(IDS, { id: "recGone", index: 9 }), 3);
  assert.equal(restoreIndex(IDS, { id: "recGone", index: -2 }), 0);
});

test("no or malformed memory opens the first card", () => {
  assert.equal(restoreIndex(IDS, null), 0);
  assert.equal(restoreIndex(IDS, { index: "x" }), 0);
  assert.equal(restoreIndex([], { id: "recA", index: 0 }), 0);
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

test("the button says Post comment or Mark handled, never a date", () => {
  assert.equal(buttonLabel(""), "Mark handled");
  assert.equal(buttonLabel(" \n "), "Mark handled");
  assert.equal(buttonLabel("hi"), "Post comment");
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
    `${script}\nthis.out = { search: searchDeck(deck, "cafe"), slots: carouselSlots(0, 4, 3), label: buttonLabel("x") };`,
    Object.assign(context, { deck: DECK }),
  );
  assert.deepEqual(JSON.parse(JSON.stringify(context.out)), {
    search: [2],
    slots: [-1, 0, 1],
    label: "Post comment",
  });
});
