import {
  formatChance,
  shareChances,
  titleChances,
  type ChanceBreakdown,
} from "@/lib/award-chances";

/** League win. */
export const FOOTBALL_POINTS_FOR_A_WIN = 3;
/** Premier League and La Liga both play 38. */
export const FOOTBALL_MATCHES_PER_TEAM = 38;

export interface FootballChanceFields {
  /** Largest-remainder whole percent. Values on a card sum to 100. */
  winChance: number;
  /** Smoothed share before whole-point rounding. */
  winChanceExact: number;
  /** "21%" or "<1%". A positive share never renders as "0%". */
  winChanceLabel: string;
}

/** Points a club can still take by winning every match it has left. */
export function pointsStillAvailable(played: number): number {
  const playedSafe = Number.isFinite(played) ? played : 0;
  const left = Math.max(0, FOOTBALL_MATCHES_PER_TEAM - playedSafe);
  return left * FOOTBALL_POINTS_FOR_A_WIN;
}

/**
 * Title proxy from the league table. Each club's ceiling is its own matches
 * left × 3, so a game in hand is points still available. A club that cannot
 * catch the leader even by winning out keeps the shared epsilon floor.
 */
export function footballTitleChances(points: number[], played: number[]): ChanceBreakdown {
  const ceilings = points.map((_, i) => pointsStillAvailable(played[i] ?? 0));
  return titleChances(points, ceilings);
}

/** Top-scorer card: same share model as F1 race wins, including the zero-goal floor. */
export function footballScorerChances(goals: number[]): ChanceBreakdown {
  return shareChances(goals);
}

export function footballSeasonProgress(playedCounts: number[]): number {
  const played = playedCounts.reduce(
    (max, value) => Math.max(max, Number.isFinite(value) ? value : 0),
    0
  );
  return Math.min(100, Math.round((played / FOOTBALL_MATCHES_PER_TEAM) * 100));
}

export function chanceFields(chances: ChanceBreakdown, index: number): FootballChanceFields {
  const winChance = chances.percent[index] ?? 0;
  const winChanceExact = chances.exact[index] ?? 0;
  return {
    winChance,
    winChanceExact,
    winChanceLabel: formatChance(winChanceExact, winChance),
  };
}
