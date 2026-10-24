// Who can be @-mentioned, and how a visible @Name becomes Airtable's @[usr…].
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  KB,
  choicePeople,
  commentPeople,
  mentionsUser,
  mergePeople,
  parseMentions,
  personOf,
  recordPeople,
  serializeComment,
} from "./mentions.ts";

const JON = { id: "usrJonJonJonJon01", name: "Jon Azoff" };
const NATE = { id: "usrNateNateNate01", name: "Nate" };
const SHRINA = { id: "usrShrinaShrina01", name: "Shrina" };

test("KB is always mentionable, by its Airtable display name like anyone", () => {
  assert.equal(KB.id, "usrt57orTxVb75I3W");
  assert.equal(KB.name, "Kernel Bottie");
  assert.deepEqual(mergePeople(), [KB]);
  // Sorted with everyone else, not pinned first.
  const ANNA = { id: "usrAnnaAnnaAnna01", name: "Anna" };
  assert.deepEqual(mergePeople([NATE, ANNA]), [ANNA, KB, NATE]);
  // A name Airtable returns for KB's id wins over the fallback.
  assert.deepEqual(mergePeople([{ id: KB.id, name: "KB Renamed" }]), [
    { id: KB.id, name: "KB Renamed" },
  ]);
});

test("the list merges every source once per user, sorted by name", () => {
  const records = [
    {
      id: "recA",
      fields: {
        Representative: { id: NATE.id, name: "Nate", email: "nate@x.vc" },
        "Created By": { id: JON.id, name: "Jon Azoff" },
      },
    },
    {
      id: "recB",
      fields: {
        Representative: { id: SHRINA.id, email: "shrina@x.vc" },
        "Created By": { id: "not-a-user", name: "junk" },
      },
    },
  ];
  const fromRecords = recordPeople(records, ["Representative", "Created By"]);
  assert.deepEqual(fromRecords, [
    NATE,
    JON,
    { id: SHRINA.id, name: "shrina@x.vc" },
  ]);
  const fromSchema = choicePeople({
    choices: [{ id: SHRINA.id, name: "Shrina" }],
  });
  assert.deepEqual(choicePeople(undefined), []);
  const fromComments = commentPeople([
    {
      id: "com1",
      author: { id: JON.id, name: "Jon Azoff" },
      text: `@[${SHRINA.id}] and @[ugpTeam] ok?`,
      createdTime: "2026-10-01T00:00:00Z",
      mentioned: {
        [SHRINA.id]: { id: SHRINA.id, type: "user", displayName: "Shrina" },
        ugpTeam: { id: "ugpTeam", type: "userGroup", displayName: "Team" },
      },
    },
  ]);
  assert.deepEqual(fromComments, [JON, SHRINA]);
  assert.deepEqual(mergePeople(fromRecords, fromSchema, fromComments), [
    JON,
    KB,
    NATE,
    { id: SHRINA.id, name: "shrina@x.vc" },
  ]);
});

test("a typed @Name is serialized to @[usr…]; nothing else is added", () => {
  assert.equal(
    serializeComment("@Nate any update here?", [NATE]),
    `@[${NATE.id}] any update here?`,
  );
  assert.equal(
    serializeComment("commitment is now $250K", []),
    "commitment is now $250K",
    "no mention typed, no KB mention added",
  );
  assert.equal(
    serializeComment("@Jon Azoff and @Jon: see @Shrina's note", [
      { id: "usrJonOtherJon001", name: "Jon" },
      JON,
      SHRINA,
    ]),
    `@[${JON.id}] and @[usrJonOtherJon001]: see @[${SHRINA.id}]'s note`,
  );
  assert.equal(
    serializeComment("@Natel is not @Nate", [NATE]),
    `@Natel is not @[${NATE.id}]`,
  );
  assert.equal(
    serializeComment("cc @Kernel Bottie", [KB]),
    "cc @[usrt57orTxVb75I3W]",
  );
  assert.ok(mentionsUser(serializeComment("cc @Kernel Bottie", [KB]), KB.id));
  assert.ok(!mentionsUser(serializeComment("@Nate hi", [NATE]), KB.id));
});

test("the form's mention list is parsed defensively", () => {
  assert.deepEqual(
    parseMentions(JSON.stringify([NATE, { id: "x", name: "y" }])),
    [NATE],
  );
  assert.deepEqual(parseMentions("not json"), []);
  assert.deepEqual(parseMentions(null), []);
  assert.equal(personOf({ id: NATE.id }), null, "a mention needs a name");
});
