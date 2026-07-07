import { freshUpstreamFetch } from "@/lib/fetch-options";
import teamSeed from "@/data/team-seed.json";
import { buildTeamInfo } from "@/lib/team-info";

export interface ScorerRow {
  playerName: string;
  teamCode: string;
  teamName: string;
  goals: number;
  assists: number;
}

const seedTeams = teamSeed as Array<{ code: string; name: string }>;

const nameToCode = new Map(
  seedTeams.map((t) => [t.name.toLowerCase(), t.code])
);

function resolveTeamCode(teamName: string): string {
  const direct = nameToCode.get(teamName.toLowerCase());
  if (direct) return direct;
  const partial = seedTeams.find(
    (t) =>
      teamName.toLowerCase().includes(t.name.toLowerCase()) ||
      t.name.toLowerCase().includes(teamName.toLowerCase())
  );
  return partial?.code ?? teamName.slice(0, 3).toUpperCase();
}

interface FootballDataScorer {
  player: { name: string };
  team: { name: string; tla?: string | null };
  goals: number;
  assists?: number | null;
  penalties?: number | null;
}

export async function fetchWorldCupScorers(limit = 12): Promise<ScorerRow[] | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/WC/scorers?season=2026&limit=${limit}`,
      {
        headers: { "X-Auth-Token": apiKey },
        ...freshUpstreamFetch,
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { scorers?: FootballDataScorer[] };
    const rows = data.scorers ?? [];
    if (rows.length === 0) return null;

    return rows.map((row) => {
      const teamCode = row.team.tla?.trim() || resolveTeamCode(row.team.name);
      const teamName = buildTeamInfo(teamCode, row.team.name).name;
      return {
        playerName: row.player.name,
        teamCode,
        teamName,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
      };
    });
  } catch {
    return null;
  }
}
