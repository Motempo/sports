import { enrichMatchVenues, resolveStadium } from "@/lib/match-venue";
import { enrichKnockoutBracket } from "@/lib/knockout-enrich";
import { computeGroupStandings } from "@/lib/group-standings";
import {
  addDaysToDayKey,
  isOnLocalDay,
  localDayKeyFromUtc,
  resolveScheduleTimeZone,
  todayKey,
  tournamentKickoffIso,
} from "@/lib/match-timezone";
import teamIsoMap from "@/data/team-iso-map.json";
import teamSeed from "@/data/team-seed.json";
import wc2026Groups from "@/data/wc2026-groups.json";
import type { BracketRound, MatchInfo, MatchStage, TeamInfo } from "@/lib/types";
import { ROUND_ORDER } from "@/lib/bracket-constants";

const isoMap = teamIsoMap as Record<string, string>;
const officialGroups = wc2026Groups as Record<string, string[]>;
const seedTeams = teamSeed as Array<{
  code: string;
  name: string;
  capital: string;
  confederation: string;
  fifaRank: number;
}>;

export function getIso2(code: string): string {
  return isoMap[code] ?? code.toLowerCase().slice(0, 2);
}

export function buildTeamInfo(
  code: string,
  name: string,
  crest?: string
): TeamInfo {
  const seed = seedTeams.find((t) => t.code === code);
  return {
    code,
    name: name || seed?.name || code,
    crest,
    iso2: getIso2(code),
    capital: seed?.capital,
    confederation: seed?.confederation,
    fifaRank: seed?.fifaRank,
  };
}

function mapKnockoutRound(stage: string): BracketRound {
  const s = stage.toUpperCase();
  if (s.includes("FINAL") && !s.includes("QUARTER") && !s.includes("SEMI") && !s.includes("3RD")) {
    return "FINAL";
  }
  if (s.includes("SEMI")) return "SF";
  if (s.includes("QUARTER")) return "QF";
  if (s.includes("LAST_16") || s.includes("ROUND_OF_16") || s.includes("ROUND OF 16")) return "R16";
  if (s.includes("LAST_32") || s.includes("ROUND_OF_32") || s.includes("ROUND OF 32")) return "R32";
  if (s.includes("3RD") || s.includes("THIRD")) return "THIRD";
  return "R32";
}

function mapStage(stage: string): MatchStage {
  const s = stage.toUpperCase();
  if (s === "GROUP_STAGE" || s.startsWith("GROUP")) return "GROUP";
  return mapKnockoutRound(stage);
}

function isKnockoutStage(stage: MatchStage): stage is BracketRound {
  return stage !== "GROUP";
}

type FootballDataScoreSide = {
  home?: number | null;
  away?: number | null;
  homeTeam?: number | null;
  awayTeam?: number | null;
};

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group?: string | null;
  homeTeam: { id: number | null; name: string | null; shortName?: string | null; tla?: string | null; crest?: string | null };
  awayTeam: { id: number | null; name: string | null; shortName?: string | null; tla?: string | null; crest?: string | null };
  score: {
    fullTime?: FootballDataScoreSide | null;
    regularTime?: FootballDataScoreSide | null;
    duration?: string | null;
    winner?: string | null;
  };
  venue?: string | null;
}

function readScoreSide(side: FootballDataScoreSide | null | undefined): {
  home: number | null;
  away: number | null;
} {
  if (!side) return { home: null, away: null };
  return {
    home: side.home ?? side.homeTeam ?? null,
    away: side.away ?? side.awayTeam ?? null,
  };
}

function resolveDisplayScores(score: FootballDataMatch["score"]): {
  home: number | null;
  away: number | null;
} {
  const fullTime = readScoreSide(score.fullTime);
  const regularTime = readScoreSide(score.regularTime);
  const duration = score.duration ?? "REGULAR";

  if (
    (duration === "PENALTY_SHOOTOUT" || duration === "EXTRA_TIME") &&
    regularTime.home !== null &&
    regularTime.away !== null
  ) {
    return regularTime;
  }

  return fullTime;
}

function resolveWinnerCode(
  winner: string | null | undefined,
  homeCode: string,
  awayCode: string
): string | undefined {
  if (!winner || winner === "DRAW") return undefined;
  if (winner === "HOME_TEAM") return homeCode;
  if (winner === "AWAY_TEAM") return awayCode;
  return winner;
}

function toStatus(status: string): MatchInfo["status"] {
  const map: Record<string, MatchInfo["status"]> = {
    SCHEDULED: "SCHEDULED",
    TIMED: "SCHEDULED",
    LIVE: "LIVE",
    IN_PLAY: "IN_PLAY",
    PAUSED: "PAUSED",
    FINISHED: "FINISHED",
    POSTPONED: "POSTPONED",
    CANCELLED: "CANCELLED",
  };
  return map[status] ?? "SCHEDULED";
}

