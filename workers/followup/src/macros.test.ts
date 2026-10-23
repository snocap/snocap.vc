// Each macro's plan is the exact Airtable payload it will send: the fields it
// writes and the comment it posts. KB acts on a comment only when it carries
// KB's mention in the REST form, so that format is pinned here too.
import assert from "node:assert/strict";
import { test } from "node:test";
import { AIRTABLE, FIELD } from "./config.ts";
import {
  MACROS,
  kbInstruction,
  macroById,
  mention,
  pickedDate,
} from "./macros.ts";
import type { MacroContext, MacroInput, MacroPlan } from "./macros.ts";

const NOW = Date.parse("2026-10-23T16:00:00.000Z");
const REASONS = ["Non-Responsive", "Out of Thesis", "Market Timing"];

function plan(
  id: string,
  input: MacroInput = {},
  over: Partial<MacroContext> = {},
) {
  const macro = macroById(id);
  assert.ok(macro, `macro ${id} exists`);
  return macro.plan({
    campaignName: "Acme Family Office",
    nextTouch: null,
    closedLostReasons: REASONS,
    now: NOW,
    input,
    ...over,
  });
}

function ok(result: MacroPlan | { error: string }): MacroPlan {
  assert.ok(!("error" in result), JSON.stringify(result));
  return result as MacroPlan;
}

test("a KB mention is written in the REST comment form with KB's user id", () => {
  assert.equal(AIRTABLE.kbUserId, "usrt57orTxVb75I3W");
  assert.equal(mention(), "@[usrt57orTxVb75I3W]");
  assert.match(
    kbInstruction("  do the thing "),
    /^@\[usrt57orTxVb75I3W\] do the thing\n/,
  );
});

test("the registry has unique ids and ships the starter macros", () => {
  const ids = MACROS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [
    "instruct",
    "punt-week",
    "snooze",
    "draft-followup",
    "log-interaction",
    "close-lost",
  ]);
  assert.equal(MACROS[0].id, "instruct", "free text is the default action");
});

test("Ask KB posts the instruction as a KB-mention comment and writes no field", () => {
  const p = ok(plan("instruct", { text: "Ask Tyler for the IC date" }));
  assert.equal(p.fields, undefined);
  assert.equal(p.comment, kbInstruction("Ask Tyler for the IC date"));
  assert.deepEqual(plan("instruct", { text: "   " }), {
    error: "Write the instruction first.",
  });
});

test("Punt 1 week moves Next Touch Point a week past the later of now and its current value", () => {
  const empty = ok(plan("punt-week"));
  assert.deepEqual(empty.fields, {
    [FIELD.nextTouch]: "2026-10-30T16:00:00.000Z",
  });
  assert.match(
    empty.comment ?? "",
    /^Punted a week: Next Touch Point is now Oct 30, 2026\.$/,
  );
  assert.doesNotMatch(
    empty.comment ?? "",
    /@\[/,
    "the note does not instruct KB",
  );

  const future = ok(
    plan("punt-week", {}, { nextTouch: "2026-11-02T16:00:00.000Z" }),
  );
  assert.deepEqual(future.fields, {
    [FIELD.nextTouch]: "2026-11-09T16:00:00.000Z",
  });

  const overdue = ok(
    plan(
      "punt-week",
      { text: "Out till Monday." },
      { nextTouch: "2026-09-01T16:00:00.000Z" },
    ),
  );
  assert.deepEqual(overdue.fields, {
    [FIELD.nextTouch]: "2026-10-30T16:00:00.000Z",
  });
  assert.match(overdue.comment ?? "", /Out till Monday\.$/);
});

test("Snooze to date writes the picked day and refuses a missing or impossible one", () => {
  const p = ok(plan("snooze", { date: "2026-12-01" }));
  assert.deepEqual(p.fields, { [FIELD.nextTouch]: "2026-12-01T16:00:00.000Z" });
  assert.match(p.comment ?? "", /Dec 1, 2026/);
  assert.deepEqual(plan("snooze", { date: "" }), { error: "Pick a date." });
  assert.equal(pickedDate("2026-02-31"), null);
  assert.equal(pickedDate("12/01/2026"), null);
});

test("Draft follow-up asks KB for a draft and never to send", () => {
  const p = ok(plan("draft-followup", { text: "Mention the Q4 close" }));
  assert.equal(p.fields, undefined);
  assert.match(
    p.comment ?? "",
    /^@\[usrt57orTxVb75I3W\] Draft a follow-up email/,
  );
  assert.match(p.comment ?? "", /do not send it/);
  assert.match(p.comment ?? "", /Mention the Q4 close/);
});

test("Log interaction hands KB the text to log and requires it", () => {
  const p = ok(plan("log-interaction", { text: "Coffee with Tyler today" }));
  assert.equal(
    p.comment,
    kbInstruction("Log this as an Interaction: Coffee with Tyler today"),
  );
  assert.ok("error" in plan("log-interaction", {}));
});

test("Close lost writes only live reasons and instructs KB to set Closed Lost", () => {
  const p = ok(
    plan("close-lost", { reasons: ["Non-Responsive", "Made Up Reason"] }),
  );
  assert.deepEqual(p.fields, { [FIELD.closedLostReason]: ["Non-Responsive"] });
  assert.match(
    p.comment ?? "",
    /^@\[usrt57orTxVb75I3W\] Close this Campaign as lost: set Deal Status to 11\.0 - Closed Lost\. Reason: Non-Responsive\./,
  );
  assert.deepEqual(plan("close-lost", { reasons: ["Made Up Reason"] }), {
    error: "Pick a Closed Lost Reason.",
  });
});
