import type {
  LeagueRaceInsight,
  LeagueStandingRow,
  LeagueStandings,
  LeagueZone,
} from "@/lib/la-liga-types";
import { highestFinishedMatchday } from "@/lib/league-matchdays";
import type { MatchInfo, TeamInfo } from "@/lib/types";

const TOTAL_MATCHDAYS = 38;
const MATCHES_PER_TEAM = 38;

export function zoneForPosition(position: number): LeagueZone {
  if (position <= 4) return "CHAMPIONS_LEAGUE";
  if (position === 5) return "EUROPA_LEAGUE";
  if (position === 6) return "CONFERENCE_LEAGUE";
  if (position >= 18) return "RELEGATION";
  return "MID_TABLE";
}

type TeamStats = Omit<LeagueStandingRow, "position" | "zone" | "form">;

function initStats(team: TeamInfo): TeamStats {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function applyResult(stats: TeamStats, goalsFor: number, goalsAgainst: number) {
  stats.played += 1;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;
  stats.goalDifference = stats.goalsFor - stats.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    stats.won += 1;
    stats.points += 3;
  } else if (goalsFor < goalsAgainst) {
    stats.lost += 1;
  } else {
    stats.drawn += 1;
    stats.points += 1;
  }
}

/** Both league meetings. A single result is not a head-to-head tie-break. */
const H2H_MATCHES_REQUIRED = 2;

function compareOverall(a: TeamStats, b: TeamStats): number {
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.team.name.localeCompare(b.team.name);
}

function isFinishedScore(match: MatchInfo): match is MatchInfo & { homeScore: number; awayScore: number } {
  return match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;
}

function meetingsBetween(matches: MatchInfo[], codeA: string, codeB: string): number {
  let count = 0;
  for (const match of matches) {
    if (!isFinishedScore(match)) continue;
    const home = match.homeTeam.code;
    const away = match.awayTeam.code;
    if ((home === codeA && away === codeB) || (home === codeB && away === codeA)) count += 1;
  }
  return count;
}

function headToHeadComplete(codes: string[], matches: MatchInfo[]): boolean {
  for (let i = 0; i < codes.length; i += 1) {
    for (let j = i + 1; j < codes.length; j += 1) {
      if (meetingsBetween(matches, codes[i]!, codes[j]!) < H2H_MATCHES_REQUIRED) return false;
    }
  }
  return true;
}

function miniTable(code: string, matches: MatchInfo[], pool: Set<string>) {
  let points = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const match of matches) {
    if (!isFinishedScore(match)) continue;
    if (!pool.has(match.homeTeam.code) || !pool.has(match.awayTeam.code)) continue;
    const home = match.homeTeam.code === code;
    const away = match.awayTeam.code === code;
    if (!home && !away) continue;
    const scored = home ? match.homeScore : match.awayScore;
    const conceded = home ? match.awayScore : match.homeScore;
    goalsFor += scored;
    goalsAgainst += conceded;
    if (scored > conceded) points += 3;
    else if (scored === conceded) points += 1;
  }
  return { points, goalDifference: goalsFor - goalsAgainst };
}

/**
 * Clubs level on points, per RFEF Normas 2026/27 art. 10 (final classification).
 *
 * Two clubs: head-to-head goal difference, then overall goal difference, then
 * goals scored. Head-to-head points ranks those two the same way, so it is
 * applied first.
 *
 * Three or more: mini-table of the matches among them. Distinct mini-table
 * points are final — later criteria do not reorder that. If two clubs stay
 * level, the next step is goal difference in the matches between that pair
 * only. If three or more stay level, it is goal difference among that subset.
 * Overall goal difference and goals scored follow.
 *
 * Until every pair in the tie has played both meetings, head-to-head is
 * skipped (the in-season table). Fair play and a neutral-ground play-off are
 * not applied; the club name orders whatever is still level.
 */
function orderLevelOnPoints(group: TeamStats[], matches: MatchInfo[]): TeamStats[] {
  if (group.length <= 1) return group;
  const codes = group.map((team) => team.team.code);
  if (!headToHeadComplete(codes, matches)) return [...group].sort(compareOverall);
  return orderByMiniTable(group, matches);
}