function parseApiMatch(m: FootballDataMatch): MatchInfo {
  const homeCode = m.homeTeam.tla ?? "TBD";
  const awayCode = m.awayTeam.tla ?? "TBD";
  const stage = mapStage(m.stage);
  const rawVenue = m.venue?.trim() || "";
  const resolved = resolveStadium(rawVenue);
  const { home, away } = resolveDisplayScores(m.score);
  return {
    id: m.id,
    round: isKnockoutStage(stage) ? stage : "R32",
    stage,
    group: m.group ?? undefined,
    homeTeam: buildTeamInfo(homeCode, m.homeTeam.name ?? "TBD", m.homeTeam.crest ?? undefined),
    awayTeam: buildTeamInfo(awayCode, m.awayTeam.name ?? "TBD", m.awayTeam.crest ?? undefined),
    homeScore: home,
    awayScore: away,
    status: toStatus(m.status),
    utcDate: m.utcDate,
    venue: resolved?.venue ?? rawVenue,
    city: resolved?.city,
    winnerCode: resolveWinnerCode(m.score.winner, homeCode, awayCode),
  };
}

const LIVE_STATUSES = new Set<MatchInfo["status"]>(["LIVE", "IN_PLAY", "PAUSED"]);

function sortMatches(a: MatchInfo, b: MatchInfo): number {
  return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
}

export function isTodayMatch(match: MatchInfo, now = new Date(), timeZone?: string): boolean {
  if (LIVE_STATUSES.has(match.status)) return true;

  const tz = resolveScheduleTimeZone(timeZone);
  const today = todayKey(now, tz);
  if (!isOnLocalDay(match.utcDate, today, tz)) return false;

  return match.status === "SCHEDULED" || match.status === "FINISHED";
}

export function isUpcomingMatch(match: MatchInfo, now = new Date(), timeZone?: string): boolean {
  if (match.status !== "SCHEDULED") return false;

  const tz = resolveScheduleTimeZone(timeZone);
  const today = todayKey(now, tz);
  const horizon = addDaysToDayKey(today, 30);

  const matchDay = localDayKeyFromUtc(match.utcDate, tz);
  return matchDay > today && matchDay <= horizon;
}

export function selectTodayMatches(matches: MatchInfo[]): MatchInfo[] {
  return matches.filter((m) => isTodayMatch(m)).sort(sortMatches);
}

export function selectUpcomingMatches(matches: MatchInfo[]): MatchInfo[] {
  return matches.filter((m) => isUpcomingMatch(m)).sort(sortMatches);
}

