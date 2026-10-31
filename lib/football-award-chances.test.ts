import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { formatChance, shareChances, titleChances } from "@/lib/award-chances";
import {
  F1_DRIVER_RACE_POINTS,
} from "@/lib/f1-award-chances";
import {
  FOOTBALL_POINTS_FOR_A_WIN,
  footballScorerChances,
  footballTitleChances,
  pointsStillAvailable,
  type FootballRateSample,
} from "@/lib/football-award-chances";

/** football-data.org table on 31 Oct 2026. ESPN's games-in-hand rows differ; the top five do not. */
const LA_LIGA_31_OCT: FootballRateSample = {
  totals: [27, 25, 24, 20, 19, 17, 13, 12, 12, 12, 11, 11, 11, 11, 10, 10, 10, 9, 6, 5],
  played: [10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 10, 11, 10, 10, 10, 10, 10, 10, 10, 10],
};

const PREMIER_LEAGUE_31_OCT: FootballRateSample = {
  totals: [21, 21, 16, 15, 13, 11, 11, 11, 11, 10, 10, 10, 9, 9, 8, 7, 7, 6, 6, 5],
  played: Array.from({ length: 20 }, () => 8),
};

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe("pointsStillAvailable", () => {
  test("a win is worth 3 and a full season is 38 matches", () => {
    assert.equal(pointsStillAvailable(10), 28 * FOOTBALL_POINTS_FOR_A_WIN);
    assert.equal(pointsStillAvailable(38), 0);
    assert.equal(pointsStillAvailable(40), 0);
  });
});

describe("footballTitleChances", () => {
  test("early-season La Liga lead is no longer a flat 21/21/20/19/19", () => {
    // Barcelona 27, Atlético 25, Real Madrid 24, Betis 20, Real Sociedad 19.
    // All on 10 played, 28 left. The catch-up-room card was 21/21/20/19/19.
    const { percent, exact } = footballTitleChances(
      [27, 25, 24, 20, 19],
      [10, 10, 10, 10, 10],
      LA_LIGA_31_OCT
    );
    assert.deepEqual(percent, [41, 25, 20, 8, 6]);
    assert.equal(sum(percent), 100);
    assert.ok(percent[0]! - percent[4]! >= 30, "an 8-point gap should show");
    assert.ok(exact.every((value) => value >= 1));
  });

  test("early-season Premier League separates the tied leaders from the pack", () => {
    // Man City 21, Arsenal 21, Brighton 16, Liverpool 15, Chelsea 13. All on 8 played, 30 left.
    // The catch-up-room card was 21/21/20/19/19.
    const { percent, exact } = footballTitleChances(
      [21, 21, 16, 15, 13],
      [8, 8, 8, 8, 8],
      PREMIER_LEAGUE_31_OCT
    );
    assert.deepEqual(percent, [39, 38, 10, 8, 5]);
    assert.equal(sum(percent), 100);
    assert.ok(Math.abs(exact[0]! - exact[1]!) < 1e-9, "level clubs share one projection");
    assert.ok(percent[2]! < 15);
  });

  test("mid-season the same style of gap is sharper than October", () => {
    const league: FootballRateSample = {
      totals: [58, 50, 46, 40, 36, 30, 28, 24, 22, 20, 18, 16, 14, 12, 10, 8, 8, 6, 4, 2],
      played: Array.from({ length: 20 }, () => 24),
    };
    const { percent } = footballTitleChances([58, 50, 46, 40, 36], [24, 24, 24, 24, 24], league);
    assert.deepEqual(percent, [74, 16, 7, 2, 1]);
    assert.equal(sum(percent), 100);
    assert.ok(percent[0]! > 41, "14 matches left should tighten the leader past the October card");
  });

  test("an eight-point gap gets sharper as the matches run out", () => {
    const early = footballTitleChances([30, 22], [10, 10], {
      totals: [30, 22, 10, 10, 10, 10, 10, 10, 10, 10],
      played: Array.from({ length: 10 }, () => 10),
    });
    const late = footballTitleChances([70, 62], [34, 34], {
      totals: [70, 62, 40, 40, 40, 40, 40, 40, 40, 40],
      played: Array.from({ length: 10 }, () => 34),
    });
    assert.ok(late.percent[0]! > early.percent[0]!);
    assert.equal(sum(early.percent), 100);
    assert.equal(sum(late.percent), 100);
  });

  test("final round: a two-point lead is live, a ten-point gap is under 1%", () => {
    // One match left. 78+3 can pass 80. 70+3 cannot.
    const { percent, exact } = footballTitleChances([80, 78, 70], [37, 37, 37]);
    assert.deepEqual(percent, [74, 26, 0]);
    assert.equal(sum(percent), 100);
    assert.ok(exact[2]! > 0 && exact[2]! < 1);
    assert.equal(formatChance(exact[2]!, percent[2]!), "<1%");
  });

  test("an eliminated club shows under 1% and the card sums to 100", () => {
    // 8 matches left × 3 = 24. Leader 80. The third club maxes at 74.
    const { percent, exact } = footballTitleChances([80, 70, 50], [30, 30, 30]);
    assert.equal(sum(percent), 100);
    assert.ok(percent[0]! > percent[1]! && percent[1]! > 0);
    assert.ok(exact[2]! > 0 && exact[2]! < 1, `eliminated exact ${exact[2]}`);
    assert.equal(percent[2], 0);
    assert.equal(formatChance(exact[2]!, percent[2]!), "<1%");
  });

  test("a finished season is 100% / 0% and the floor does not apply", () => {
    const { percent, exact } = footballTitleChances([90, 80, 70], [38, 38, 38]);
    assert.deepEqual(percent, [100, 0, 0]);
    assert.equal(exact[1], 0);
    assert.equal(formatChance(exact[1]!, percent[1]!), "0%");
  });

  test("a sealed title keeps the floor while the chaser still has a match", () => {
    // Leader has finished on 90. Chaser has one match left and maxes at 83.
    const { percent, exact } = footballTitleChances([90, 80], [38, 37]);
    assert.equal(sum(percent), 100);
    assert.equal(percent[0], 100);
    assert.ok(exact[1]! > 0 && exact[1]! < 1);
    assert.equal(formatChance(exact[1]!, percent[1]!), "<1%");
  });

  test("a leader with no matches left stays in the race when a postponement can pass them", () => {
    // Leader 90, season complete for them. Chaser 88 with one match left can reach 91.
    const { percent, exact } = footballTitleChances([90, 88], [38, 37]);
    assert.equal(sum(percent), 100);
    assert.ok(percent[0]! > 0 && percent[1]! > 0);
    assert.ok(exact[0]! >= 1 && exact[1]! >= 1);
  });
});

