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
 * Round positive weights to integer percentages that sum to 100 (largest-remainder).
 * Non-positive weights become 0%. If every weight is ≤0, split evenly.
 */
export function normalizeChances(weights: number[]): number[] {
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
  for (let k = 0; k < order.length && rem > 0; k += 1, rem -= 1) {
    chances[order[k].i] += 1;
  }
  return chances;
}

/**
 * Share of a counting stat (wins, pts/race). Drivers with 0 get 0% — no soft floor.
 */
export function shareChances(values: number[]): number[] {
  return normalizeChances(values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0)));
}

/**
 * Remaining-season title proxy: a contender who cannot catch the leader even by taking
 * every remaining point while the leader scores nothing is eliminated (0%).
 * Among drivers still mathematically alive, weight by leftover catch-up room
 * (points + remaining ceiling − leader points), then normalize to 100%.
 */
export function titleChances(points: number[], maxPointsLeft: number): number[] {
  if (points.length === 0) return [];
  const leaderPts = Math.max(...points.map((p) => (Number.isFinite(p) ? p : 0)), 0);
  const remain = Math.max(0, maxPointsLeft);
  const scores = points.map((p) => {
    const pts = Number.isFinite(p) ? p : 0;
    return Math.max(0, pts + remain - leaderPts);
  });
  if (remain === 0) {
    return shareChances(points.map((p) => (p === leaderPts && leaderPts > 0 ? 1 : 0)));
  }
  return normalizeChances(scores);
}