function generateSeedGroupMatches(): MatchInfo[] {
  const groups = Array.from({ length: 12 }, (_, i) => `GROUP_${String.fromCharCode(65 + i)}`);
  const venues = [
    { venue: "MetLife Stadium", city: "East Rutherford, NJ" },
    { venue: "SoFi Stadium", city: "Inglewood, CA" },
    { venue: "AT&T Stadium", city: "Arlington, TX" },
    { venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
    { venue: "Hard Rock Stadium", city: "Miami Gardens, FL" },
    { venue: "Estadio Azteca", city: "Mexico City" },
    { venue: "BC Place", city: "Vancouver" },
    { venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
  ];

  /** Official-style group-stage windows: three matchdays, four groups per calendar day. */
  const matchdayBases = ["2026-06-11", "2026-06-16", "2026-06-22"];
  const kickoffHours = [13, 16, 19, 22];

  const matches: MatchInfo[] = [];
  let id = 1000;
  const nowMs = Date.now();

  const roundRobin = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [0, 3],
    [1, 2],
  ];

  groups.forEach((group, gi) => {
    const codes = officialGroups[group];
    if (!codes?.length) return;

    const groupTeams = codes.map((code) => buildTeamInfo(code, ""));
    if (groupTeams.length < 4) return;

    roundRobin.forEach((pair, pi) => {
      const matchday = Math.floor(pi / 2);
      const dayInMatchday = Math.floor(gi / 4);
      const dayKey = addDaysToDayKey(matchdayBases[matchday]!, dayInMatchday);
      const hour = kickoffHours[gi % 4]! + (pi % 2);
      const minute = gi % 2 === 0 ? 0 : 30;
      const utcDate = tournamentKickoffIso(dayKey, hour, minute);
      const finished = new Date(utcDate).getTime() < nowMs;

      const scores = finished
        ? pi % 2 === 0
          ? [2, 1]
          : [1, 1]
        : [null, null];
      const v = venues[(gi + pi) % venues.length];

      matches.push({
        id: id++,
        round: "R32",
        stage: "GROUP",
        group,
        homeTeam: groupTeams[pair[0]!]!,
        awayTeam: groupTeams[pair[1]!]!,
        homeScore: scores[0]!,
        awayScore: scores[1]!,
        status: finished ? "FINISHED" : "SCHEDULED",
        utcDate,
        venue: v.venue,
        city: v.city,
        winnerCode:
          finished && scores[0] !== null && scores[1] !== null
            ? scores[0]! > scores[1]!
              ? groupTeams[pair[0]!]!.code
              : scores[0]! < scores[1]!
                ? groupTeams[pair[1]!]!.code
                : undefined
            : undefined,
      });
    });
  });

  return matches;
}

function generateSeedBracket(): MatchInfo[] {
  const teams = seedTeams.slice(0, 32).map((t) => buildTeamInfo(t.code, t.name));
  const matches: MatchInfo[] = [];
  let id = 1;
  const baseDate = new Date("2026-06-28T18:00:00Z");

  const venues = [
    { venue: "MetLife Stadium", city: "East Rutherford, NJ" },
    { venue: "SoFi Stadium", city: "Inglewood, CA" },
    { venue: "AT&T Stadium", city: "Arlington, TX" },
    { venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
    { venue: "Hard Rock Stadium", city: "Miami Gardens, FL" },
    { venue: "Estadio Azteca", city: "Mexico City" },
    { venue: "BC Place", city: "Vancouver" },
    { venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
  ];

  const rounds: BracketRound[] = ["R32", "R16", "QF", "SF", "FINAL"];
  const counts = [16, 8, 4, 2, 1];

  rounds.forEach((round, ri) => {
    for (let i = 0; i < counts[ri]; i++) {
      const hi = (i * 2) % teams.length;
      const ai = (i * 2 + 1) % teams.length;
      const d = new Date(baseDate);
      d.setDate(d.getDate() + ri * 4 + i);
      const v = venues[i % venues.length];

      const isFirstKnockout = round === "R32";
      const groupLetter = String.fromCharCode(65 + (i % 12));
      const placeholderHome =
        round === "R16"
          ? `Winner · Group ${groupLetter}`
          : round === "QF"
            ? `Winner · R32 ${i + 1}`
            : round === "SF"
              ? `Winner · QF ${i + 1}`
              : round === "FINAL"
                ? "Winner · Semi 1"
                : "TBD";
      const placeholderAway =
        round === "R16"
          ? `Runner-up · Group ${String.fromCharCode(65 + ((i + 1) % 12))}`
          : round === "QF"
            ? `Winner · R32 ${i + 2}`
            : round === "SF"
              ? `Winner · QF ${i + 2}`
              : round === "FINAL"
                ? "Winner · Semi 2"
                : "TBD";

      matches.push({
        id: id++,
        round,
        stage: round,
        homeTeam: isFirstKnockout ? teams[hi] : buildTeamInfo("TBD", placeholderHome),
        awayTeam: isFirstKnockout ? teams[ai] : buildTeamInfo("TBD", placeholderAway),
        homeScore: null,
        awayScore: null,
        status: "SCHEDULED",
        utcDate: d.toISOString(),
        venue: v.venue,
        city: v.city,
      });
    }
  });

  return matches;
}

export async function fetchMatches(): Promise<{
  matches: MatchInfo[];
  groupMatches: MatchInfo[];
  todayMatches: MatchInfo[];
  upcomingMatches: MatchInfo[];
  source: "api" | "seed";
}> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches?season=2026", {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 120 },
      });

      if (res.ok) {
        const data = (await res.json()) as { matches: FootballDataMatch[] };
        const all = await enrichMatchVenues(data.matches.map(parseApiMatch), {
          footballDataApiKey: apiKey,
          useGrok: false,
        });

        if (all.length > 0) {
          const groupMatches = all.filter((m) => m.stage === "GROUP");
          const standings = computeGroupStandings(groupMatches);
          const knockoutRaw = all.filter((m) => isKnockoutStage(m.stage));
          const knockout = enrichKnockoutBracket(
            knockoutRaw.length > 0 ? knockoutRaw : generateSeedBracket(),
            groupMatches,
            standings
          );
          const todayMatches = selectTodayMatches(all);
          const upcomingMatches = selectUpcomingMatches(all);

          return {
            matches: knockout,
            groupMatches,
            todayMatches,
            upcomingMatches,
            source: "api",
          };
        }
      }
    } catch {
      // fall through to seed
    }
  }

  const groupMatches = generateSeedGroupMatches();
  const standings = computeGroupStandings(groupMatches);
  const knockoutMatches = enrichKnockoutBracket(
    generateSeedBracket(),
    groupMatches,
    standings
  );
  const todayMatches = selectTodayMatches(groupMatches);
  const upcomingMatches = selectUpcomingMatches(groupMatches);

  return {
    matches: knockoutMatches,
    groupMatches,
    todayMatches,
    upcomingMatches,
    source: "seed",
  };
}

export function groupMatchesByRound(matches: MatchInfo[]): Record<BracketRound, MatchInfo[]> {
  const grouped: Record<BracketRound, MatchInfo[]> = {
    R32: [],
    R16: [],
    QF: [],
    SF: [],
    FINAL: [],
    THIRD: [],
  };

  for (const m of matches) {
    if (!isKnockoutStage(m.stage)) continue;
    grouped[m.round].push(m);
  }

  for (const round of ROUND_ORDER) {
    grouped[round].sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  }

  return grouped;
}
