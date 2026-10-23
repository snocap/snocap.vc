// What a card says, from the records Airtable returns: the facts line, the
// overdue flag, the latest Interaction, the merged timeline and the contact links.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardOf,
  contactCard,
  interactionLine,
  phoneTarget,
  probabilityLabel,
  timeline,
  valueLabel,
  webUrl,
} from "./campaigns.ts";

const NOW = Date.parse("2026-10-23T16:00:00.000Z");

const interactions = new Map(
  [
    {
      id: "recI1",
      fields: {
        Summary: "Intro call",
        Channel: "Phone Call",
        "Occurred on": "2026-09-01T17:00:00.000Z",
      },
    },
    {
      id: "recI2",
      fields: {
        Summary: "Sent deck",
        Channel: "Email",
        "Occurred on": "2026-10-10T17:00:00.000Z",
      },
    },
  ].map((r) => [r.id, interactionLine(r)]),
);

test("a card carries the Campaign's facts, the LP's name and the latest Interaction", () => {
  const card = cardOf(
    {
      id: "recC1",
      fields: {
        Campaign: "Acme",
        "Limited Partner": ["recL1"],
        "Deal Status": "2.0 - Contacted",
        "Deal Value (K)": 250,
        Probability: "2 - High",
        Representative: { id: "usr1", name: "Jon Azoff" },
        "Next Touch Point": "2026-10-20T16:00:00.000Z",
        Interactions: ["recI1", "recI2"],
      },
    },
    new Map([["recL1", "Acme Family Office"]]),
    interactions,
    NOW,
  );
  assert.equal(card.lp, "Acme Family Office");
  assert.equal(card.value, "$250K");
  assert.equal(card.probability, "High");
  assert.equal(card.representative, "Jon Azoff");
  assert.equal(card.nextTouchLabel, "Oct 20, 2026");
  assert.equal(card.overdue, true);
  assert.equal(card.latest?.summary, "Sent deck");
});

test("a future or missing touch point is not overdue", () => {
  const base = { id: "recC2", fields: { Campaign: "B" } };
  assert.equal(cardOf(base, new Map(), interactions, NOW).overdue, false);
  assert.equal(
    cardOf(base, new Map(), interactions, NOW).nextTouchLabel,
    "Not set",
  );
  const later = {
    id: "recC3",
    fields: { "Next Touch Point": "2026-11-01T16:00:00.000Z" },
  };
  assert.equal(cardOf(later, new Map(), interactions, NOW).overdue, false);
});

test("value and probability labels", () => {
  assert.equal(valueLabel(1500), "$1.5M");
  assert.equal(valueLabel(undefined), "");
  assert.equal(probabilityLabel("0 - Low"), "Low");
});

test("the timeline merges Interactions and comments newest first, mentions rendered", () => {
  const entries = timeline(
    [...interactions.values()],
    [
      {
        id: "com1",
        author: { id: "usrJ", name: "Jon Azoff" },
        text: "@[usrKB] punt this",
        createdTime: "2026-10-12T17:00:00.000Z",
        mentioned: { usrKB: { displayName: "KB" } },
      } as never,
    ],
  );
  assert.deepEqual(
    entries.map((e) => [e.kind, e.title]),
    [
      ["comment", "Comment"],
      ["interaction", "Email · Sent deck"],
      ["interaction", "Phone Call · Intro call"],
    ],
  );
  assert.equal(entries[0].body, "@KB punt this");
  assert.equal(entries[0].who, "Jon Azoff");
});

test("a contact gets sms/tel for a phone, mailto for an email and a LinkedIn link", () => {
  const card = contactCard({
    id: "recP1",
    fields: {
      Name: "Tyler Lee",
      "Primary Phone": "+1 (206) 555-0100",
      "Primary Email": "tyler@acme.example",
      Profile: "https://www.linkedin.com/in/tylerlee/",
    },
  });
  assert.deepEqual(card, {
    name: "Tyler Lee",
    links: [
      { label: "Text", href: "sms:+12065550100" },
      { label: "Call", href: "tel:+12065550100" },
      { label: "Email", href: "mailto:tyler@acme.example" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/tylerlee/" },
    ],
  });
});

test("a contact with nothing reachable gets no links, and unsafe URLs are dropped", () => {
  assert.deepEqual(
    contactCard({ id: "recP2", fields: { Name: "Ann" } }).links,
    [],
  );
  assert.equal(webUrl("javascript:alert(1)"), null);
  assert.equal(webUrl("not a url"), null);
  assert.equal(phoneTarget("ext 12"), null);
  assert.equal(phoneTarget("206 555 0100"), "2065550100");
  assert.deepEqual(
    contactCard({ id: "recP3", fields: { Name: "B", "Primary Email": "nope" } })
      .links,
    [],
  );
});
