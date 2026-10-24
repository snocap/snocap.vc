// The day a submit moves Next Touch Point to: today in Pacific time plus a
// week, by calendar, so neither the UTC date nor a DST change can shift it.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultNextTouch,
  nextTouchAfterSubmit,
  nextTouchValue,
  pacificDayPlus,
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

const NOW = Date.parse("2026-10-23T18:00:00Z"); // Oct 23, Pacific

test("a past Next Touch Point moves to today + 7", () => {
  assert.equal(
    nextTouchAfterSubmit("2026-10-01T16:00:00.000Z", NOW),
    "2026-10-30",
  );
  // Earlier today is not the future either.
  assert.equal(
    nextTouchAfterSubmit("2026-10-23T16:00:00.000Z", NOW),
    "2026-10-30",
  );
});

test("an unset or unreadable Next Touch Point moves to today + 7", () => {
  assert.equal(nextTouchAfterSubmit(undefined, NOW), "2026-10-30");
  assert.equal(nextTouchAfterSubmit("not a date", NOW), "2026-10-30");
});

test("a future date earlier than today + 7 moves to today + 7, never +7 on itself", () => {
  assert.equal(
    nextTouchAfterSubmit("2026-10-26T16:00:00.000Z", NOW),
    "2026-10-30",
  );
});

test("a future date later than today + 7 is kept", () => {
  assert.equal(nextTouchAfterSubmit("2026-11-20T16:00:00.000Z", NOW), null);
  // Exactly today + 7 is the floor either way.
  assert.equal(
    nextTouchAfterSubmit("2026-10-30T16:00:00.000Z", NOW),
    "2026-10-30",
  );
});

test("the comparison is by Pacific date across a DST change", () => {
  // Oct 29, 11:30pm PDT; PST starts Nov 1, so today + 7 is Nov 5.
  const now = Date.parse("2026-10-30T06:30:00Z");
  // 11:30pm PST Nov 4 is Nov 5 in UTC but Nov 4 in Pacific: earlier → floor.
  assert.equal(
    nextTouchAfterSubmit("2026-11-05T07:30:00.000Z", now),
    "2026-11-05",
  );
  // 1am PST Nov 6 is Nov 6 in Pacific: later → kept.
  assert.equal(nextTouchAfterSubmit("2026-11-06T09:00:00.000Z", now), null);
});
