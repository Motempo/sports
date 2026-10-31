import {
  formProjectionChances,
  formatChance,
  type ChanceBreakdown,
  type FormProjectionRow,
} from "@/lib/award-chances";

/** League win. */
export const FOOTBALL_POINTS_FOR_A_WIN = 3;
/** Premier League and La Liga both play 38. */
export const FOOTBALL_MATCHES_PER_TEAM = 38;
/**
 * Matches of league-average form mixed into a rate. After this many real
 * matches the club's own rate has half the blend; a full season crowds the
 * average out.
 */
export const FORM_PRIOR_MATCHES = 8;
/**
 * Variance of points from one match used as softmax temperature
 * sqrt(matches left × this) = 2 × sqrt(matches left).
 * Wider than the raw 0/1/3 variance (~1.6) so the unplayed fixtures still
 * count as uncertainty, while a real points gap is no longer washed out.
 */
export const POINTS_MATCH_VARIANCE = 4;
/**
 * Variance of goals from one player-match. Scorer temperature is
 * 1.5 × sqrt(matches left). A hot scoring rate shows early; a two-goal
 * lead with a full spring still to play is not treated as decided.
 */
export const GOALS_MATCH_VARIANCE = 2.25;
/** A hat-trick in every match still to play. Past that, a scorer cannot catch up. */
export const MAX_GOALS_PER_MATCH = 3;

export interface FootballChanceFields {
  /** Largest-remainder whole percent. Values on a card sum to 100. */
  winChance: number;
  /** Smoothed share before whole-point rounding. */
  winChanceExact: number;
  /** "42%" or "<1%". A positive share never renders as "0%". */
  winChanceLabel: string;
}

export interface FootballRateSample {
  totals: number[];
  played: number[];
}

/** Points a club can still take by winning every match it has left. */
export function pointsStillAvailable(played: number): number {
  const playedSafe = Number.isFinite(played) ? played : 0;
  const left = Math.max(0, FOOTBALL_MATCHES_PER_TEAM - playedSafe);
  return left * FOOTBALL_POINTS_FOR_A_WIN;
}

export function matchesLeft(played: number): number {
  const playedSafe = Number.isFinite(played) ? played : 0;
  return Math.max(0, FOOTBALL_MATCHES_PER_TEAM - playedSafe);
}

/** Mean of total/played over rows that have kicked off. */
export function meanRate(totals: readonly number[], played: readonly number[]): number {
  let sum = 0;
  let matches = 0;
  const n = Math.max(totals.length, played.length);
  for (let i = 0; i < n; i += 1) {
    const sample = Number.isFinite(played[i]) ? Math.max(0, played[i]!) : 0;
    const total = Number.isFinite(totals[i]) ? totals[i]! : 0;
    if (sample > 0) {
      matches += sample;
      sum += total;
    }
  }
  return matches > 0 ? sum / matches : 0;
}

function projectRows(
  rows: FormProjectionRow[],
  averageRate: number,
  matchVariance: number
): ChanceBreakdown {
  return formProjectionChances(rows, {
    averageRate,
    priorMatches: FORM_PRIOR_MATCHES,
    matchVariance,
  });
}

/**
 * Title chances for the clubs on the card.
 * `league` is the whole table, so the points-per-match prior is the league
 * average rather than the top five. Omitted, the prior is the clubs passed in.
 */
export function footballTitleChances(
  points: number[],
  played: number[],
  league?: FootballRateSample
): ChanceBreakdown {
  const averageRate = meanRate(league?.totals ?? points, league?.played ?? played);
  const rows: FormProjectionRow[] = points.map((total, i) => {
    const playedSafe = Number.isFinite(played[i]) ? Math.max(0, played[i]!) : 0;
    const remaining = matchesLeft(playedSafe);
    return {
      total: Number.isFinite(total) ? total : 0,
      played: playedSafe,
      remaining,
      ceiling: remaining * FOOTBALL_POINTS_FOR_A_WIN,
    };
  });
  return projectRows(rows, averageRate, POINTS_MATCH_VARIANCE);
}

export interface FootballScorerInput {
  goals: number;
  /** Appearances the scoring rate is measured over. */
  played: number;
  /** Matches the player's club still has. */
  remaining: number;
}

/**
 * Top-scorer chances. Projected goals use goals per match played, blended
 * toward the average rate of `population` (the scorers in the feed, or every
 * club when the card is showing club goals). A player who cannot catch the
 * leader even with a hat-trick in every match the club has left gets the floor.
 */
export function footballScorerChances(
  scorers: readonly FootballScorerInput[],
  population?: FootballRateSample
): ChanceBreakdown {
  const averageRate = meanRate(
    population?.totals ?? scorers.map((row) => row.goals),
    population?.played ?? scorers.map((row) => row.played)
  );
  const rows: FormProjectionRow[] = scorers.map((row) => {
    const remaining = Math.max(0, Number.isFinite(row.remaining) ? row.remaining : 0);
    const played = Number.isFinite(row.played) ? Math.max(0, row.played) : 0;
    return {
      total: Number.isFinite(row.goals) ? row.goals : 0,
      played,
      remaining,
      ceiling: remaining * MAX_GOALS_PER_MATCH,
    };
  });
  return projectRows(rows, averageRate, GOALS_MATCH_VARIANCE);
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
