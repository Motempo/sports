import teamIsoMap from "@/data/team-iso-map.json";
import teamSeed from "@/data/team-seed.json";
import type { BracketRound, MatchInfo, TeamInfo } from "@/lib/types";
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

function mapRound(stage: string): BracketRound {
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

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
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
  return {
    id: m.id,
    round: mapRound(m.stage),
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

export async function fetchMatches(): Promise<{ matches: MatchInfo[]; source: "api" | "seed" }> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 600 },
      });

      if (res.ok) {
        const data = (await res.json()) as { matches: FootballDataMatch[] };
        const knockout = data.matches
          .filter((m) => {
            const stage = m.stage.toUpperCase();
            return (
              stage.includes("LAST") ||
              stage.includes("ROUND") ||
              stage.includes("QUARTER") ||
              stage.includes("SEMI") ||
              stage.includes("FINAL")
            );
          })
          .map(parseApiMatch);

        if (knockout.length > 0) {
          return { matches: knockout, source: "api" };
        }
      }
    } catch {
      // fall through to seed
    }
  }

  return { matches: generateSeedBracket(), source: "seed" };
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
    grouped[m.round].push(m);
  }

  for (const round of ROUND_ORDER) {
    grouped[round].sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  }

  return grouped;
}
