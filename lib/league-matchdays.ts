import type { MatchInfo } from "@/lib/types";

/**
 * One league fixture used to recover matchweek numbers.
 * `explicitRound` is set when the feed already names the round (ESPN week,
 * "Matchweek 12" note, football-data matchday, …).
 */
export interface LeagueRoundFixture {
  id: string;
  kickoff: string;
  homeKey: string;
  awayKey: string;
  explicitRound?: number | null;
}

const DAY_MS = 86_400_000;
/** A longer quiet stretch starts a new round. Fri–Mon stays inside one round. */
const ROUND_GAP_DAYS = 3;
/** First kickoff to last kickoff inside a single weekend / midweek slate. */
const ROUND_SPAN_DAYS = 4;
/** One or two fixtures sitting in a gap are postponements, not a new week. */
const ORPHAN_MAX = 2;
/** Halves of one matchweek postponed a few days apart can still be merged. */
const MERGE_GAP_DAYS = 8;

function kickoffMs(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function slateSize(fixtures: LeagueRoundFixture[]): number {
  const clubs = new Set<string>();
  for (const fixture of fixtures) {
    clubs.add(fixture.homeKey);
    clubs.add(fixture.awayKey);
  }
  // 20 clubs → 10 matches. A partial feed still uses one appearance per club.
  return Math.max(1, Math.floor(clubs.size / 2));
}

function clubsIn(fixtures: LeagueRoundFixture[], indexes: number[]): Set<string> {
  const clubs = new Set<string>();
  for (const index of indexes) {
    const fixture = fixtures[index]!;
    clubs.add(fixture.homeKey);
    clubs.add(fixture.awayKey);
  }
  return clubs;
}

function medianMs(fixtures: LeagueRoundFixture[], indexes: number[]): number {
  const times = indexes.map((index) => kickoffMs(fixtures[index]!.kickoff)).sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)] ?? 0;
}

function minMs(fixtures: LeagueRoundFixture[], indexes: number[]): number {
  let min = Infinity;
  for (const index of indexes) min = Math.min(min, kickoffMs(fixtures[index]!.kickoff));
  return min;
}

function maxMs(fixtures: LeagueRoundFixture[], indexes: number[]): number {
  let max = -Infinity;
  for (const index of indexes) max = Math.max(max, kickoffMs(fixtures[index]!.kickoff));
  return max;
}

/**
 * A postponed fixture may fill a round that is only a few games short.
 * A genuine midweek slate (well under a full round) is left alone, so it
 * does not absorb later weeks or get swallowed by an earlier one.
 */
function canAbsorbPostponement(size: number, slate: number): boolean {
  return size < slate && size >= Math.max(1, slate - 3);
}