function compareHeadToHead(a: TeamStats, b: TeamStats, matches: MatchInfo[], pool: Set<string>): number {
  const miniA = miniTable(a.team.code, matches, pool);
  const miniB = miniTable(b.team.code, matches, pool);
  if (miniB.points !== miniA.points) return miniB.points - miniA.points;
  if (miniB.goalDifference !== miniA.goalDifference) {
    return miniB.goalDifference - miniA.goalDifference;
  }
  return compareOverall(a, b);
}

function orderStillLevel(bucket: TeamStats[], matches: MatchInfo[]): TeamStats[] {
  if (bucket.length <= 1) return bucket;
  const pool = new Set(bucket.map((team) => team.team.code));
  if (bucket.length === 2) {
    return [...bucket].sort((a, b) => compareHeadToHead(a, b, matches, pool));
  }
  return [...bucket].sort((a, b) => {
    const gdA = miniTable(a.team.code, matches, pool).goalDifference;
    const gdB = miniTable(b.team.code, matches, pool).goalDifference;
    if (gdB !== gdA) return gdB - gdA;
    return compareOverall(a, b);
  });
}

function orderByMiniTable(group: TeamStats[], matches: MatchInfo[]): TeamStats[] {
  if (group.length === 2) {
    const pool = new Set(group.map((team) => team.team.code));
    return [...group].sort((a, b) => compareHeadToHead(a, b, matches, pool));
  }

  const pool = new Set(group.map((team) => team.team.code));
  const annotated = group.map((team) => ({
    team,
    miniPoints: miniTable(team.team.code, matches, pool).points,
  }));
  const distinct = new Set(annotated.map((row) => row.miniPoints));
  if (distinct.size === annotated.length) {
    return annotated
      .sort(
        (a, b) =>
          b.miniPoints - a.miniPoints || a.team.team.name.localeCompare(b.team.team.name)
      )
      .map((row) => row.team);
  }

  const buckets = new Map<number, TeamStats[]>();
  for (const row of annotated) {
    const list = buckets.get(row.miniPoints) ?? [];
    list.push(row.team);
    buckets.set(row.miniPoints, list);
  }

  const ordered: TeamStats[] = [];
  for (const points of [...buckets.keys()].sort((a, b) => b - a)) {
    ordered.push(...orderStillLevel(buckets.get(points) ?? [], matches));
  }
  return ordered;
}

function orderLaLigaRows(rows: TeamStats[], matches: MatchInfo[]): TeamStats[] {
  const buckets = new Map<number, TeamStats[]>();
  for (const row of rows) {
    const list = buckets.get(row.points) ?? [];
    list.push(row);
    buckets.set(row.points, list);
  }

  const ordered: TeamStats[] = [];
  for (const points of [...buckets.keys()].sort((a, b) => b - a)) {
    ordered.push(...orderLevelOnPoints(buckets.get(points) ?? [], matches));
  }
  return ordered;
}

function computeForm(code: string, matches: MatchInfo[]): Array<"W" | "D" | "L"> {
  const finished = matches
    .filter(
      (m) =>
        m.status === "FINISHED" &&
        m.homeScore !== null &&
        m.awayScore !== null &&
        (m.homeTeam.code === code || m.awayTeam.code === code)
    )
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, 5);

  return finished.map((match) => {
    const home = match.homeTeam.code === code;
    const gf = home ? match.homeScore! : match.awayScore!;
    const ga = home ? match.awayScore! : match.homeScore!;
    if (gf > ga) return "W";
    if (gf < ga) return "L";
    return "D";
  });
}

function currentMatchday(matches: MatchInfo[]): number {
  return highestFinishedMatchday(matches, TOTAL_MATCHDAYS);
}

export function computeLeagueStandings(
  matches: MatchInfo[],
  seasonLabel: string,
  seedTeams: TeamInfo[]
): LeagueStandings {
  const byCode = new Map<string, TeamStats>();

  for (const team of seedTeams) {
    byCode.set(team.code, initStats(team));
  }

  for (const match of matches) {
    if (match.status !== "FINISHED" || match.homeScore === null || match.awayScore === null) {
      continue;
    }
    if (!byCode.has(match.homeTeam.code)) {
      byCode.set(match.homeTeam.code, initStats(match.homeTeam));
    }
    if (!byCode.has(match.awayTeam.code)) {
      byCode.set(match.awayTeam.code, initStats(match.awayTeam));
    }
    applyResult(byCode.get(match.homeTeam.code)!, match.homeScore, match.awayScore);
    applyResult(byCode.get(match.awayTeam.code)!, match.awayScore, match.homeScore);
  }

  const sorted = orderLaLigaRows([...byCode.values()], matches);
  const rows: LeagueStandingRow[] = sorted.map((stats, index) => {
    const position = index + 1;
    return {
      ...stats,
      position,
      zone: zoneForPosition(position),
      form: computeForm(stats.team.code, matches),
    };
  });

  return {
    seasonLabel,
    matchday: currentMatchday(matches),
    totalMatchdays: TOTAL_MATCHDAYS,
    rows,
  };
}

