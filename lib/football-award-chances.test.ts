import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { formatChance, shareChances, titleChances } from "@/lib/award-chances";
import {
  FOOTBALL_POINTS_FOR_A_WIN,
  footballScorerChances,
  footballTitleChances,
  pointsStillAvailable,
} from "@/lib/football-award-chances";

describe("pointsStillAvailable", () => {
  test("a win is worth 3 and a full season is 38 matches", () => {
    assert.equal(pointsStillAvailable(10), 28 * FOOTBALL_POINTS_FOR_A_WIN);
    assert.equal(pointsStillAvailable(38), 0);
    assert.equal(pointsStillAvailable(40), 0);
  });
});

describe("footballTitleChances", () => {
  test("an eliminated club shows under 1% and the card sums to 100", () => {
    // 8 matches left × 3 = 24. Leader 80. The third club maxes at 74.
    const { percent, exact } = footballTitleChances([80, 70, 50], [30, 30, 30]);
    assert.equal(percent.reduce((sum, value) => sum + value, 0), 100);
    assert.ok(percent[0]! > percent[1]! && percent[1]! > 0);
    assert.ok(exact[2]! > 0 && exact[2]! < 1, `eliminated exact ${exact[2]}`);
    assert.equal(percent[2], 0);
    assert.equal(formatChance(exact[2]!, percent[2]!), "<1%");
    assert.notEqual(formatChance(exact[2]!, percent[2]!), "0%");
  });

  test("a shared ceiling matches the single-number title model", () => {
    const points = [27, 25, 24, 20, 19];
    const played = [10, 10, 10, 10, 10];
    const remain = pointsStillAvailable(10);
    assert.deepEqual(
      footballTitleChances(points, played),
      titleChances(points, remain)
    );
    assert.deepEqual(
      titleChances(points, remain),
      titleChances(points, played.map(() => remain))
    );
  });

  test("La Liga top five on 31 Oct 2026 stay a tight remaining-season split", () => {
    // Barcelona 27, Atlético 25, Real Madrid 24, Betis 20, Real Sociedad 19.
    // All on 10 played, so 84 points are still available. The old points softmax
    // was 28 / 23 / 21 / 15 / 14.
    const { percent, exact } = footballTitleChances([27, 25, 24, 20, 19], [10, 10, 10, 10, 10]);
    assert.deepEqual(percent, [21, 21, 20, 19, 19]);
    assert.equal(percent.reduce((sum, value) => sum + value, 0), 100);
    assert.ok(exact.every((value) => value >= 1));
  });

  test("Premier League top five on 31 Oct 2026, eight played", () => {
    // Man City 21, Arsenal 21, Brighton 16, Liverpool 15, Chelsea 13. 90 points left.
    const { percent } = footballTitleChances([21, 21, 16, 15, 13], [8, 8, 8, 8, 8]);
    assert.deepEqual(percent, [21, 21, 20, 19, 19]);
    assert.equal(percent.reduce((sum, value) => sum + value, 0), 100);
  });

  test("a finished season is 100% / 0% and the floor does not apply", () => {
    const { percent, exact } = footballTitleChances([90, 80, 70], [38, 38, 38]);
    assert.deepEqual(percent, [100, 0, 0]);
    assert.equal(exact[1], 0);
    assert.equal(formatChance(exact[1]!, percent[1]!), "0%");
  });

  test("a sealed title stays 100% / 0% even when the chaser still has matches", () => {
    // Leader has finished on 90. Chaser has one match left and maxes at 83.
    const { percent, exact } = footballTitleChances([90, 80], [38, 37]);
    assert.deepEqual(percent, [100, 0]);
    assert.equal(formatChance(exact[1]!, percent[1]!), "0%");
  });

  test("a leader with no matches left stays in the race when a postponement can pass them", () => {
    // Leader 90, season complete. Chaser 88 with one match left can reach 91.
    const { percent, exact } = footballTitleChances([90, 88], [38, 37]);
    assert.equal(percent.reduce((sum, value) => sum + value, 0), 100);
    assert.ok(percent[0]! > 0 && percent[1]! > 0);
    assert.ok(exact[0]! >= 1 && exact[1]! >= 1);
  });
});

describe("footballScorerChances", () => {
  test("a no-goals player shows under 1% and the card sums to 100", () => {
    const { percent, exact } = footballScorerChances([13, 11, 8, 0]);
    assert.equal(percent.reduce((sum, value) => sum + value, 0), 100);
    assert.ok(exact[3]! > 0 && exact[3]! < 1, `no-goals exact ${exact[3]}`);
    assert.equal(percent[3], 0);
    assert.equal(formatChance(exact[3]!, percent[3]!), "<1%");
    assert.ok(percent[0]! > percent[1]!);
    assert.deepEqual(percent, shareChances([13, 11, 8, 0]).percent);
  });

  test("La Liga Pichichi goals 13 / 11 / 8 / 8 / 7 share without a flat zero", () => {
    const { percent, exact } = footballScorerChances([13, 11, 8, 8, 7]);
    assert.deepEqual(percent, [28, 23, 17, 17, 15]);
    assert.equal(percent.reduce((sum, value) => sum + value, 0), 100);
    assert.ok(exact.every((value) => value >= 1));
  });

  test("Premier League Golden Boot goals 9 / 6 / 5 / 5 / 4", () => {
    const { percent } = footballScorerChances([9, 6, 5, 5, 4]);
    assert.equal(percent.reduce((sum, value) => sum + value, 0), 100);
    assert.deepEqual(percent, [31, 21, 17, 17, 14]);
  });
});

describe("football chance copy", () => {
  test("La Liga and Premier League no longer say the race ended now", () => {
    const files = [
      "../components/laliga/LaLigaAwardsSection.tsx",
      "../components/premier-league/PremierLeagueAwardsSection.tsx",
      "./la-liga-awards.ts",
      "./premier-league-awards.ts",
    ];
    for (const file of files) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      assert.doesNotMatch(source, /ended now|ended today/);
      assert.match(source, /under 1%/);
      assert.match(source, /winChanceLabel/);
    }
  });
});
