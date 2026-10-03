import type { MatchInfo, TeamInfo } from "@/lib/types";
import { cachedUpstreamFetch } from "@/lib/sports-upstream-cache";
import { assignLeagueMatchdays, type LeagueRoundFixture } from "@/lib/league-matchdays";

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

interface EspnWeek {
  number?: number;
}

interface EspnNote {
  headline?: string;
  text?: string;
}

interface EspnCompetition {
  competitors?: EspnCompetitor[];
  status?: { type?: EspnStatusType };
  venue?: { fullName?: string };
  week?: number | EspnWeek;
  altGameNote?: string;
  notes?: Array<EspnNote | string>;
}

interface EspnEvent {
  id: string;
  date: string;
  week?: number | EspnWeek;
  competitions?: EspnCompetition[];
}

export interface EspnLeagueParseOptions {
  resolveCode: (name: string, tla?: string | null) => string;
  buildTeam: (code: string, name?: string, crest?: string, shortName?: string) => TeamInfo;
}

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

/**
 * ESPN calendar-year scoreboard keys for a European club season (Aug → May).
 * A single `YYYY0801-YYYY0531` range returns an empty board; year queries work.
 */
export function espnSeasonDateQueries(seasonKey: string): string[] {
  const startYear = Number(seasonKey.slice(0, 4)) || new Date().getFullYear();
  return [String(startYear), String(startYear + 1)];
}

/** @deprecated Prefer espnSeasonDateQueries — kept for callers/tests during MOT-52. */
export function espnSeasonDateRange(seasonKey: string): string {
  return espnSeasonDateQueries(seasonKey)[0] ?? String(new Date().getFullYear());
}

/** Keep Aug(start) → Jun(end) so prior-season spring fixtures drop out of the start year. */
export function isEspnEventInSeason(eventDate: string, seasonStartYear: number): boolean {
  const day = eventDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const from = `${seasonStartYear}-07-01`;
  const to = `${seasonStartYear + 1}-07-01`;
  return day >= from && day < to;
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

const ROUND_TEXT =
  /\b(?:match\s*weeks?|matchdays?|jornadas?|rounds?|weeks?)\s*#?\s*(\d{1,2})\b/i;

function readWeekNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (value && typeof value === "object" && "number" in value) {
    const number = (value as EspnWeek).number;
    if (typeof number === "number" && Number.isInteger(number) && number > 0) return number;
  }
  return null;
}

function readRoundText(text: string | undefined): number | null {
  if (!text) return null;
  const match = text.match(ROUND_TEXT);
  if (!match?.[1]) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/** Round/week number ESPN put on the event, or null when the feed has none. */
export function explicitEspnRound(event: EspnEvent): number | null {
  const competition = event.competitions?.[0];
  const fromWeek = readWeekNumber(event.week) ?? readWeekNumber(competition?.week);
  if (fromWeek) return fromWeek;

  const fromAlt = readRoundText(competition?.altGameNote);
  if (fromAlt) return fromAlt;

  for (const note of competition?.notes ?? []) {
    const text = typeof note === "string" ? note : note.headline ?? note.text;
    const fromNote = readRoundText(text);
    if (fromNote) return fromNote;
  }
  return null;
}

function clubKey(team: EspnTeam | undefined): string | null {
  const name = team?.displayName?.trim();
  if (!name) return null;
  const abbr = team?.abbreviation?.trim();
  return abbr ? `${abbr}|${name}` : name;
}

function eventClubs(event: EspnEvent): { home: string; away: string } | null {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  const homeKey = clubKey(home?.team);
  const awayKey = clubKey(away?.team);
  if (!homeKey || !awayKey) return null;
  return { home: homeKey, away: awayKey };
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
 * ESPN's raw season board includes logos, odds, and broadcasts and can exceed
 * the Data Cache's 2MB entry cap. Keep the fields the table actually reads.
 */
export function trimEspnScoreboardBody(body: string): string {
  const data = JSON.parse(body) as { events?: EspnEvent[] };
  const events = (data.events ?? []).map((event) => {
    const competition = event.competitions?.[0];
    return {
      id: event.id,
      date: event.date,
      competitions: competition
        ? [
            {
              competitors: (competition.competitors ?? []).map((competitor) => ({
                homeAway: competitor.homeAway,
                score: competitor.score,
                team: competitor.team
                  ? {
                      displayName: competitor.team.displayName,
                      shortDisplayName: competitor.team.shortDisplayName,
                      abbreviation: competitor.team.abbreviation,
                      logo: competitor.team.logo,
                    }
                  : undefined,
              })),
              status: competition.status?.type ? { type: competition.status.type } : undefined,
              venue: competition.venue?.fullName
                ? { fullName: competition.venue.fullName }
                : undefined,
            },
          ]
        : [],
    };
  });
  return JSON.stringify({ events });
}

async function fetchEspnScoreboardEvents(
  league: EspnLeagueSlug,
  dates: string
): Promise<EspnEvent[]> {
  const url = `${ESPN_BASE}/${league}/scoreboard?limit=1000&dates=${dates}`;
  const res = await cachedUpstreamFetch(
    url,
    {
      cacheShape: "espn-scoreboard",
      headers: {
        Accept: "application/json",
        // ESPN returns 403 for many custom UAs; a plain curl-style agent works.
        "User-Agent": "curl/8.5.0",
      },
    },
    trimEspnScoreboardBody
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { events?: EspnEvent[] };
  return data.events ?? [];
}

/**
 * Pull a full club-league season from ESPN's public JSON scoreboard API.
 * Merges calendar-year boards (start + end year) and filters to the Aug→May season.
 */
export async function fetchEspnLeagueMatches(
  league: EspnLeagueSlug,
  seasonKey: string,
  options: EspnLeagueParseOptions
): Promise<MatchInfo[] | null> {
  const expectedStartYear = Number(seasonKey.slice(0, 4));
  if (!expectedStartYear) return null;

  try {
    const boards = await Promise.all(
      espnSeasonDateQueries(seasonKey).map((dates) => fetchEspnScoreboardEvents(league, dates))
    );

    const byId = new Map<string, EspnEvent>();
    for (const events of boards) {
      for (const event of events) {
        if (!event?.id || !event.date) continue;
        if (!isEspnEventInSeason(event.date, expectedStartYear)) continue;
        byId.set(event.id, event);
      }
    }

    const events = [...byId.values()];
    if (events.length < 10) return null;

    const matches = buildEspnLeagueMatches(events, league, options);
    return matches.length >= 10 ? matches : null;
  } catch {
    return null;
  }
}

/**
 * Turn a scoreboard payload into league fixtures.
 * Matchweeks come from ESPN's round/week when the event has one; otherwise
 * they are inferred so a postponement does not renumber later weeks.
 */
export function buildEspnLeagueMatches(
  events: EspnEvent[],
  league: EspnLeagueSlug,
  options: EspnLeagueParseOptions
): MatchInfo[] {
  const playable = events.filter((event) => event?.id && event.date && eventClubs(event));
  const sorted = [...playable].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id)
  );

  const fixtures: LeagueRoundFixture[] = sorted.map((event) => {
    const clubs = eventClubs(event)!;
    return {
      id: event.id,
      kickoff: event.date,
      homeKey: clubs.home,
      awayKey: clubs.away,
      explicitRound: explicitEspnRound(event),
    };
  });
  const matchdays = assignLeagueMatchdays(fixtures);

  return sorted
    .map((event, index) => parseEspnEvent(league, event, matchdays[index] ?? 1, options))
    .filter((match): match is MatchInfo => match != null);
}
