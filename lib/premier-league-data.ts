import plClubsSeed from "@/data/pl-clubs-seed.json";
import { freshUpstreamFetch, cacheBustUrl } from "@/lib/fetch-options";
import {
  isTodayMatch,
  isUpcomingMatch,
  type MatchDataSource,
} from "@/lib/football-data";
import {
  buildClubTeamInfo,
  computeLeagueStandings,
  computeRelegationRace,
  computeTitleRace,
  resolveClubCode,
} from "@/lib/league-standings";
import { normalizeApiMatchStatus, inferMatchStatusFromKickoff } from "@/lib/match-status";
import { detectPremierLeaguePhase } from "@/lib/premier-league-phase";
import type { PremierLeagueSeasonData } from "@/lib/premier-league-types";
import type { MatchInfo, TeamInfo } from "@/lib/types";

const clubs = plClubsSeed as Array<{
  code: string;
  name: string;
  shortName: string;
  crest: string;
}>;

const OPENFOOTBALL_BASE =
  "https://raw.githubusercontent.com/openfootball/football.json/master";

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

interface FootballDataStandingRow {
  position: number;
  team: FootballDataTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string | null;
}

interface OpenFootballMatch {
  round?: string;
  date?: string;
  time?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number] } | unknown[] | null;
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

/** Convert a Europe/London wall-clock kickoff into UTC ISO. */
export function parseUkKickoffIso(date: string, time = "15:00"): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || hour == null || minute == null) {
    return `${date}T15:00:00Z`;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
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

function parseOpenFootballScore(score: OpenFootballMatch["score"]): {
  home: number | null;
  away: number | null;
  hasFt: boolean;
} {
  if (!score) return { home: null, away: null, hasFt: false };
  if (Array.isArray(score)) {
    if (typeof score[0] === "number" && typeof score[1] === "number") {
      return { home: score[0], away: score[1], hasFt: true };
    }
    return { home: null, away: null, hasFt: false };
  }
  if (typeof score === "object" && score !== null && "ft" in score) {
    const ft = (score as { ft?: [number, number] }).ft;
    if (ft && typeof ft[0] === "number" && typeof ft[1] === "number") {
      return { home: ft[0], away: ft[1], hasFt: true };
    }
  }
  return { home: null, away: null, hasFt: false };
}

function stableMatchId(date: string, home: string, away: string): number {
  let hash = 0;
  const key = `pl|${date}|${home}|${away}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return 700_000 + (hash % 200_000);
}

function teamFromApi(team: FootballDataTeam): TeamInfo {
  const code = resolveClubCode(team.name ?? "TBD", team.tla);
  return buildClubTeamInfo(
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

function parseOpenFootballMatch(raw: OpenFootballMatch): MatchInfo | null {
  if (!raw.team1 || !raw.team2 || !raw.date) return null;

  const homeCode = resolveClubCode(raw.team1);
  const awayCode = resolveClubCode(raw.team2);
  const homeTeam = buildClubTeamInfo(homeCode, raw.team1);
  const awayTeam = buildClubTeamInfo(awayCode, raw.team2);
  const { home, away, hasFt } = parseOpenFootballScore(raw.score);
  const utcDate = parseUkKickoffIso(raw.date, raw.time ?? "15:00");

  let winnerCode: string | undefined;
  if (hasFt && home !== null && away !== null) {
    if (home > away) winnerCode = homeTeam.code;
    else if (away > home) winnerCode = awayTeam.code;
  }

  const matchday = raw.round?.match(/(\d+)/)?.[1];

  return {
    id: stableMatchId(raw.date, raw.team1, raw.team2),
    round: "R32",
    stage: "LEAGUE",
    group: matchday ? `Matchday ${matchday}` : raw.round,
    homeTeam,
    awayTeam,
    homeScore: home,
    awayScore: away,
    status: inferMatchStatusFromKickoff(utcDate, hasFt),
    utcDate,
    venue: "",
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
): PremierLeagueSeasonData {
  const seasonLabel = formatSeasonLabel(seasonKey);
  const sorted = [...matches].sort(sortMatches);
  const standings = computeLeagueStandings(sorted, seasonLabel);
  const phase = detectPremierLeaguePhase(sorted);

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
    const res = await fetch("https://api.football-data.org/v4/competitions/PL/matches", {
      headers: { "X-Auth-Token": apiKey },
      ...freshUpstreamFetch,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      matches?: FootballDataMatch[];
      filters?: { season?: string };
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

async function fetchOpenFootballSeason(
  seasonKey: string
): Promise<MatchInfo[] | null> {
  const url = `${OPENFOOTBALL_BASE}/${seasonKey}/en.1.json`;
  try {
    const res = await fetch(cacheBustUrl(url), freshUpstreamFetch);
    if (!res.ok) return null;
    const data = (await res.json()) as { matches?: OpenFootballMatch[] };
    const matches = (data.matches ?? [])
      .map(parseOpenFootballMatch)
      .filter((m): m is MatchInfo => m != null);
    return matches.length > 0 ? matches : null;
  } catch {
    return null;
  }
}

function seedSeasonKey(now = new Date()): string {
  return seasonCandidates(now)[0] ?? "2026-27";
}

function generateSeedMatches(seasonKey: string): MatchInfo[] {
  const startYear = seasonStartYear(seasonKey);
  const teams = clubs.map((c) => buildClubTeamInfo(c.code, c.name, c.crest, c.shortName));
  const matches: MatchInfo[] = [];
  let id = 800_000;

  // Lightweight empty fixture grid for preview (no invented scores).
  for (let md = 1; md <= 3; md++) {
    for (let i = 0; i < 10; i++) {
      const home = teams[i]!;
      const away = teams[19 - i]!;
      const date = `${startYear}-08-${String(14 + md).padStart(2, "0")}`;
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
        utcDate: parseUkKickoffIso(date, "15:00"),
        venue: "",
      });
    }
  }

  return matches;
}

/**
 * Premier League season payload.
 * Prefer openfootball for the *current* season; then football-data.org; then seed.
 * Do not fall back to last season's openfootball file — that kept the page on 25/26
 * after 26/27 had started while the mirror lagged.
 */
export async function fetchPremierLeagueSeason(): Promise<PremierLeagueSeasonData> {
  const [currentSeason] = seasonCandidates();
  const currentKey = currentSeason ?? "2026-27";

  const openfootball = await fetchOpenFootballSeason(currentKey);
  if (openfootball) {
    return buildPayload(openfootball, currentKey, "openfootball");
  }

  const api = await fetchFootballDataMatches();
  // Only use football-data when it is already on the current season — otherwise
  // a lagging free-tier default would keep the page on last year.
  if (api && api.seasonKey === currentKey) {
    return buildPayload(api.matches, api.seasonKey, "api");
  }

  return buildPayload(generateSeedMatches(currentKey), currentKey, "seed");
}
