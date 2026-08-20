import { freshUpstreamFetch } from "@/lib/fetch-options";
import { buildClubTeamInfo, resolveClubCode } from "@/lib/league-standings";
import type { LeagueStandings } from "@/lib/premier-league-types";
import type { MatchInfo } from "@/lib/types";

export interface PremierLeagueAwardContender {
  rank: number;
  label: string;
  teamCode: string;
  teamName: string;
  crest?: string;
  stat: number;
  statLabel: string;
}

export interface PremierLeagueAward {
  id: string;
  name: string;
  emoji: string;
  description: string;
  contenders: PremierLeagueAwardContender[];
}

interface FootballDataScorer {
  player: { name: string };
  team: { name: string; tla?: string | null; crest?: string | null };
  goals: number;
  assists?: number | null;
}

async function fetchPremierLeagueScorers(limit = 8): Promise<PremierLeagueAwardContender[] | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/PL/scorers?limit=${limit}`,
      {
        headers: { "X-Auth-Token": apiKey },
        ...freshUpstreamFetch,
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { scorers?: FootballDataScorer[] };
    const rows = data.scorers ?? [];
    if (rows.length === 0) return null;

    return rows.map((row, index) => {
      const code = resolveClubCode(row.team.name, row.team.tla);
      const team = buildClubTeamInfo(code, row.team.name, row.team.crest ?? undefined);
      return {
        rank: index + 1,
        label: row.player.name,
        teamCode: code,
        teamName: team.name,
        crest: team.crest,
        stat: row.goals ?? 0,
        statLabel: "goals",
      };
    });
  } catch {
    return null;
  }
}

function topBy(
  standings: LeagueStandings,
  pick: (row: LeagueStandings["rows"][number]) => number,
  statLabel: string,
  limit = 4
): PremierLeagueAwardContender[] {
  return [...standings.rows]
    .sort((a, b) => pick(b) - pick(a) || a.position - b.position)
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      label: row.team.shortName ?? row.team.name,
      teamCode: row.team.code,
      teamName: row.team.name,
      crest: row.team.crest,
      stat: pick(row),
      statLabel,
    }));
}

export async function buildPremierLeagueAwards(
  standings: LeagueStandings,
  _matches: MatchInfo[]
): Promise<PremierLeagueAward[]> {
  const awards: PremierLeagueAward[] = [];

  const scorers = await fetchPremierLeagueScorers();
  if (scorers && scorers.length > 0) {
    awards.push({
      id: "golden-boot",
      name: "Golden Boot",
      emoji: "⚽",
      description: "Leading Premier League scorers this season.",
      contenders: scorers.slice(0, 4),
    });
  }

  awards.push({
    id: "points",
    name: "Points race",
    emoji: "🏆",
    description: "Clubs stacking the most points across 38 matchdays.",
    contenders: topBy(standings, (r) => r.points, "pts"),
  });

  awards.push({
    id: "attack",
    name: "Top attack",
    emoji: "🔥",
    description: "Highest goals scored — the league's most prolific attacks.",
    contenders: topBy(standings, (r) => r.goalsFor, "GF"),
  });

  awards.push({
    id: "defense",
    name: "Best defence",
    emoji: "🧱",
    description: "Fewest goals conceded. Same table maths, opposite end.",
    contenders: [...standings.rows]
      .filter((r) => r.played > 0)
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst || a.position - b.position)
      .slice(0, 4)
      .map((row, index) => ({
        rank: index + 1,
        label: row.team.shortName ?? row.team.name,
        teamCode: row.team.code,
        teamName: row.team.name,
        crest: row.team.crest,
        stat: row.goalsAgainst,
        statLabel: "GA",
      })),
  });

  return awards;
}
