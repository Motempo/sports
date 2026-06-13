import type { MatchInfo, TeamInfo } from "@/lib/types";

export type QualificationZone = "QUALIFIED" | "THIRD_BUBBLE" | "ELIMINATED";

export interface GroupStandingRow {
  team: TeamInfo;
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
  team: TeamInfo;
  groupId: string;
  groupLabel: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  rank: number;
  advances: boolean;
}

const GROUP_ORDER = Array.from({ length: 12 }, (_, i) => `GROUP_${String.fromCharCode(65 + i)}`);

export function formatGroupLabel(groupId: string): string {
  return groupId.replace("GROUP_", "Group ");
}

function initStats(team: TeamInfo) {
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

function applyResult(
  stats: ReturnType<typeof initStats>,
  goalsFor: number,
  goalsAgainst: number
) {
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

export function computeGroupStandings(groupMatches: MatchInfo[]): GroupStandings[] {
  const byGroup = new Map<string, MatchInfo[]>();

  for (const match of groupMatches) {
    if (!match.group) continue;
    const list = byGroup.get(match.group) ?? [];
    list.push(match);
    byGroup.set(match.group, list);
  }

  const groups = GROUP_ORDER.filter((g) => byGroup.has(g));
  const extra = [...byGroup.keys()].filter((g) => !groups.includes(g)).sort();
  const ordered = [...groups, ...extra];

  return ordered.map((groupId) => {
    const matches = byGroup.get(groupId) ?? [];
    const teamMap = new Map<string, ReturnType<typeof initStats>>();

    for (const match of matches) {
      if (!teamMap.has(match.homeTeam.code)) teamMap.set(match.homeTeam.code, initStats(match.homeTeam));
      if (!teamMap.has(match.awayTeam.code)) teamMap.set(match.awayTeam.code, initStats(match.awayTeam));
    }

    for (const match of matches) {
      if (match.status !== "FINISHED" || match.homeScore === null || match.awayScore === null) continue;
      const home = teamMap.get(match.homeTeam.code);
      const away = teamMap.get(match.awayTeam.code);
      if (home) applyResult(home, match.homeScore, match.awayScore);
      if (away) applyResult(away, match.awayScore, match.homeScore);
    }

    const sorted = [...teamMap.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    const finishedCount = matches.filter((m) => m.status === "FINISHED").length;
    const matchday = Math.min(3, Math.ceil(finishedCount / Math.max(1, sorted.length / 2)));

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
