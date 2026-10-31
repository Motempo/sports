import type { F1GrandPrix } from "@/lib/f1-types";

/** Max points a driver can take from one Grand Prix (win). */
export const F1_DRIVER_RACE_POINTS = 25;
/** Max points a driver can take from a sprint (win). */
export const F1_DRIVER_SPRINT_POINTS = 8;
/** Max points a constructor can take from one Grand Prix (P1+P2). */
export const F1_CONSTRUCTOR_RACE_POINTS = 25 + 18;
/** Max points a constructor can take from a sprint (P1+P2). */
export const F1_CONSTRUCTOR_SPRINT_POINTS = 8 + 7;

function remainingGrandsPrix(calendar: F1GrandPrix[]): F1GrandPrix[] {
  return calendar.filter((gp) => gp.status === "upcoming" || gp.status === "current");
}

/** Ceiling points still available for a single driver (race win + sprint win when scheduled). */
export function maxDriverPointsRemaining(calendar: F1GrandPrix[]): number {
  return remainingGrandsPrix(calendar).reduce(
    (sum, gp) =>
      sum + F1_DRIVER_RACE_POINTS + (gp.isSprintWeekend ? F1_DRIVER_SPRINT_POINTS : 0),
    0
  );
}

/** Ceiling points still available for a constructor (both cars, race + sprint). */
export function maxConstructorPointsRemaining(calendar: F1GrandPrix[]): number {
  return remainingGrandsPrix(calendar).reduce(
    (sum, gp) =>
      sum +
      F1_CONSTRUCTOR_RACE_POINTS +
      (gp.isSprintWeekend ? F1_CONSTRUCTOR_SPRINT_POINTS : 0),
    0
  );
}

/**
 * Pseudocount added only where the model weight is zero (eliminated on a title
 * card, or 0 wins / 0 of a counting stat).
 *
 * This is an epsilon floor, not a full Laplace add-α on every row. Positive
 * weights keep their relative size; only a hard zero is lifted. ε = 0.05 is a
 * twentieth of one model unit (one point of catch-up room, or one win). On a
 * five-row card the pseudocounts total 0.25 units, which is less than one
 * display point whenever the other weights already total more than about 25.
 * Each blank is therefore a real share under 1%, and a dominant leader stays
 * on the same whole percent.
 *
 * The floor is not applied when every weight is zero (no share to smooth — the
 * card splits evenly) or when the season is over (the title is decided, so
 * the champion is 100% and the rest are a true 0%).
 */
export const F1_CHANCE_EPSILON = 0.05;

export interface F1ChanceBreakdown {
  /** Largest-remainder whole percents. Always sum to 100. */
  percent: number[];
  /**
   * Smoothed share in percent, before whole-point rounding.
   * A hard zero that received ε is strictly positive and, on a normal card, under 1.
   */
  exact: number[];
}

/**
 * Label for a card percentage. A positive share that largest-remainder left at
 * 0 whole points is "<1%", so a non-zero chance never renders as "0%".
 * A true zero (finished championship) stays "0%". The whole percents still add to 100.
 */
export function formatF1Chance(exact: number, percent: number): string {
  if (percent <= 0 && Number.isFinite(exact) && exact > 0) return "<1%";
  const shown = Number.isFinite(percent) ? Math.max(0, Math.round(percent)) : 0;
  return `${shown}%`;
}

function exactPercents(weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total <= 0) return Array.from({ length: n }, () => 0);
  return safe.map((w) => (w / total) * 100);
}

/**
 * Round positive weights to integer percentages that sum to 100 (largest-remainder).
 * Non-positive weights become 0%. If every weight is ≤0, split evenly.
 *
 * `denyRemainder` skips rows whose smoothed share is only the epsilon floor
 * (exact share in (0, 1)). Those stay at 0 whole points and display as "<1%".
 * Leftover points go to rows that already have a real share, so the floor cannot
 * round a 0.04% up to 1% and pull that point off the leader. If there are not
 * enough such rows to absorb the remainder, the leftover points fall through
 * so the card still sums to 100.
 */
export function normalizeChances(
  weights: number[],
  denyRemainder?: readonly boolean[]
): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    const base = Math.floor(100 / n);
    const chances = Array.from({ length: n }, () => base);
    let rem = 100 - base * n;
    for (let i = 0; rem > 0; i += 1, rem -= 1) chances[i] += 1;
    return chances;
  }

  const exact = safe.map((w) => (w / total) * 100);
  const floored = exact.map((x) => Math.floor(x));
  let rem = 100 - floored.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const chances = [...floored];
  const allowed = (i: number) => !denyRemainder?.[i];
  const primary = order.filter((row) => allowed(row.i));
  const fallback = order.filter((row) => !allowed(row.i));
  for (const row of [...primary, ...fallback]) {
    if (rem <= 0) break;
    chances[row.i] += 1;
    rem -= 1;
  }
  return chances;
}

function chanceBreakdown(raw: number[], floorZeros: boolean): F1ChanceBreakdown {
  const safe = raw.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const anyPositive = safe.some((w) => w > 0);
  const useFloor = floorZeros && anyPositive;
  const weights = useFloor ? safe.map((w) => (w > 0 ? w : F1_CHANCE_EPSILON)) : safe;
  const exact = exactPercents(weights);
  const denyRemainder = useFloor
    ? safe.map((w, i) => w <= 0 && exact[i]! > 0 && exact[i]! < 1)
    : undefined;
  return { percent: normalizeChances(weights, denyRemainder), exact };
}

/**
 * Share of a counting stat (wins, pts/race). A zero among positive stats gets
 * the epsilon floor (under 1% on a normal card). If every stat is 0, split evenly.
 */
export function shareChances(values: number[]): F1ChanceBreakdown {
  return chanceBreakdown(
    values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0)),
    true
  );
}

/**
 * Remaining-season title proxy. Weight is leftover catch-up room
 * (points + remaining ceiling − leader points). A contender who cannot catch
 * the leader even by taking every remaining point has room 0 and receives the
 * epsilon floor while races remain — a small share under 1%, not a hard zero.
 * Alive contenders keep their catch-up weights. When no points remain, the
 * leader (or tied leaders) take the card and everyone else is a true 0%.
 */
export function titleChances(points: number[], maxPointsLeft: number): F1ChanceBreakdown {
  if (points.length === 0) return { percent: [], exact: [] };
  const leaderPts = Math.max(...points.map((p) => (Number.isFinite(p) ? p : 0)), 0);
  const remain = Math.max(0, maxPointsLeft);
  if (remain === 0) {
    return chanceBreakdown(
      points.map((p) => (p === leaderPts && leaderPts > 0 ? 1 : 0)),
      false
    );
  }
  const scores = points.map((p) => {
    const pts = Number.isFinite(p) ? p : 0;
    return Math.max(0, pts + remain - leaderPts);
  });
  return chanceBreakdown(scores, true);
}
