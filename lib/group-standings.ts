import type { MatchInfo } from "@/lib/types";
import { buildTeamInfo } from "@/lib/team-info";
import {
  filterOfficialGroupMatches,
  officialGroupIds,
  officialGroupTeamCodes,
  isOfficialGroupPair,
} from "@/lib/wc2026-groups";

export type QualificationZone = "QUALIFIED" | "THIRD_BUBBLE" | "ELIMINATED";

export interface GroupStandingRow {
  team: MatchInfo["homeTeam"];
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  zone: QualificationZone;
}

export interface GroupStandings {
  groupId: string;
  groupLabel: string;
  rows: GroupStandingRow[];
  matchday: number;
  totalMatchdays: number;
}

export interface ThirdPlaceRow {
  team: MatchInfo["homeTeam"];
  groupId: string;
  groupLabel: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  rank: number;
  advances: boolean;
}

export function formatGroupLabel(groupId: string): string {
  return groupId.replace("GROUP_", "Group ");
}

type TeamStats = Omit<GroupStandingRow, "position" | "zone">;

function initStats(team: MatchInfo["homeTeam"]): TeamStats {
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

function miniGroupStats(
  code: string,
  tiedCodes: Set<string>,
  matches: MatchInfo[]
): { points: number; goalDifference: number; goalsFor: number } {
  let points = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const match of matches) {
    if (match.status !== "FINISHED" || match.homeScore === null || match.awayScore === null) {
      continue;
    }
    if (!tiedCodes.has(match.homeTeam.code) || !tiedCodes.has(match.awayTeam.code)) continue;

    if (match.homeTeam.code === code) {
      goalsFor += match.homeScore;
      goalsAgainst += match.awayScore;
      if (match.homeScore > match.awayScore) points += 3;
      else if (match.homeScore === match.awayScore) points += 1;
    } else if (match.awayTeam.code === code) {
      goalsFor += match.awayScore;
      goalsAgainst += match.homeScore;
      if (match.awayScore > match.homeScore) points += 3;
      else if (match.awayScore === match.homeScore) points += 1;
    }
  }

  return { points, goalDifference: goalsFor - goalsAgainst, goalsFor };
}

function compareStandings(
  a: TeamStats,
  b: TeamStats,
  matches: MatchInfo[],
  allRows: TeamStats[]
): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

  const tiedCodes = new Set(
    allRows.filter((row) => row.points === a.points).map((row) => row.team.code)
  );
  if (tiedCodes.size >= 2) {
    const miniA = miniGroupStats(a.team.code, tiedCodes, matches);
    const miniB = miniGroupStats(b.team.code, tiedCodes, matches);
    if (miniB.points !== miniA.points) return miniB.points - miniA.points;
    if (miniB.goalDifference !== miniA.goalDifference) {
      return miniB.goalDifference - miniA.goalDifference;
    }
    if (miniB.goalsFor !== miniA.goalsFor) return miniB.goalsFor - miniA.goalsFor;
  }

  return a.team.code.localeCompare(b.team.code);
}

export function computeGroupStandings(groupMatches: MatchInfo[]): GroupStandings[] {
  const officialMatches = filterOfficialGroupMatches(groupMatches);
  const byGroup = new Map<string, MatchInfo[]>();

  for (const match of officialMatches) {
    if (!match.group) continue;
    if (!isOfficialGroupPair(match.group, match.homeTeam.code, match.awayTeam.code)) continue;
    const list = byGroup.get(match.group) ?? [];
    list.push(match);
    byGroup.set(match.group, list);
  }

  const ordered = officialGroupIds().filter((groupId) => {
    const roster = officialGroupTeamCodes(groupId);
    return roster.length > 0 || byGroup.has(groupId);
  });

  return ordered.map((groupId) => {
    const matches = byGroup.get(groupId) ?? [];
    const teamMap = new Map<string, TeamStats>();

    for (const code of officialGroupTeamCodes(groupId)) {
      teamMap.set(code, initStats(buildTeamInfo(code, "")));
    }

    for (const match of matches) {
      if (!teamMap.has(match.homeTeam.code)) {
        teamMap.set(match.homeTeam.code, initStats(match.homeTeam));
      }
      if (!teamMap.has(match.awayTeam.code)) {
        teamMap.set(match.awayTeam.code, initStats(match.awayTeam));
      }
    }

    for (const match of matches) {
      if (match.status !== "FINISHED" || match.homeScore === null || match.awayScore === null) {
        continue;
      }
      const home = teamMap.get(match.homeTeam.code);
      const away = teamMap.get(match.awayTeam.code);
      if (home) applyResult(home, match.homeScore, match.awayScore);
      if (away) applyResult(away, match.awayScore, match.homeScore);
    }

    const allRows = [...teamMap.values()];
    const sorted = allRows.sort((a, b) => compareStandings(a, b, matches, allRows));

    const finishedCount = matches.filter((m) => m.status === "FINISHED").length;
    const rosterSize = Math.max(officialGroupTeamCodes(groupId).length, sorted.length, 1);
    const matchday = Math.min(3, Math.ceil(finishedCount / Math.max(1, rosterSize / 2)));

    const rows: GroupStandingRow[] = sorted.map((s, i) => {
      const position = i + 1;
      let zone: QualificationZone = "ELIMINATED";
      if (position <= 2) zone = "QUALIFIED";
      else if (position === 3) zone = "THIRD_BUBBLE";

      return { ...s, position, zone };
    });

    return {
      groupId,
      groupLabel: formatGroupLabel(groupId),
      rows,
      matchday,
      totalMatchdays: 3,
    };
  });
}

export function computeThirdPlaceTracker(standings: GroupStandings[]): {
  rows: ThirdPlaceRow[];
  cutlinePoints: number;
  cutlineGd: number;
} {
  const thirdPlace = standings
    .map((g) => {
      const third = g.rows.find((r) => r.position === 3);
      if (!third) return null;
      return {
        team: third.team,
        groupId: g.groupId,
        groupLabel: g.groupLabel,
        points: third.points,
        goalDifference: third.goalDifference,
        goalsFor: third.goalsFor,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

  const rows: ThirdPlaceRow[] = thirdPlace.map((r, i) => ({
    ...r,
    rank: i + 1,
    advances: i < 8,
  }));

  const cutline = rows[7];
  return {
    rows,
    cutlinePoints: cutline?.points ?? 0,
    cutlineGd: cutline?.goalDifference ?? 0,
  };
}
