// Each macro's prefill: the text it puts in the comment box and the people
// that text mentions. A macro never posts or writes on its own, and only a
// template that says {@kb} mentions KB.
import assert from "node:assert/strict";
import { test } from "node:test";
import { MACROS, macroById, macroEffect } from "./macros.ts";
import type { MacroContext, MacroEffect } from "./macros.ts";
import { KB } from "./mentions.ts";

const NATE = { id: "usrNateNateNate01", name: "Nate" };
const SHRINA = { id: "usrShrinaShrina01", name: "Shrina" };

function prefill(id: string, over: Partial<MacroContext> = {}): MacroEffect {
  const macro = macroById(id);
  assert.ok(macro, `macro ${id} exists`);
  const effect = macroEffect(macro, {
    representative: NATE,
    people: [KB, NATE, SHRINA],
    ...over,
  });
  assert.ok(effect, `macro ${id} applies`);
  return effect;
}

test("the registry is data: unique ids, a label and a template per entry", () => {
  const ids = MACROS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [
    "snooze",
    "draft-followup",
    "log-interaction",
    "close-lost",
    "ping-rep",
  ]);
  for (const macro of MACROS) {
    assert.ok(macro.label && macro.template, macro.id);
    assert.deepEqual(
      Object.keys(macro).sort(),
      ["id", "label", "template", ...(macro.reason ? ["reason"] : [])].sort(),
      "a macro has no write or post of its own",
    );
  }
});

test("Snooze to date, Draft follow-up and Log interaction prefill an @KB instruction", () => {
  assert.deepEqual(prefill("snooze"), {
    text: "@KB snooze next touch point to ",
    mentions: [KB],
  });
  assert.deepEqual(prefill("draft-followup"), {
    text: "@KB draft a follow-up email for me to send: ",
    mentions: [KB],
  });
  assert.deepEqual(prefill("log-interaction"), {
    text: "@KB log this interaction: ",
    mentions: [KB],
  });
});

test("Close lost waits for a reason, then fills it in", () => {
  assert.equal(macroById("close-lost")?.reason, true);
  assert.equal(prefill("close-lost").text, "@KB close lost: {reason}");
  assert.deepEqual(prefill("close-lost", { reason: "Market Timing" }), {
    text: "@KB close lost: Market Timing",
    mentions: [KB],
  });
});

test("Ping rep mentions the Campaign's Representative, not KB", () => {
  assert.deepEqual(prefill("ping-rep"), {
    text: "@Nate any update here?",
    mentions: [NATE],
  });
  assert.deepEqual(prefill("ping-rep", { representative: SHRINA }).mentions, [
    SHRINA,
  ]);
  const macro = macroById("ping-rep");
  assert.ok(macro);
  assert.equal(
    macroEffect(macro, { representative: null, people: [KB] }),
    null,
    "no Representative, no Ping rep chip",
  );
});

test("a template can mention anyone on the list by user id", () => {
  const effect = macroEffect(
    { id: "x", label: "Ask Shrina", template: `{@${SHRINA.id}} thoughts?` },
    { representative: null, people: [KB, SHRINA] },
  );
  assert.deepEqual(effect, { text: "@Shrina thoughts?", mentions: [SHRINA] });
  assert.equal(
    macroEffect(
      { id: "y", label: "Ask nobody", template: "{@usrNobodyNobody01} hi" },
      { representative: null, people: [KB] },
    ),
    null,
  );
});
