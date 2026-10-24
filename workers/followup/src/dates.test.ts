// Days as Jon reads them: the Pacific date, written at 16:00 UTC so it is the
// same day in both zones.
import assert from "node:assert/strict";
import { test } from "node:test";
import { dayValue, pacificDay } from "./dates.ts";

test("an instant's day is its Pacific date, not its UTC one", () => {
  assert.equal(pacificDay(Date.parse("2026-10-23T16:00:00Z")), "2026-10-23");
  // 9pm Pacific on Oct 23 is already Oct 24 in UTC.
  assert.equal(pacificDay(Date.parse("2026-10-24T04:00:00Z")), "2026-10-23");
  // 11:30pm PST on Mar 13, 2027, the night before DST starts.
  assert.equal(pacificDay(Date.parse("2027-03-14T07:30:00Z")), "2027-03-13");
});

test("a day is written at 16:00 UTC, the same day in Pacific time", () => {
  assert.equal(dayValue("2026-10-30"), "2026-10-30T16:00:00.000Z");
});
