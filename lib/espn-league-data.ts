import type { MatchInfo, TeamInfo } from "@/lib/types";

export type EspnLeagueSlug = "eng.1" | "esp.1";

interface EspnTeam {
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logo?: string;
}

interface EspnCompetitor {
  homeAway?: "home" | "away";
  score?: string;
  team?: EspnTeam;
}

interface EspnStatusType {
  state?: string;
  completed?: boolean;
  description?: string;
}

interface EspnEvent {
  id: string;
  date: string;
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: { type?: EspnStatusType };
    venue?: { fullName?: string };
  }>;
}

export interface EspnLeagueParseOptions {
  resolveCode: (name: string, tla?: string | null) => string;
  buildTeam: (code: string, name?: string, crest?: string, shortName?: string) => TeamInfo;
}

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

/** ESPN scoreboard date span for a European club season (Aug → May). */
export function espnSeasonDateRange(seasonKey: string): string {
  const startYear = Number(seasonKey.slice(0, 4)) || new Date().getFullYear();
  return `${startYear}0801-${startYear + 1}0531`;
}

function parseScore(value?: string): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapEspnStatus(type?: EspnStatusType): MatchInfo["status"] {
  const state = type?.state?.toLowerCase();
  const description = type?.description?.toLowerCase() ?? "";

  if (state === "in" || description.includes("half") || description.includes("progress")) {
    return "IN_PLAY";
  }
  if (type?.completed || state === "post" || description.includes("full time")) {
    return "FINISHED";
  }
  if (description.includes("postponed") || description.includes("cancelled")) {
    return "POSTPONED";
  }
  return "SCHEDULED";
}

function stableEspnMatchId(league: EspnLeagueSlug, eventId: string): number {
  let hash = 0;
  const key = `${league}|${eventId}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return 950_000 + (hash % 200_000);
}

function parseEspnEvent(
  league: EspnLeagueSlug,
  event: EspnEvent,
  matchday: number,
  options: EspnLeagueParseOptions
): MatchInfo | null {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team?.displayName || !away?.team?.displayName) return null;

  const homeName = home.team.displayName;
  const awayName = away.team.displayName;
  const homeCode = options.resolveCode(homeName, home.team.abbreviation);
  const awayCode = options.resolveCode(awayName, away.team.abbreviation);
  const homeTeam = options.buildTeam(
    homeCode,
    homeName,
    home.team.logo,
    home.team.shortDisplayName
  );
  const awayTeam = options.buildTeam(
    awayCode,
    awayName,
    away.team.logo,
    away.team.shortDisplayName
  );

  const homeScore = parseScore(home.score);
  const awayScore = parseScore(away.score);
  const status = mapEspnStatus(competition?.status?.type);
  const played = status === "FINISHED" || status === "IN_PLAY" || status === "LIVE" || status === "PAUSED";

  let winnerCode: string | undefined;
  if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) winnerCode = homeTeam.code;
    else if (awayScore > homeScore) winnerCode = awayTeam.code;
  }

  return {
    id: stableEspnMatchId(league, event.id),
    round: "R32",
    stage: "LEAGUE",
    group: `Matchday ${matchday}`,
    homeTeam,
    awayTeam,
    homeScore: played ? homeScore : null,
    awayScore: played ? awayScore : null,
    status,
    utcDate: event.date,
    venue: competition?.venue?.fullName?.trim() || "",
    winnerCode,
  };
}

/**
 * Pull a full club-league season from ESPN's public JSON scoreboard API.
 * Used when football-data.org is unavailable and before the openfootball mirror.
 */
export async function fetchEspnLeagueMatches(
  league: EspnLeagueSlug,
  seasonKey: string,
  options: EspnLeagueParseOptions
): Promise<MatchInfo[] | null> {
  const expectedStartYear = Number(seasonKey.slice(0, 4));
  if (!expectedStartYear) return null;

  const url = `${ESPN_BASE}/${league}/scoreboard?limit=1000&dates=${espnSeasonDateRange(seasonKey)}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 900 },
      headers: {
        Accept: "application/json",
        "User-Agent": "MotempoSports/1.0 (+https://sports.motempo.com)",
      },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      leagues?: Array<{ season?: { year?: number } }>;
      events?: EspnEvent[];
    };

    const seasonYear = data.leagues?.[0]?.season?.year;
    if (seasonYear && seasonYear !== expectedStartYear) return null;

    const events = data.events ?? [];
    if (events.length < 10) return null;

    const sorted = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const matches = sorted
      .map((event, index) =>
        parseEspnEvent(league, event, Math.floor(index / 10) + 1, options)
      )
      .filter((match): match is MatchInfo => match != null);

    return matches.length >= 10 ? matches : null;
  } catch {
    return null;
  }
}
