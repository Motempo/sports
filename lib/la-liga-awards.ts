import { freshUpstreamFetch } from "@/lib/fetch-options";
import { buildLaLigaClubTeamInfo, resolveLaLigaClubCode } from "@/lib/la-liga-clubs";
import type { LaLigaSeasonData } from "@/lib/la-liga-types";
import { capForecast } from "@/lib/match-forecast";

export const LALIGA_AWARD_COMMENTARY_MAX_CHARS = 300;
const MATCHES_PER_TEAM = 38;

export interface LaLigaAwardContender {
  rank: number;
  label: string;
  teamCode: string;
  teamName: string;
  crest?: string;
  stat: number;
  statLabel: string;
  winChance: number;
}

export interface LaLigaAward {
  id: string;
  name: string;
  sponsor: string;
  emoji: string;
  description: string;
  progress: number;
  contenders: LaLigaAwardContender[];
  commentary: string;
}

interface FootballDataScorer {
  player: { name: string };
  team: { name: string; tla?: string | null; crest?: string | null };
  goals: number;
  assists?: number | null;
}

function winChances(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values, 1);
  const weights = values.map((v) => Math.exp((v / max) * 2.4));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => Math.round((w / total) * 100));
}

function seasonProgress(data: LaLigaSeasonData): number {
  const played = Math.max(0, ...data.standings.rows.map((r) => r.played));
  return Math.min(100, Math.round((played / MATCHES_PER_TEAM) * 100));
}

function raceProgress(seasonPct: number, leader: number, runnerUp: number, scale: number): number {
  const gap = Math.max(0, leader - runnerUp);
  const gapPct = Math.min(55, (gap / scale) * 55);
  return Math.min(98, Math.round(seasonPct * 0.45 + gapPct));
}

async function fetchLaLigaScorers(limit = 8): Promise<
  Array<{ playerName: string; teamCode: string; teamName: string; crest?: string; goals: number }>
> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/PD/scorers?limit=${limit}`,
      {
        headers: { "X-Auth-Token": apiKey },
        ...freshUpstreamFetch,
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { scorers?: FootballDataScorer[] };
    return (data.scorers ?? []).map((row) => {
      const code = resolveLaLigaClubCode(row.team.name, row.team.tla);
      const team = buildLaLigaClubTeamInfo(
        code,
        row.team.name,
        row.team.crest ?? undefined
      );
      return {
        playerName: row.player.name,
        teamCode: team.code,
        teamName: team.shortName ?? team.name,
        crest: team.crest,
        goals: row.goals ?? 0,
      };
    });
  } catch {
    return [];
  }
}

function buildContenders(
  entries: Array<{
    label: string;
    teamCode: string;
    teamName: string;
    crest?: string;
    stat: number;
    statLabel: string;
  }>
): LaLigaAwardContender[] {
  const chances = winChances(entries.map((e) => e.stat));
  return entries.map((entry, i) => ({
    rank: i + 1,
    label: entry.label,
    teamCode: entry.teamCode,
    teamName: entry.teamName,
    crest: entry.crest,
    stat: entry.stat,
    statLabel: entry.statLabel,
    winChance: chances[i] ?? 0,
  }));
}

/**
 * Season award races — World Cup Awards-style cards for La Liga.
 */
export async function buildLaLigaAwards(data: LaLigaSeasonData): Promise<LaLigaAward[]> {
  const progressPct = seasonProgress(data);
  const rows = data.standings.rows;
  const scorers = await fetchLaLigaScorers(8);

  const titleEntries = rows.slice(0, 5).map((r) => ({
    label: r.team.shortName ?? r.team.name,
    teamCode: r.team.code,
    teamName: r.team.name,
    crest: r.team.crest,
    stat: r.points,
    statLabel: "pts",
  }));
  const titleContenders = buildContenders(titleEntries);
  const titleProgress = raceProgress(
    progressPct,
    titleContenders[0]?.stat ?? 0,
    titleContenders[1]?.stat ?? 0,
    12
  );

  const pichichiEntries =
    scorers.length > 0
      ? scorers.slice(0, 5).map((s) => ({
          label: s.playerName,
          teamCode: s.teamCode,
          teamName: s.teamName,
          crest: s.crest,
          stat: s.goals,
          statLabel: "goals",
        }))
      : [...rows]
          .sort((a, b) => b.goalsFor - a.goalsFor || b.points - a.points)
          .slice(0, 5)
          .map((r) => ({
            label: r.team.shortName ?? r.team.name,
            teamCode: r.team.code,
            teamName: r.team.name,
            crest: r.team.crest,
            stat: r.goalsFor,
            statLabel: "club goals",
          }));
  const pichichiContenders = buildContenders(pichichiEntries);
  const pichichiProgress = raceProgress(
    progressPct,
    pichichiContenders[0]?.stat ?? 0,
    pichichiContenders[1]?.stat ?? 0,
    8
  );

  const zamoraSorted = [...rows]
    .filter((r) => r.played > 0)
    .sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.points - a.points)
    .slice(0, 5);
  // Lower conceded = better: invert for softmax weights, display real conceded.
  const zamoraContenders = buildContenders(
    zamoraSorted.map((r) => ({
      label: r.team.shortName ?? r.team.name,
      teamCode: r.team.code,
      teamName: r.team.name,
      crest: r.team.crest,
      stat: Math.max(1, 50 - r.goalsAgainst),
      statLabel: "def",
    }))
  ).map((c, i) => ({
    ...c,
    stat: zamoraSorted[i]?.goalsAgainst ?? c.stat,
    statLabel: "conceded",
  }));
  const zamoraProgress = raceProgress(
    progressPct,
    zamoraSorted[0] ? 50 - zamoraSorted[0].goalsAgainst : 0,
    zamoraSorted[1] ? 50 - zamoraSorted[1].goalsAgainst : 0,
    10
  );

  const europeEntries = rows.slice(0, 6).map((r) => ({
    label: r.team.shortName ?? r.team.name,
    teamCode: r.team.code,
    teamName: r.team.name,
    crest: r.team.crest,
    stat: r.points,
    statLabel: "pts",
  }));
  const europeContenders = buildContenders(europeEntries);

  const survivalEntries = [...rows]
    .slice(-5)
    .reverse()
    .map((r) => ({
      label: r.team.shortName ?? r.team.name,
      teamCode: r.team.code,
      teamName: r.team.name,
      crest: r.team.crest,
      stat: r.points,
      statLabel: "pts",
    }));
  const survivalContenders = buildContenders(survivalEntries);

  const [t1, t2] = titleContenders;
  const [p1, p2] = pichichiContenders;
  const [z1, z2] = zamoraContenders;

  return [
    {
      id: "title",
      name: "La Liga Title",
      sponsor: "Championship race",
      emoji: "🏆",
      description:
        "Live title chase from the league table — points, then goal difference, decide the champion.",
      progress: titleProgress,
      contenders: titleContenders,
      commentary: capForecast(
        !t1
          ? "The title race opens with Matchday 1 — 38 games, one champion."
          : !t2 || t1.stat === t2.stat
            ? `${t1.label} lead the table on ${t1.stat} pts (~${t1.winChance}% proxy). With ${progressPct}% of the season played, every dropped point still matters.`
            : `${t1.label} lead on ${t1.stat} pts (${t1.winChance}%), with ${t2.label} on ${t2.stat} (${t2.winChance}%). A win is worth three — one weekend can reshape the championship. ${progressPct}% complete.`,
        LALIGA_AWARD_COMMENTARY_MAX_CHARS
      ),
    },
    {
      id: "pichichi",
      name: "Pichichi Trophy",
      sponsor: "Top scorer race",
      emoji: "⚽",
      description:
        scorers.length > 0
          ? "Marca's Pichichi goes to La Liga's top scorer. Live player goals from the season feed."
          : "Marca's Pichichi goes to La Liga's top scorer. Showing club goals until individual scorers are available.",
      progress: pichichiProgress,
      contenders: pichichiContenders,
      commentary: capForecast(
        !p1
          ? "The Pichichi race starts with the first goal of the season."
          : !p2 || p1.stat === p2.stat
            ? `${p1.label} (${p1.teamName}) leads the scoring charts with ${p1.stat} ${p1.statLabel} (~${p1.winChance}%). ${progressPct}% of the campaign is done.`
            : `${p1.label} leads on ${p1.stat} ${p1.statLabel} (${p1.winChance}%), chased by ${p2.label} on ${p2.stat} (${p2.winChance}%). Hot streaks and penalties can flip this overnight.`,
        LALIGA_AWARD_COMMENTARY_MAX_CHARS
      ),
    },
    {
      id: "zamora",
      name: "Zamora Trophy",
      sponsor: "Best defence race",
      emoji: "🧤",
      description:
        "The Zamora Trophy historically honours the keeper with the best goals-to-games ratio. Here we track the clubs conceding fewest goals.",
      progress: Math.max(progressPct, zamoraProgress),
      contenders: zamoraContenders,
      commentary: capForecast(
        !z1
          ? "Clean sheets start writing the Zamora story from Matchday 1."
          : `${z1.label} (${z1.teamName}) have the stingiest defence so far with ${z1.stat} conceded (~${z1.winChance}% proxy). ${
              z2 ? `${z2.label} sit next on ${z2.stat}. ` : ""
            }${progressPct}% of the season played.`,
        LALIGA_AWARD_COMMENTARY_MAX_CHARS
      ),
    },
    {
      id: "europe",
      name: "Europe Places",
      sponsor: "UCL · UEL · UECL",
      emoji: "🌟",
      description:
        "Who's on course for Champions League, Europa League, and Conference League football next season.",
      progress: progressPct,
      contenders: europeContenders,
      commentary: capForecast(
        europeContenders[0]
          ? `Top four usually means Champions League; fifth and sixth chase Europa / Conference spots. ${europeContenders[0].label} currently lead the Europe cut on ${europeContenders[0].stat} pts. Cup paths can still reshuffle the list.`
          : "European places settle as the table separates through autumn and spring.",
        LALIGA_AWARD_COMMENTARY_MAX_CHARS
      ),
    },
    {
      id: "survival",
      name: "Survival Race",
      sponsor: "Relegation battle",
      emoji: "🛟",
      description:
        "The battle to stay in Primera — bottom three go down to Segunda.",
      progress: progressPct,
      contenders: survivalContenders,
      commentary: capForecast(
        survivalContenders[0]
          ? `The drop zone is brutal late in the season. ${survivalContenders.map((c) => c.label).slice(0, 3).join(", ")} are in the mix on points — every relegation six-pointer feels like a final.`
          : "Relegation maths heats up once double-digit matchdays are in the book.",
        LALIGA_AWARD_COMMENTARY_MAX_CHARS
      ),
    },
  ];
}
