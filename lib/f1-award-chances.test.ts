import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  F1_CONSTRUCTOR_RACE_POINTS,
  F1_DRIVER_RACE_POINTS,
  F1_DRIVER_SPRINT_POINTS,
  formatF1Chance,
  maxDriverPointsRemaining,
  normalizeChances,
  shareChances,
  titleChances,
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

describe("formatF1Chance", () => {
  test("labels a positive sub-1% share as <1% and a true zero as 0%", () => {
    assert.equal(formatF1Chance(0.04, 0), "<1%");
    assert.equal(formatF1Chance(0, 0), "0%");
    assert.equal(formatF1Chance(97.6, 98), "98%");
  });
});

describe("shareChances", () => {
  test("zero-wins driver gets a small positive chance under 1%", () => {
    const { percent, exact } = shareChances([9, 3, 2, 0, 0]);
    assert.equal(percent.reduce((a, b) => a + b, 0), 100);
    assert.ok(exact[3]! > 0 && exact[3]! < 1, `expected sub-1% exact, got ${exact[3]}`);
    assert.ok(exact[4]! > 0 && exact[4]! < 1);
    assert.equal(percent[3], 0);
    assert.equal(percent[4], 0);
    assert.equal(formatF1Chance(exact[3]!, percent[3]!), "<1%");
    assert.equal(formatF1Chance(exact[4]!, percent[4]!), "<1%");
    assert.ok(percent[0]! > 50, `leader should stay dominant, got ${percent[0]}`);
    // Floor does not steal a whole point: same integers as the unfloored share.
    assert.deepEqual(percent, normalizeChances([9, 3, 2, 0, 0]));
  });

  test("matches win totals proportionally when every driver has a win", () => {
    const { percent, exact } = shareChances([9, 3, 2, 2, 1]);
    assert.equal(percent.reduce((a, b) => a + b, 0), 100);
    // 9/17 ≈ 52.94 → 53; 3/17 ≈ 17.65 → 17 with largest-remainder
    assert.equal(percent[0], 53);
    assert.equal(percent[1], 17);
    assert.equal(percent[2], 12);
    assert.ok(exact.every((value) => value >= 1));
  });

  test("all-zero counting stats still split evenly", () => {
    const { percent, exact } = shareChances([0, 0, 0, 0]);
    assert.deepEqual(percent, [25, 25, 25, 25]);
    assert.ok(exact.every((value) => value === 0));
    assert.equal(formatF1Chance(exact[0]!, percent[0]!), "25%");
  });
});

describe("titleChances", () => {
  test("eliminated contender gets a small positive chance and the leader stays dominant", () => {
    // Leader 365, Max 236, 5 races × 25 = 125 left → Max maxes at 361 < 365
    const { percent, exact } = titleChances([365, 242, 241, 236, 233], 5 * F1_DRIVER_RACE_POINTS);
    assert.equal(percent.reduce((a, b) => a + b, 0), 100);
    assert.equal(percent[0], 98, `leader should stay at 98, got ${percent[0]}`);
    assert.ok(percent[0]! >= 90);
    assert.equal(percent[1], 1, "Russell still alive on 1%");
    assert.equal(percent[2], 1, "Hamilton still alive on 1%");
    assert.ok(exact[3]! > 0 && exact[3]! < 1, `Verstappen exact ${exact[3]}`);
    assert.ok(exact[4]! > 0 && exact[4]! < 1, `Leclerc exact ${exact[4]}`);
    assert.equal(formatF1Chance(exact[3]!, percent[3]!), "<1%");
    assert.equal(formatF1Chance(exact[4]!, percent[4]!), "<1%");
    assert.equal(percent[3], 0);
    assert.equal(percent[4], 0);
  });

  test("sprint ceiling keeps a distant chaser alive when race-only would only leave the floor", () => {
    const raceOnly = 5 * F1_DRIVER_RACE_POINTS; // 125
    const withSprints = raceOnly + 2 * F1_DRIVER_SPRINT_POINTS; // 141
    const eliminated = titleChances([365, 236], raceOnly);
    const alive = titleChances([365, 236], withSprints);
    assert.ok(eliminated.exact[1]! > 0 && eliminated.exact[1]! < 1);
    assert.equal(formatF1Chance(eliminated.exact[1]!, eliminated.percent[1]!), "<1%");
    assert.ok(alive.percent[1]! > 0);
    assert.ok(alive.exact[1]! >= 1);
  });

  test("season complete awards 100% to the points leader and a true 0% to the rest", () => {
    const { percent, exact } = titleChances([365, 242, 241], 0);
    assert.deepEqual(percent, [100, 0, 0]);
    assert.equal(exact[1], 0);
    assert.equal(formatF1Chance(exact[1]!, percent[1]!), "0%");
    assert.equal(formatF1Chance(exact[0]!, percent[0]!), "100%");
  });

  test("late-season runaway no longer looks like a 37/16/16/16 soft split", () => {
    const softLooking = [37, 16, 16, 16, 15];
    const { percent } = titleChances([365, 242, 241, 236, 233], 5 * F1_DRIVER_RACE_POINTS);
    assert.notDeepEqual(percent, softLooking);
    assert.ok(percent[0]! > 80);
  });

  test("constructor ceiling keeps the same whole percents and lifts an eliminated team under 1%", () => {
    // Mercedes 607, Ferrari 474, Red Bull 355. Five races × (25+18) left, no sprints.
    const remain = 5 * F1_CONSTRUCTOR_RACE_POINTS;
    const { percent, exact } = titleChances([607, 474, 355, 355, 102], remain);
    assert.equal(percent.reduce((a, b) => a + b, 0), 100);
    assert.deepEqual(percent.slice(0, 2), [72, 28]);
    assert.ok(exact[2]! > 0 && exact[2]! < 1);
    assert.equal(formatF1Chance(exact[2]!, percent[2]!), "<1%");
    assert.equal(formatF1Chance(exact[3]!, percent[3]!), "<1%");
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

describe("wins share on the season-stats rows", () => {
  test("race wins stay 53 / 17 / 12 when every shown driver has a win", () => {
    const { percent } = shareChances([9, 3, 2, 2, 1]);
    assert.deepEqual(percent.slice(0, 3), [53, 17, 12]);
    assert.equal(percent.reduce((a, b) => a + b, 0), 100);
  });

  test("a winless team gets a small positive chance under 1%", () => {
    const { percent, exact } = shareChances([12, 2, 2, 2, 0]);
    assert.equal(percent.reduce((a, b) => a + b, 0), 100);
    assert.ok(percent[0]! > 50);
    assert.ok(exact[4]! > 0 && exact[4]! < 1, `blank team exact ${exact[4]}`);
    assert.equal(formatF1Chance(exact[4]!, percent[4]!), "<1%");
    assert.deepEqual(percent, normalizeChances([12, 2, 2, 2, 0]));
  });
});

describe("season stats copy", () => {
  test("page and commentary no longer say eliminated drivers show 0%", () => {
    const awards = readFileSync(new URL("./f1-awards.ts", import.meta.url), "utf8");
    const section = readFileSync(
      new URL("../components/f1/F1AwardsSection.tsx", import.meta.url),
      "utf8"
    );
    const docs = readFileSync(new URL("../docs/sports/formula-1.md", import.meta.url), "utf8");
    for (const source of [awards, section, docs]) {
      assert.doesNotMatch(source, /show 0%|shows 0%|means 0%|stay at 0%|sit on 0%|blanks stay at 0%/);
      assert.match(source, /under 1%/);
    }
    assert.match(section, /winChanceLabel/);
    assert.match(awards, /winChanceLabel/);
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