describe("footballScorerChances", () => {
  test("early-season Pichichi uses the scoring rate, not a flat goals share", () => {
    // Raphinha 13 in 9, Mbappé 11 in 10, Zabiri 8 in 10, Yamal 8 in 10, next 7 in 10.
    // 28 club matches left. The old goals share of 13/11/8/8/7 was 28/23/17/17/15.
    const { percent, exact } = footballScorerChances([
      { goals: 13, played: 9, remaining: 28 },
      { goals: 11, played: 10, remaining: 28 },
      { goals: 8, played: 10, remaining: 28 },
      { goals: 8, played: 10, remaining: 28 },
      { goals: 7, played: 10, remaining: 28 },
    ]);
    assert.deepEqual(percent, [54, 22, 9, 9, 6]);
    assert.equal(sum(percent), 100);
    assert.equal(percent[2], percent[3]);
    assert.ok(exact.every((value) => value >= 1));
  });

  test("early-season Golden Boot keeps a hotter per-match rate ahead of an equal goal total", () => {
    // Haaland 9 in 8, Isak 6 in 7, Tavernier 5 in 8, João Pedro 5 in 6, next 4 in 8.
    // 30 club matches left.
    const { percent } = footballScorerChances([
      { goals: 9, played: 8, remaining: 30 },
      { goals: 6, played: 7, remaining: 30 },
      { goals: 5, played: 8, remaining: 30 },
      { goals: 5, played: 6, remaining: 30 },
      { goals: 4, played: 8, remaining: 30 },
    ]);
    assert.deepEqual(percent, [46, 19, 11, 16, 8]);
    assert.equal(sum(percent), 100);
    assert.ok(percent[3]! > percent[2]!, "5 goals in 6 should outrank 5 goals in 8");
  });

  test("a no-goals player with matches left is not a flat 0%", () => {
    const { percent, exact } = footballScorerChances([
      { goals: 13, played: 9, remaining: 28 },
      { goals: 11, played: 10, remaining: 28 },
      { goals: 8, played: 10, remaining: 28 },
      { goals: 0, played: 10, remaining: 28 },
    ]);
    assert.equal(sum(percent), 100);
    assert.ok(exact[3]! > 0, `no-goals exact ${exact[3]}`);
    assert.notEqual(formatChance(exact[3]!, percent[3]!), "0%");
    assert.ok(percent[0]! > percent[1]!);
  });

  test("final round: a player who cannot catch even with a hat-trick shows under 1%", () => {
    const { percent, exact } = footballScorerChances([
      { goals: 20, played: 37, remaining: 1 },
      { goals: 18, played: 37, remaining: 1 },
      { goals: 10, played: 37, remaining: 1 },
    ]);
    assert.deepEqual(percent, [80, 20, 0]);
    assert.equal(sum(percent), 100);
    assert.ok(exact[2]! > 0 && exact[2]! < 1);
    assert.equal(formatChance(exact[2]!, percent[2]!), "<1%");
  });

  test("a finished scoring race gives the leader 100% and a true 0% to the rest", () => {
    const { percent, exact } = footballScorerChances([
      { goals: 20, played: 38, remaining: 0 },
      { goals: 18, played: 38, remaining: 0 },
      { goals: 0, played: 38, remaining: 0 },
    ]);
    assert.deepEqual(percent, [100, 0, 0]);
    assert.equal(exact[2], 0);
    assert.equal(formatChance(exact[2]!, percent[2]!), "0%");
  });
});

describe("Formula 1 chances stay on the catch-up model", () => {
  test("drivers, constructors, and race wins match the merged card", () => {
    const drivers = titleChances([365, 242, 241, 236, 233], 5 * F1_DRIVER_RACE_POINTS);
    assert.equal(drivers.percent[0], 98);
    assert.equal(drivers.percent[1], 1);
    assert.equal(drivers.percent[2], 1);
    assert.equal(formatChance(drivers.exact[3]!, drivers.percent[3]!), "<1%");

    const constructors = titleChances([607, 474, 355, 355, 102], 5 * (25 + 18));
    assert.deepEqual(constructors.percent.slice(0, 2), [72, 28]);
    assert.equal(formatChance(constructors.exact[2]!, constructors.percent[2]!), "<1%");

    const wins = shareChances([9, 3, 2, 2, 1]);
    assert.deepEqual(wins.percent.slice(0, 3), [53, 17, 12]);
  });
});

describe("football chance copy", () => {
  test("La Liga and Premier League describe the projection and not a race that already ended", () => {
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
