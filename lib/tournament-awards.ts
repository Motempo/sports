import { buildTeamInfo } from "@/lib/football-data";
import type { MatchInfo, TeamInfo } from "@/lib/types";

export interface ScorerRow {
  rank: number;
  playerName: string;
  team: TeamInfo;
  goals: number;
  assists: number;
  penalties: number;
}

export interface CleanSheetRow {
  rank: number;
  team: TeamInfo;
  cleanSheets: number;
  goalsConceded: number;
}

export interface TournamentAwards {
  goldenBoot: ScorerRow[];
  playmaker: ScorerRow[];
  goldenGlove: CleanSheetRow[];
  youngPlayer: ScorerRow | null;
  source: "api" | "matches" | "unavailable";
}

type FootballDataScorer = {
  player: {
    name: string;
    dateOfBirth?: string | null;
  };
  team: {
    tla?: string | null;
    name?: string | null;
    crest?: string | null;
  };
  goals: number;
  assists?: number | null;
  penalties?: number | null;
};

const YOUNG_PLAYER_CUTOFF = "2002-01-01";

function toScorerRow(entry: FootballDataScorer, rank: number): ScorerRow {
  const code = entry.team.tla ?? "TBD";
  return {
    rank,
    playerName: entry.player.name,
    team: buildTeamInfo(code, entry.team.name ?? code, entry.team.crest ?? undefined),
    goals: entry.goals,
    assists: entry.assists ?? 0,
    penalties: entry.penalties ?? 0,
  };
}

function computeCleanSheets(matches: MatchInfo[]): CleanSheetRow[] {
  const stats = new Map<
    string,
    { team: TeamInfo; cleanSheets: number; goalsConceded: number }
  >();

  for (const match of matches) {
    if (match.status !== "FINISHED") continue;
    if (match.homeScore === null || match.awayScore === null) continue;

    for (const [team, conceded] of [
      [match.homeTeam, match.awayScore],
      [match.awayTeam, match.homeScore],
    ] as const) {
      const current = stats.get(team.code) ?? {
        team,
        cleanSheets: 0,
        goalsConceded: 0,
      };
      current.goalsConceded += conceded;
      if (conceded === 0) current.cleanSheets += 1;
      stats.set(team.code, current);
    }
  }

  return Array.from(stats.values())
    .filter((row) => row.cleanSheets > 0)
    .sort((a, b) => b.cleanSheets - a.cleanSheets || a.goalsConceded - b.goalsConceded)
    .slice(0, 5)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

function pickYoungPlayer(scorers: FootballDataScorer[]): ScorerRow | null {
  const eligible = scorers
    .filter((entry) => entry.player.dateOfBirth && entry.player.dateOfBirth >= YOUNG_PLAYER_CUTOFF)
    .sort((a, b) => b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0));

  const top = eligible[0];
  if (!top) return null;
  return toScorerRow(top, 1);
}

async function fetchScorersFromApi(apiKey: string): Promise<FootballDataScorer[] | null> {
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/scorers?season=2026&limit=20",
      {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { scorers?: FootballDataScorer[] };
    return data.scorers?.length ? data.scorers : null;
  } catch {
    return null;
  }
}

export async function fetchTournamentAwards(
  matches: MatchInfo[],
  options?: { apiKey?: string }
): Promise<TournamentAwards> {
  const goldenGlove = computeCleanSheets(matches);
  const apiKey = options?.apiKey;

  if (apiKey) {
    const scorers = await fetchScorersFromApi(apiKey);
    if (scorers?.length) {
      const byGoals = [...scorers].sort((a, b) => b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0));
      const byAssists = [...scorers].sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0) || b.goals - a.goals);

      return {
        goldenBoot: byGoals.slice(0, 5).map((entry, index) => toScorerRow(entry, index + 1)),
        playmaker: byAssists
          .filter((entry) => (entry.assists ?? 0) > 0)
          .slice(0, 5)
          .map((entry, index) => toScorerRow(entry, index + 1)),
        goldenGlove,
        youngPlayer: pickYoungPlayer(scorers),
        source: "api",
      };
    }
  }

  if (goldenGlove.length > 0) {
    return {
      goldenBoot: [],
      playmaker: [],
      goldenGlove,
      youngPlayer: null,
      source: "matches",
    };
  }

  return {
    goldenBoot: [],
    playmaker: [],
    goldenGlove: [],
    youngPlayer: null,
    source: "unavailable",
  };
}
