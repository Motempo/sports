import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  countMatchDays,
  sliceDayGroupsByDayCount,
  sliceDayGroupsByMatchCount,
  type MatchDayGroup,
} from "./match-schedule.ts";
import type { MatchInfo } from "./types.ts";

function day(dayKey: string, matchCount: number): MatchDayGroup {
  return {
    dayKey,
    dayStart: new Date(`${dayKey}T00:00:00Z`),
    label: dayKey,
    matches: Array.from({ length: matchCount }, (_, index) => ({ id: index }) as MatchInfo),
  };
}

describe("sliceDayGroupsByDayCount", () => {
  const groups = [
    day("2026-10-17", 0),
    day("2026-10-17", 0),
    day("2026-10-18", 6),
    day("2026-10-19", 2),
    day("2026-10-20", 8),
    day("2026-10-21", 4),
  ];

  test("skips empty placeholders and keeps every fixture on the next days", () => {
    const visible = sliceDayGroupsByDayCount(groups, 3);
    assert.deepEqual(
      visible.map((group) => [group.dayKey, group.matches.length]),
      [
        ["2026-10-18", 6],
        ["2026-10-19", 2],
        ["2026-10-20", 8],
      ]
    );
  });

  test("stops at the day limit even when earlier days are short", () => {
    const visible = sliceDayGroupsByDayCount(groups, 1);
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.matches.length, 6);
  });

  test("returns nothing when the limit is zero", () => {
    assert.deepEqual(sliceDayGroupsByDayCount(groups, 0), []);
  });

  test("counts only days that have fixtures", () => {
    assert.equal(countMatchDays(groups), 4);
    assert.equal(countMatchDays([day("2026-10-17", 0)]), 0);
  });
});

describe("sliceDayGroupsByMatchCount", () => {
  test("still cuts inside a busy day for the match-count scroller", () => {
    const visible = sliceDayGroupsByMatchCount(
      [day("2026-10-17", 0), day("2026-10-18", 6), day("2026-10-19", 3)],
      2
    );
    assert.deepEqual(
      visible.map((group) => [group.dayKey, group.matches.length]),
      [["2026-10-18", 2]]
    );
  });
});
