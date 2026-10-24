// The comment a submit with attachments posts, and the Worker's own limits.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EXTRACT_INSTRUCTION,
  PLACEHOLDER_SUMMARY,
  attachmentComment,
  uploadProblem,
} from "./attachments.ts";
import { renderMentions } from "./campaigns.ts";
import { KB } from "./mentions.ts";

test("the instruction follows the typed text on its own line, or stands alone", () => {
  assert.equal(attachmentComment(""), EXTRACT_INSTRUCTION);
  assert.equal(attachmentComment("  \n "), EXTRACT_INSTRUCTION);
  assert.equal(
    attachmentComment(" call went well \n"),
    `call went well\n${EXTRACT_INSTRUCTION}`,
  );
});

test("the instruction mentions KB, and reads as its Airtable display name", () => {
  assert.equal(
    EXTRACT_INSTRUCTION,
    "@[usrt57orTxVb75I3W] extract and update relevant information from recent interaction",
  );
  const shown = renderMentions({
    id: "com1",
    author: { id: "usrJon" },
    createdTime: "",
    text: EXTRACT_INSTRUCTION,
    mentioned: {
      [KB.id]: { id: KB.id, type: "user", displayName: KB.name },
    },
  });
  assert.equal(
    shown,
    "@Kernel Bottie extract and update relevant information from recent interaction",
  );
});

test("the placeholder Summary is the one KB looks for", () => {
  assert.equal(PLACEHOLDER_SUMMARY, "New Interaction Attachment");
});

test("the Worker refuses a file over 5 MB and more than 10 files", () => {
  const file = (size: number) => ({
    name: "f.pdf",
    type: "application/pdf",
    size,
    arrayBuffer: async () => new ArrayBuffer(0),
  });
  assert.equal(uploadProblem([file(5 * 1024 * 1024)]), null);
  assert.match(uploadProblem([file(5 * 1024 * 1024 + 1)]) ?? "", /5 MB/);
  assert.match(
    uploadProblem(Array.from({ length: 11 }, () => file(1))) ?? "",
    /at most 10/,
  );
});