export function computeTitleRace(standings: LeagueStandings): LeagueRaceInsight | null {
  const [leader, challenger] = standings.rows;
  if (!leader || !challenger) return null;

  const remaining = Math.max(0, MATCHES_PER_TEAM - leader.played);
  const gap = leader.points - challenger.points;
  const seasonNotStarted = standings.rows.every((r) => r.played === 0);

  if (seasonNotStarted) {
    return {
      kind: "title",
      title: "Title race",
      message:
        "The contestants are yet to be seen — kick a ball first, then we'll talk about leading.",
      leaderLabel: "TBD",
      chaseLabel: "TBD",
      remaining: MATCHES_PER_TEAM,
    };
  }

  if (remaining === 0) {
    return {
      kind: "title",
      title: "Champions",
      message: `${leader.team.name} are La Liga champions on ${leader.points} points.`,
      leaderLabel: `1 · ${leader.team.shortName ?? leader.team.name} · ${leader.points} pts`,
      chaseLabel: `2 · ${challenger.team.shortName ?? challenger.team.name} · ${challenger.points} pts`,
      remaining: 0,
    };
  }

  const mathematical = gap > remaining * 3;
  return {
    kind: "title",
    title: mathematical ? "Title sealed" : "Title race",
    message: mathematical
      ? `${leader.team.name} cannot be caught — ${gap} points clear with ${remaining} match${remaining === 1 ? "" : "es"} left.`
      : `${leader.team.name} lead ${challenger.team.name} by ${gap} point${gap === 1 ? "" : "s"} with ${remaining} match${remaining === 1 ? "" : "es"} left.`,
    leaderLabel: `1 · ${leader.team.shortName ?? leader.team.name} · ${leader.points} pts`,
    chaseLabel: `2 · ${challenger.team.shortName ?? challenger.team.name} · ${challenger.points} pts`,
    remaining,
  };
}

export function computeRelegationRace(standings: LeagueStandings): LeagueRaceInsight | null {
  if (standings.rows.length < 18) return null;

  const cut = standings.rows[16]!;
  const safety = standings.rows[17]!;
  const bottom = standings.rows[standings.rows.length - 1]!;
  const remaining = Math.max(0, MATCHES_PER_TEAM - safety.played);
  const seasonNotStarted = standings.rows.every((r) => r.played === 0);

  if (seasonNotStarted) {
    return {
      kind: "relegation",
      title: "Relegation battle",
      message:
        "The contestants are yet to be seen — nobody's packing for Segunda until the whistle blows.",
      leaderLabel: "TBD",
      chaseLabel: "TBD",
      remaining: MATCHES_PER_TEAM,
    };
  }

  if (remaining === 0) {
    const relegated = standings.rows
      .filter((r) => r.zone === "RELEGATION")
      .map((r) => r.team.shortName ?? r.team.name);
    return {
      kind: "relegation",
      title: "Relegated",
      message: `${relegated.join(", ")} go down to Segunda after ${standings.seasonLabel}.`,
      leaderLabel: `17 · ${cut.team.shortName ?? cut.team.name} · ${cut.points} pts`,
      chaseLabel: `20 · ${bottom.team.shortName ?? bottom.team.name} · ${bottom.points} pts`,
      remaining: 0,
    };
  }

  const gap = cut.points - safety.points;
  return {
    kind: "relegation",
    title: "Relegation battle",
    message: `${safety.team.name} sit in the drop zone, ${gap} point${gap === 1 ? "" : "s"} from safety with ${remaining} match${remaining === 1 ? "" : "es"} left.`,
    leaderLabel: `17 · ${cut.team.shortName ?? cut.team.name} · ${cut.points} pts`,
    chaseLabel: `18 · ${safety.team.shortName ?? safety.team.name} · ${safety.points} pts`,
    remaining,
  };
}