function positiveRound(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

/**
 * Matchweek number for each fixture, aligned with `fixtures`.
 *
 * Feeds that already carry a round keep it, including a postponement whose
 * kickoff has moved into a later week. Fixtures without a round are grouped
 * by kickoff gap and by the rule that a club plays once per round. A
 * postponed match that lands between later weeks is put back into the
 * earlier short round that is missing those clubs, so the weeks after it
 * keep their numbers.
 */
export function assignLeagueMatchdays(fixtures: LeagueRoundFixture[]): number[] {
  const rounds = new Array<number>(fixtures.length).fill(0);
  if (fixtures.length === 0) return rounds;

  const explicitIndexes: number[] = [];
  const openIndexes: number[] = [];
  for (let index = 0; index < fixtures.length; index++) {
    const round = positiveRound(fixtures[index]!.explicitRound);
    if (round != null) {
      explicitIndexes.push(index);
      rounds[index] = round;
    } else {
      openIndexes.push(index);
    }
  }

  if (openIndexes.length === 0) return rounds;

  const openFixtures = openIndexes.map((index) => fixtures[index]!);
  const inferred = inferRounds(openFixtures);

  if (explicitIndexes.length === 0) {
    openIndexes.forEach((index, position) => {
      rounds[index] = inferred[position]!;
    });
    return rounds;
  }

  // Unlabeled rows fill an explicit round that is missing both clubs.
  // Anything left over is a real round the feed did not number, placed
  // after the highest explicit week so those weeks are not renumbered.
  const slate = slateSize(fixtures);
  const byRound = new Map<number, number[]>();
  for (const index of explicitIndexes) {
    const round = rounds[index]!;
    const list = byRound.get(round) ?? [];
    list.push(index);
    byRound.set(round, list);
  }

  const byCluster = new Map<number, number[]>();
  openIndexes.forEach((index, position) => {
    const cluster = inferred[position]!;
    const list = byCluster.get(cluster) ?? [];
    list.push(index);
    byCluster.set(cluster, list);
  });

  let nextRound = Math.max(...explicitIndexes.map((index) => rounds[index]!));
  for (const cluster of [...byCluster.keys()].sort((a, b) => a - b)) {
    const still: number[] = [];
    for (const index of byCluster.get(cluster)!) {
      const placed = placeInExplicitHole(fixtures, index, byRound, slate);
      if (placed == null) still.push(index);
      else rounds[index] = placed;
    }
    if (still.length === 0) continue;
    nextRound += 1;
    const list: number[] = [];
    for (const index of still) {
      rounds[index] = nextRound;
      list.push(index);
    }
    byRound.set(nextRound, list);
  }

  return rounds;
}

function placeInExplicitHole(
  fixtures: LeagueRoundFixture[],
  index: number,
  byRound: Map<number, number[]>,
  slate: number
): number | null {
  const fixture = fixtures[index]!;
  const kick = kickoffMs(fixture.kickoff);
  let best: { round: number; dist: number } | null = null;
  for (const [round, members] of byRound) {
    if (!canAbsorbPostponement(members.length, slate)) continue;
    const clubs = clubsIn(fixtures, members);
    if (clubs.has(fixture.homeKey) || clubs.has(fixture.awayKey)) continue;
    if (medianMs(fixtures, members) > kick) continue;
    const dist = Math.abs(kick - medianMs(fixtures, members));
    if (!best || dist < best.dist) best = { round, dist };
  }
  if (!best) return null;
  byRound.get(best.round)!.push(index);
  return best.round;
}

function inferRounds(fixtures: LeagueRoundFixture[]): number[] {
  const slate = slateSize(fixtures);
  const order = fixtures
    .map((_, index) => index)
    .sort(
      (a, b) => kickoffMs(fixtures[a]!.kickoff) - kickoffMs(fixtures[b]!.kickoff) || a - b
    );

  const clusters: number[][] = [];
  for (const index of order) {
    const fixture = fixtures[index]!;
    const kick = kickoffMs(fixture.kickoff);
    const current = clusters[clusters.length - 1];
    if (current && current.length > 0 && current.length < slate) {
      const clubs = clubsIn(fixtures, current);
      const prev = kickoffMs(fixtures[current[current.length - 1]!]!.kickoff);
      const first = kickoffMs(fixtures[current[0]!]!.kickoff);
      const gapDays = (kick - prev) / DAY_MS;
      const spanDays = (kick - first) / DAY_MS;
      if (
        !clubs.has(fixture.homeKey) &&
        !clubs.has(fixture.awayKey) &&
        gapDays < ROUND_GAP_DAYS &&
        spanDays <= ROUND_SPAN_DAYS
      ) {
        current.push(index);
        continue;
      }
    }
    clusters.push([index]);
  }

  moveEdgePostponements(fixtures, clusters, slate);
  const kept = reattachOrphans(fixtures, clusters, slate);
  mergeSplitRounds(fixtures, kept, slate);

  kept.sort((a, b) => minMs(fixtures, a) - minMs(fixtures, b));
  const assigned = new Array<number>(fixtures.length).fill(1);
  kept.forEach((cluster, clusterIndex) => {
    for (const index of cluster) assigned[index] = clusterIndex + 1;
  });
  return assigned;
}

/**
 * A postponement played a couple of days before the next week gets glued to
 * that week. If it sits on the edge of the cluster and those clubs are
 * missing from an earlier nearly-full round, move it back. Each fixture
 * moves at most once so it cannot bounce between holes.
 */
function moveEdgePostponements(
  fixtures: LeagueRoundFixture[],
  clusters: number[][],
  slate: number
): void {
  const locked = new Set<number>();
  let moved = true;
  while (moved) {
    moved = false;
    for (let ci = 0; ci < clusters.length && !moved; ci++) {
      const cluster = clusters[ci]!;
      if (cluster.length < 2) continue;
      const sorted = [...cluster].sort(
        (a, b) => kickoffMs(fixtures[a]!.kickoff) - kickoffMs(fixtures[b]!.kickoff)
      );
      const edges: Array<[number, number]> = [
        [sorted[0]!, sorted[1]!],
        [sorted[sorted.length - 1]!, sorted[sorted.length - 2]!],
      ];
      for (const [edge, neighbor] of edges) {
        if (locked.has(edge)) continue;
        const gapDays =
          Math.abs(
            kickoffMs(fixtures[edge]!.kickoff) - kickoffMs(fixtures[neighbor]!.kickoff)
          ) / DAY_MS;
        if (gapDays < 2) continue;
        const target = earlierHole(fixtures, clusters, ci, edge, slate);
        if (target == null) continue;
        clusters[target]!.push(edge);
        clusters[ci] = cluster.filter((index) => index !== edge);
        locked.add(edge);
        moved = true;
        break;
      }
    }
  }
}

function earlierHole(
  fixtures: LeagueRoundFixture[],
  clusters: number[][],
  from: number,
  fixtureIndex: number,
  slate: number
): number | null {
  const fixture = fixtures[fixtureIndex]!;
  const kick = kickoffMs(fixture.kickoff);
  let best: { index: number; dist: number } | null = null;
  for (let index = 0; index < clusters.length; index++) {
    if (index === from) continue;
    const cluster = clusters[index]!;
    if (cluster.length === 0 || !canAbsorbPostponement(cluster.length, slate)) continue;
    const clubs = clubsIn(fixtures, cluster);
    if (clubs.has(fixture.homeKey) || clubs.has(fixture.awayKey)) continue;
    const mid = medianMs(fixtures, cluster);
    if (mid > kick) continue;
    const dist = kick - mid;
    if (!best || dist < best.dist) best = { index, dist };
  }
  return best?.index ?? null;
}

function reattachOrphans(
  fixtures: LeagueRoundFixture[],
  clusters: number[][],
  slate: number
): number[][] {
  const kept: number[][] = [];
  for (const cluster of clusters) {
    if (cluster.length === 0) continue;
    if (cluster.length > ORPHAN_MAX) {
      kept.push(cluster);
      continue;
    }
    const leftover: number[] = [];
    for (const index of cluster) {
      const target = earlierHole(fixtures, kept, -1, index, slate);
      if (target == null) leftover.push(index);
      else kept[target]!.push(index);
    }
    if (leftover.length > 0) kept.push(leftover);
  }
  return kept.filter((cluster) => cluster.length > 0);
}

/**
 * A matchweek split across two nearby dates (five games, then the other
 * five) is one round: the clubs are disjoint and together they make a full
 * slate. Merging them keeps the following week from being bumped.
 */
function mergeSplitRounds(
  fixtures: LeagueRoundFixture[],
  clusters: number[][],
  slate: number
): void {
  let merged = true;
  while (merged) {
    merged = false;
    clusters.sort((a, b) => minMs(fixtures, a) - minMs(fixtures, b));
    for (let index = 0; index < clusters.length - 1; index++) {
      const left = clusters[index]!;
      const right = clusters[index + 1]!;
      if (left.length + right.length !== slate) continue;
      const leftClubs = clubsIn(fixtures, left);
      let overlap = false;
      for (const club of clubsIn(fixtures, right)) {
        if (leftClubs.has(club)) overlap = true;
      }
      if (overlap) continue;
      const gapDays = (minMs(fixtures, right) - maxMs(fixtures, left)) / DAY_MS;
      if (gapDays > MERGE_GAP_DAYS) continue;
      clusters[index] = left.concat(right);
      clusters.splice(index + 1, 1);
      merged = true;
      break;
    }
  }
}

/**
 * League-table "Matchday N" — the highest round that already has a
 * finished game. Later scheduled weeks do not count. Points stay on the
 * results; this only names the week.
 */
export function highestFinishedMatchday(
  matches: Array<Pick<MatchInfo, "status" | "group" | "homeTeam" | "awayTeam">>,
  totalMatchdays = 38
): number {
  const finished = matches.filter((match) => match.status === "FINISHED");
  if (finished.length === 0) return 0;

  let maxRound = 0;
  for (const match of finished) {
    const fromGroup = match.group?.match(/(\d+)/)?.[1];
    if (fromGroup) maxRound = Math.max(maxRound, Number(fromGroup));
  }
  if (maxRound > 0) return Math.min(totalMatchdays, maxRound);

  const playedByTeam = new Map<string, number>();
  for (const match of finished) {
    playedByTeam.set(match.homeTeam.code, (playedByTeam.get(match.homeTeam.code) ?? 0) + 1);
    playedByTeam.set(match.awayTeam.code, (playedByTeam.get(match.awayTeam.code) ?? 0) + 1);
  }
  const played = Math.max(0, ...playedByTeam.values());
  return Math.min(totalMatchdays, played);
}
