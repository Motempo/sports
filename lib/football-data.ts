import teamIsoMap from "@/data/team-iso-map.json";
import teamSeed from "@/data/team-seed.json";
import type { BracketRound, MatchInfo, MatchStage, TeamInfo } from "@/lib/types";
import { ROUND_ORDER } from "@/lib/bracket-constants";

const isoMap = teamIsoMap as Record<string, string>;
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

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group?: string | null;
  homeTeam: { id: number | null; name: string | null; shortName?: string | null; tla?: string | null; crest?: string | null };
  awayTeam: { id: number | null; name: string | null; shortName?: string | null; tla?: string | null; crest?: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
    winner?: string | null;
  };
  venue?: string | null;
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
  return {
    id: m.id,
    round: isKnockoutStage(stage) ? stage : "R32",
    stage,
    group: m.group ?? undefined,
    homeTeam: buildTeamInfo(homeCode, m.homeTeam.name ?? "TBD", m.homeTeam.crest ?? undefined),
    awayTeam: buildTeamInfo(awayCode, m.awayTeam.name ?? "TBD", m.awayTeam.crest ?? undefined),
    homeScore: m.score.fullTime.home,
    awayScore: m.score.fullTime.away,
    status: toStatus(m.status),
    utcDate: m.utcDate,
    venue: m.venue ?? "TBD",
    winnerCode: m.score.winner ?? undefined,
  };
}

const LIVE_STATUSES = new Set<MatchInfo["status"]>(["LIVE", "IN_PLAY", "PAUSED"]);

export function isCurrentMatch(match: MatchInfo, now = new Date()): boolean {
  if (LIVE_STATUSES.has(match.status)) return true;

  const matchTime = new Date(match.utcDate).getTime();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfWindow = new Date(startOfToday);
  endOfWindow.setDate(endOfWindow.getDate() + 2);

  const inWindow = matchTime >= startOfToday.getTime() && matchTime < endOfWindow.getTime();
  if (!inWindow) return false;

  return match.status === "SCHEDULED" || match.status === "FINISHED";
}

export function selectCurrentMatches(matches: MatchInfo[]): MatchInfo[] {
  return matches
    .filter((m) => isCurrentMatch(m))
    .sort((a, b) => {
      const aLive = LIVE_STATUSES.has(a.status) ? 0 : 1;
      const bLive = LIVE_STATUSES.has(b.status) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
    });
}

function generateSeedGroupMatches(): MatchInfo[] {
  const teams = seedTeams.slice(0, 48).map((t) => buildTeamInfo(t.code, t.name));
  const groups = ["GROUP_A", "GROUP_B", "GROUP_C", "GROUP_D", "GROUP_E", "GROUP_F", "GROUP_G", "GROUP_H"];
  const venues = [
    { venue: "MetLife Stadium", city: "East Rutherford, NJ" },
    { venue: "SoFi Stadium", city: "Los Angeles, CA" },
    { venue: "AT&T Stadium", city: "Arlington, TX" },
    { venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
    { venue: "Hard Rock Stadium", city: "Miami, FL" },
    { venue: "Estadio Azteca", city: "Mexico City" },
    { venue: "BC Place", city: "Vancouver" },
    { venue: "Lincoln Financial Field", city: "Philadelphia, PA" },
  ];

  const now = new Date();
  const matches: MatchInfo[] = [];
  let id = 1000;

  groups.forEach((group, gi) => {
    const base = gi * 4;
    const pairings = [
      [base, base + 1],
      [base + 2, base + 3],
      [base, base + 2],
    ];

    pairings.forEach((pair, pi) => {
      const d = new Date(now);
      d.setDate(d.getDate() - 1 + pi);
      d.setHours(14 + pi * 3, 0, 0, 0);

      const finished = pi === 0;
      const v = venues[(gi + pi) % venues.length];

      matches.push({
        id: id++,
        round: "R32",
        stage: "GROUP",
        group,
        homeTeam: teams[pair[0] % teams.length],
        awayTeam: teams[pair[1] % teams.length],
        homeScore: finished ? 2 : null,
        awayScore: finished ? 1 : null,
        status: finished ? "FINISHED" : pi === 1 ? "SCHEDULED" : "SCHEDULED",
        utcDate: d.toISOString(),
        venue: v.venue,
        city: v.city,
        winnerCode: finished ? teams[pair[0] % teams.length].code : undefined,
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
    { venue: "SoFi Stadium", city: "Los Angeles, CA" },
    { venue: "AT&T Stadium", city: "Arlington, TX" },
    { venue: "Mercedes-Benz Stadium", city: "Atlanta, GA" },
    { venue: "Hard Rock Stadium", city: "Miami, FL" },
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
      matches.push({
        id: id++,
        round,
        stage: round,
        homeTeam: round === "R32" ? teams[hi] : buildTeamInfo("TBD", "TBD"),
        awayTeam: round === "R32" ? teams[ai] : buildTeamInfo("TBD", "TBD"),
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
  currentMatches: MatchInfo[];
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
        const all = data.matches.map(parseApiMatch);

        if (all.length > 0) {
          const knockout = all.filter((m) => isKnockoutStage(m.stage));
          const currentMatches = selectCurrentMatches(all);

          return {
            matches: knockout.length > 0 ? knockout : generateSeedBracket(),
            currentMatches,
            source: "api",
          };
        }
      }
    } catch {
      // fall through to seed
    }
  }

  const groupMatches = generateSeedGroupMatches();
  const knockoutMatches = generateSeedBracket();

  return {
    matches: knockoutMatches,
    currentMatches: selectCurrentMatches(groupMatches),
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
