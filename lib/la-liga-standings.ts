import type {
  LeagueRaceInsight,
  LeagueStandingRow,
  LeagueStandings,
  LeagueZone,
} from "@/lib/la-liga-types";
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

function compareRows(a: TeamStats, b: TeamStats): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.team.name.localeCompare(b.team.name);
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
  const finished = matches.filter((m) => m.status === "FINISHED");
  if (finished.length === 0) return 0;
  let maxMd = 0;
  for (const match of finished) {
    const fromGroup = match.group?.match(/(\d+)/)?.[1];
    if (fromGroup) maxMd = Math.max(maxMd, Number(fromGroup));
  }
  if (maxMd > 0) return Math.min(TOTAL_MATCHDAYS, maxMd);
  const playedByTeam = finished.reduce<Record<string, number>>((acc, m) => {
    acc[m.homeTeam.code] = (acc[m.homeTeam.code] ?? 0) + 1;
    acc[m.awayTeam.code] = (acc[m.awayTeam.code] ?? 0) + 1;
    return acc;
  }, {});
  const played = Math.max(0, ...Object.values(playedByTeam));
  return Math.min(TOTAL_MATCHDAYS, played);
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

  const sorted = [...byCode.values()].sort(compareRows);
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
