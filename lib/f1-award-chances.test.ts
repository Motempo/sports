import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  maxDriverPointsRemaining,
  normalizeChances,
  shareChances,
  titleChances,
  F1_DRIVER_RACE_POINTS,
  F1_DRIVER_SPRINT_POINTS,
} from "@/lib/f1-award-chances";
import type { F1GrandPrix } from "@/lib/f1-types";

describe("normalizeChances", () => {
  test("sums to 100 and keeps positive weights", () => {
    const chances = normalizeChances([365, 242, 241, 236, 233]);
    assert.equal(chances.reduce((a, b) => a + b, 0), 100);
    assert.ok(chances.every((c) => c >= 0));
    assert.ok(chances[0]! > chances[1]!);
  });

  test("all-zero weights split evenly", () => {
    assert.deepEqual(normalizeChances([0, 0, 0, 0]), [25, 25, 25, 25]);
  });
});

describe("shareChances", () => {
  test("zero stats stay at 0%", () => {
    const chances = shareChances([9, 3, 2, 0, 0]);
    assert.equal(chances.reduce((a, b) => a + b, 0), 100);
    assert.equal(chances[3], 0);
    assert.equal(chances[4], 0);
    assert.ok(chances[0]! > 50);
  });

  test("matches win totals proportionally", () => {
    const chances = shareChances([9, 3, 2, 2, 1]);
    assert.equal(chances.reduce((a, b) => a + b, 0), 100);
    // 9/17 ≈ 52.94 → 53; 3/17 ≈ 17.65 → 17 with largest-remainder
    assert.equal(chances[0], 53);
    assert.equal(chances[1], 17);
  });
});

describe("titleChances", () => {
  test("eliminates drivers who cannot catch the leader", () => {
    // Leader 365, Max 236, 5 races × 25 = 125 left → Max maxes at 361 < 365
    const chances = titleChances([365, 242, 241, 236, 233], 5 * F1_DRIVER_RACE_POINTS);
    assert.equal(chances.reduce((a, b) => a + b, 0), 100);
    assert.ok(chances[0]! >= 90, `leader should dominate, got ${chances[0]}`);
    assert.equal(chances[3], 0, "Verstappen eliminated");
    assert.equal(chances[4], 0, "Leclerc eliminated");
    // Russell 242+125=367 can still catch if leader stalls
    assert.ok(chances[1]! > 0);
  });

  test("sprint ceiling keeps a distant chaser alive when race-only would eliminate them", () => {
    const raceOnly = 5 * F1_DRIVER_RACE_POINTS; // 125
    const withSprints = raceOnly + 2 * F1_DRIVER_SPRINT_POINTS; // 141
    assert.equal(titleChances([365, 236], raceOnly)[1], 0);
    assert.ok(titleChances([365, 236], withSprints)[1]! > 0);
  });

  test("season complete awards 100% to the points leader", () => {
    assert.deepEqual(titleChances([365, 242, 241], 0), [100, 0, 0]);
  });

  test("late-season runaway no longer looks like a 37/16/16/16 soft split", () => {
    const softLooking = [37, 16, 16, 16, 15];
    const chances = titleChances([365, 242, 241, 236, 233], 5 * F1_DRIVER_RACE_POINTS);
    assert.notDeepEqual(chances, softLooking);
    assert.ok(chances[0]! > 80);
  });
});

describe("maxDriverPointsRemaining", () => {
  test("counts unfinished race and sprint weekends", () => {
    const calendar: F1GrandPrix[] = [
      gp("completed", false),
      gp("upcoming", false),
      gp("upcoming", true),
      gp("current", false),
      gp("cancelled", true),
    ];
    assert.equal(
      maxDriverPointsRemaining(calendar),
      3 * F1_DRIVER_RACE_POINTS + F1_DRIVER_SPRINT_POINTS
    );
  });
});

function gp(status: F1GrandPrix["status"], isSprintWeekend: boolean): F1GrandPrix {
  return {
    round: 1,
    name: "Test GP",
    circuit: "Test",
    country: "Test",
    date: "2026-01-01",
    utcDate: "2026-01-01T12:00:00Z",
    status,
    isSprintWeekend,
  };
}
