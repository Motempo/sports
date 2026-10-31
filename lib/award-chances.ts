/**
 * Shared remaining-season chance model (MOT-87).
 *
 * Championship cards weight leftover catch-up room. A counting-stat card
 * (race wins, top scorer) shares that stat. A hard zero is lifted by
 * `CHANCE_EPSILON` so the row stays under 1% instead of rendering as 0%,
 * except when the contest is already decided.
 */

/**
 * Pseudocount added only where the model weight is zero (eliminated on a title
 * card, or 0 wins / 0 goals).
 *
 * This is an epsilon floor, not a full Laplace add-α on every row. Positive
 * weights keep their relative size; only a hard zero is lifted. ε = 0.05 is a
 * twentieth of one model unit (one point of catch-up room, or one win / goal).
 * On a five-row card the pseudocounts total 0.25 units, which is less than one
 * display point whenever the other weights already total more than about 25.
 * Each blank is therefore a real share under 1%, and a dominant leader stays
 * on the same whole percent.
 *
 * The floor is not applied when every weight is zero (no share to smooth — the
 * card splits evenly) or when the contest is over (the leader is 100% and the
 * rest are a true 0%).
 */
export const CHANCE_EPSILON = 0.05;

export interface ChanceBreakdown {
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
export function formatChance(exact: number, percent: number): string {
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

function chanceBreakdown(raw: number[], floorZeros: boolean): ChanceBreakdown {
  const safe = raw.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const anyPositive = safe.some((w) => w > 0);
  const useFloor = floorZeros && anyPositive;
  const weights = useFloor ? safe.map((w) => (w > 0 ? w : CHANCE_EPSILON)) : safe;
  const exact = exactPercents(weights);
  const denyRemainder = useFloor
    ? safe.map((w, i) => w <= 0 && exact[i]! > 0 && exact[i]! < 1)
    : undefined;
  return { percent: normalizeChances(weights, denyRemainder), exact };
}

/**
 * Share of a counting stat (wins, goals, pts/race). A zero among positive stats
 * gets the epsilon floor (under 1% on a normal card). If every stat is 0, split evenly.
 */
export function shareChances(values: number[]): ChanceBreakdown {
  return chanceBreakdown(
    values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0)),
    true
  );
}

function leaderTakesIt(points: number[], leaderPts: number): ChanceBreakdown {
  return chanceBreakdown(
    points.map((p) => (p === leaderPts && leaderPts > 0 ? 1 : 0)),
    false
  );
}

/**
 * Remaining-season title proxy. Weight is leftover catch-up room
 * (points + remaining ceiling − leader points).
 *
 * `maxPointsLeft` is one shared ceiling (every contender can still score the
 * same number of points) or a per-row ceiling (football games in hand: each
 * club's own matches left × 3). A contender who cannot catch the leader even
 * by taking every remaining point has room 0 and receives the epsilon floor
 * while points remain — a small share under 1%, not a hard zero. Alive
 * contenders keep their catch-up weights.
 *
 * When no points remain, or nobody can go past the leader's current total,
 * the leader (or tied leaders) take the card and everyone else is a true 0%.
 * If the current leader has no matches left but another club still has
 * catch-up room, the leader keeps a weight equal to that best chase so a
 * postponed fixture cannot wipe the club that is actually top.
 */
export function titleChances(
  points: number[],
  maxPointsLeft: number | readonly number[]
): ChanceBreakdown {
  if (points.length === 0) return { percent: [], exact: [] };
  const leaderPts = Math.max(...points.map((p) => (Number.isFinite(p) ? p : 0)), 0);
  const remainFor = (i: number): number => {
    const raw = typeof maxPointsLeft === "number" ? maxPointsLeft : (maxPointsLeft[i] ?? 0);
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  };
  const anyRemain = points.some((_, i) => remainFor(i) > 0);
  if (!anyRemain) return leaderTakesIt(points, leaderPts);

  const scores = points.map((p, i) => {
    const pts = Number.isFinite(p) ? p : 0;
    return Math.max(0, pts + remainFor(i) - leaderPts);
  });
  if (!scores.some((score) => score > 0)) return leaderTakesIt(points, leaderPts);

  const leaderHasRoom = points.some((p, i) => p === leaderPts && (scores[i] ?? 0) > 0);
  const weighted = leaderHasRoom
    ? scores
    : scores.map((score, i) => (points[i] === leaderPts ? Math.max(...scores) : score));
  return chanceBreakdown(weighted, true);
}
