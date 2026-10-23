// The day a submit moves Next Touch Point to: today in Pacific time plus a
// week, by calendar, so neither the UTC date nor a DST change can shift it.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultNextTouch,
  nextTouchValue,
  pacificDayPlus,
  submitLabel,
} from "./dates.ts";

test("the default is a week after today's Pacific date", () => {
  assert.equal(
    defaultNextTouch(Date.parse("2026-10-23T16:00:00Z")),
    "2026-10-30",
  );
  // 9pm Pacific on Oct 23 is already Oct 24 in UTC; the day is still Pacific's.
  assert.equal(
    defaultNextTouch(Date.parse("2026-10-24T04:00:00Z")),
    "2026-10-30",
  );
  // Month and year roll over.
  assert.equal(
    defaultNextTouch(Date.parse("2026-12-28T18:00:00Z")),
    "2027-01-04",
  );
});

test("a DST change inside the week does not shift the day", () => {
  // PDT → PST on Nov 1, 2026: 11:30pm PDT Oct 31, and 11:30pm PST Nov 1.
  assert.equal(
    defaultNextTouch(Date.parse("2026-11-01T06:30:00Z")),
    "2026-11-07",
  );
  assert.equal(
    defaultNextTouch(Date.parse("2026-11-02T07:30:00Z")),
    "2026-11-08",
  );
  // PST → PDT on Mar 14, 2027: 11:30pm PST Mar 13.
  assert.equal(
    defaultNextTouch(Date.parse("2027-03-14T07:30:00Z")),
    "2027-03-20",
  );
  assert.equal(
    pacificDayPlus(Date.parse("2027-03-14T07:30:00Z"), 0),
    "2027-03-13",
  );
});

test("the day is written at 16:00 UTC, the same day in Pacific time", () => {
  assert.equal(nextTouchValue("2026-10-30"), "2026-10-30T16:00:00.000Z");
});

test("the button says what a press does and the day it sets", () => {
  assert.equal(submitLabel("", "2026-10-30"), "Mark handled · Oct 30");
  assert.equal(submitLabel("  \n", "2026-10-30"), "Mark handled · Oct 30");
  assert.equal(
    submitLabel("commitment is now $250K", "2026-10-30"),
    "Comment · next touch Oct 30",
  );
});
