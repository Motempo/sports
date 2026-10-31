import type { F1GrandPrix } from "@/lib/f1-types";

export {
  CHANCE_EPSILON as F1_CHANCE_EPSILON,
  formatChance as formatF1Chance,
  normalizeChances,
  shareChances,
  titleChances,
} from "@/lib/award-chances";
export type { ChanceBreakdown as F1ChanceBreakdown } from "@/lib/award-chances";

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
