import { freshUpstreamFetch } from "@/lib/fetch-options";
import {
  isTodayMatch,
  isUpcomingMatch,
  type MatchDataSource,
} from "@/lib/football-data";
import {
  buildLaLigaClubTeamInfo,
  laLigaSeedTeams,
  resolveLaLigaClubCode,
} from "@/lib/la-liga-clubs";
import { detectLaLigaPhase } from "@/lib/la-liga-phase";
import type { LaLigaSeasonData } from "@/lib/la-liga-types";
import {
  computeLeagueStandings,
  computeRelegationRace,
  computeTitleRace,
} from "@/lib/la-liga-standings";
import { normalizeApiMatchStatus } from "@/lib/match-status";
import type { MatchInfo, TeamInfo } from "@/lib/types";

interface FootballDataTeam {
  id?: number;
  name: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number | null;
  stage?: string;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    winner?: string | null;
  };
  venue?: string | null;
}

function seasonCandidates(now = new Date()): string[] {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 8 ? year : year - 1;
  return [
    `${startYear}-${String(startYear + 1).slice(2)}`,
    `${startYear - 1}-${String(startYear).slice(2)}`,
  ];
}

export function formatSeasonLabel(seasonKey: string): string {
  const [start, end] = seasonKey.split("-");
  if (!start || !end) return seasonKey;
  return `${start}/${end}`;
}

export function seasonStartYear(seasonKey: string): number {
  return Number(seasonKey.slice(0, 4)) || new Date().getFullYear();
}

/** Convert a Europe/Madrid wall-clock kickoff into UTC ISO. */
export function parseSpainKickoffIso(date: string, time = "21:00"): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || hour == null || minute == null) {
    return `${date}T19:00:00Z`;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value])
    );
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second ?? "0")
    );
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = desired - asUtc;
    if (delta === 0) break;
    guess += delta;
  }

  return new Date(guess).toISOString();
}

function teamFromApi(team: FootballDataTeam): TeamInfo {
  const code = resolveLaLigaClubCode(team.name ?? "TBD", team.tla);
  return buildLaLigaClubTeamInfo(
    code,
    team.name ?? undefined,
    team.crest ?? undefined,
    team.shortName ?? undefined
  );
}

function parseApiMatch(m: FootballDataMatch): MatchInfo {
  const homeTeam = teamFromApi(m.homeTeam);
  const awayTeam = teamFromApi(m.awayTeam);
  const homeScore = m.score.fullTime.home;
  const awayScore = m.score.fullTime.away;
  let winnerCode: string | undefined;
  if (m.score.winner === "HOME_TEAM") winnerCode = homeTeam.code;
  else if (m.score.winner === "AWAY_TEAM") winnerCode = awayTeam.code;
  else if (homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) winnerCode = homeTeam.code;
    else if (awayScore > homeScore) winnerCode = awayTeam.code;
  }

  return {
    id: m.id,
    round: "R32",
    stage: "LEAGUE",
    group: m.matchday ? `Matchday ${m.matchday}` : undefined,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    status: normalizeApiMatchStatus(m.status),
    utcDate: m.utcDate,
    venue: m.venue?.trim() || "",
    winnerCode,
  };
}

function sortMatches(a: MatchInfo, b: MatchInfo): number {
  return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
}

function selectToday(matches: MatchInfo[]): MatchInfo[] {
  return matches.filter((m) => isTodayMatch(m)).sort(sortMatches);
}

function selectUpcoming(matches: MatchInfo[]): MatchInfo[] {
  return matches.filter((m) => isUpcomingMatch(m)).sort(sortMatches).slice(0, 40);
}

function buildPayload(
  matches: MatchInfo[],
  seasonKey: string,
  source: MatchDataSource
): LaLigaSeasonData {
  const seasonLabel = formatSeasonLabel(seasonKey);
  const sorted = [...matches].sort(sortMatches);
  const standings = computeLeagueStandings(sorted, seasonLabel, laLigaSeedTeams());
  const phase = detectLaLigaPhase(sorted);

  return {
    seasonLabel,
    seasonStartYear: seasonStartYear(seasonKey),
    matches: sorted,
    standings,
    todayMatches: selectToday(sorted),
    upcomingMatches: selectUpcoming(sorted),
    source,
    phase,
    titleRace: computeTitleRace(standings),
    relegationRace: computeRelegationRace(standings),
  };
}

async function fetchFootballDataMatches(): Promise<{
  matches: MatchInfo[];
  seasonKey: string;
} | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/PD/matches", {
      headers: { "X-Auth-Token": apiKey },
      ...freshUpstreamFetch,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      matches?: FootballDataMatch[];
      resultSet?: { first?: string };
    };
    const raw = data.matches ?? [];
    if (raw.length === 0) return null;

    const firstDate = raw[0]?.utcDate ?? data.resultSet?.first;
    const startYear = firstDate ? Number(firstDate.slice(0, 4)) : new Date().getFullYear();
    const month = firstDate ? Number(firstDate.slice(5, 7)) : 8;
    const seasonStart = month >= 7 ? startYear : startYear - 1;
    const seasonKey = `${seasonStart}-${String(seasonStart + 1).slice(2)}`;

    return {
      matches: raw.map(parseApiMatch),
      seasonKey,
    };
  } catch {
    return null;
  }
}

function seedSeasonKey(now = new Date()): string {
  return seasonCandidates(now)[0] ?? "2026-27";
}

function generateSeedMatches(seasonKey: string): MatchInfo[] {
  const startYear = seasonStartYear(seasonKey);
  const teams = laLigaSeedTeams();
  const matches: MatchInfo[] = [];
  let id = 900_000;

  for (let md = 1; md <= 3; md++) {
    for (let i = 0; i < 10; i++) {
      const home = teams[i]!;
      const away = teams[19 - i]!;
      const date = `${startYear}-08-${String(15 + md).padStart(2, "0")}`;
      matches.push({
        id: id++,
        round: "R32",
        stage: "LEAGUE",
        group: `Matchday ${md}`,
        homeTeam: home,
        awayTeam: away,
        homeScore: null,
        awayScore: null,
        status: "SCHEDULED",
        utcDate: parseSpainKickoffIso(date, i % 2 === 0 ? "17:00" : "21:00"),
        venue: "",
      });
    }
  }

  return matches;
}

/**
 * La Liga season payload.
 * Uses football-data.org current PD season when the API key is available;
 * otherwise a lightweight seed preview.
 */
export async function fetchLaLigaSeason(): Promise<LaLigaSeasonData> {
  const api = await fetchFootballDataMatches();
  if (api) {
    return buildPayload(api.matches, api.seasonKey, "api");
  }

  const seasonKey = seedSeasonKey();
  return buildPayload(generateSeedMatches(seasonKey), seasonKey, "seed");
}
