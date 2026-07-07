import knockoutFixtures from "@/data/wc2026-knockout-fixtures.json";
import teamSeed from "@/data/team-seed.json";
import { cacheBustUrl, freshUpstreamFetch } from "@/lib/fetch-options";
import { inferMatchStatusFromKickoff } from "@/lib/match-status";
import type { BracketRound, MatchInfo, MatchStage } from "@/lib/types";
import { buildTeamInfo } from "@/lib/team-info";

/** Fast-updating community mirror, then the official openfootball export. */
const OPENFOOTBALL_URLS = [
  "https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json",
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
] as const;

export type OpenFootballGoal = {
  name: string;
  minute: number | string;
  penalty?: boolean;
  owngoal?: boolean;
};

export type OpenFootballMatch = {
  round?: string;
  num?: number;
  date?: string;
  time?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number] };
  goals1?: OpenFootballGoal[];
  goals2?: OpenFootballGoal[];
  group?: string;
  ground?: string;
};

type OpenFootballDoc = {
  matches?: OpenFootballMatch[];
};

const seedTeams = teamSeed as Array<{ code: string; name: string }>;

const fifaToFixtureId = new Map<number, number>();
for (const [idStr, fixture] of Object.entries(
  knockoutFixtures as Record<string, { fifaMatch: number }>
)) {
  fifaToFixtureId.set(fixture.fifaMatch, Number(idStr));
}

/** Alternate names used by openfootball vs our seed roster. */
const TEAM_NAME_ALIASES: Record<string, string> = {
  "czech republic": "CZE",
  "czechia": "CZE",
  "ivory coast": "CIV",
  "cote d'ivoire": "CIV",
  "korea republic": "KOR",
  "south korea": "KOR",
  "united states": "USA",
  "usa": "USA",
  "dr congo": "COD",
  "democratic republic of congo": "COD",
  "congo dr": "COD",
  "bosnia and herzegovina": "BIH",
  "bosnia & herzegovina": "BIH",
  "curacao": "CUW",
  "curaçao": "CUW",
  "saudi arabia": "SAU",
  "new zealand": "NZL",
  "south africa": "RSA",
  "cape verde": "CPV",
  "cape verde islands": "CPV",
};

const nameToCode = new Map<string, string>();
for (const team of seedTeams) {
  nameToCode.set(normalizeTeamName(team.name), team.code);
}
for (const [alias, code] of Object.entries(TEAM_NAME_ALIASES)) {
  nameToCode.set(alias, code);
}

function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Map an openfootball team label to our FIFA three-letter code. */
export function resolveOpenFootballTeamCode(teamName: string): string {
  const code = nameToCode.get(normalizeTeamName(teamName.trim()));
  return code ?? teamName.slice(0, 3).toUpperCase();
}

function matchMergeKey(raw: OpenFootballMatch): string | null {
  if (!raw.date || !raw.team1 || !raw.team2) return null;
  return `${raw.date}|${normalizeTeamName(raw.team1)}|${normalizeTeamName(raw.team2)}`;
}

function mergeOpenFootballDocs(docs: OpenFootballDoc[]): OpenFootballMatch[] {
  const merged = new Map<string, OpenFootballMatch>();

  for (const doc of docs) {
    for (const match of doc.matches ?? []) {
      const key = matchMergeKey(match);
      if (!key) continue;

      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, match);
        continue;
      }

      const existingScored = Boolean(existing.score?.ft);
      const incomingScored = Boolean(match.score?.ft);
      if (incomingScored && !existingScored) {
        merged.set(key, match);
        continue;
      }
      if (incomingScored && existingScored) {
        merged.set(key, match);
      }
    }
  }

  return [...merged.values()];
}

function mapRound(round: string): BracketRound {
  const r = round.toLowerCase();
  if (r === "final") return "FINAL";
  if (r.includes("third")) return "THIRD";
  if (r.includes("semi")) return "SF";
  if (r.includes("quarter")) return "QF";
  if (r.includes("round of 16")) return "R16";
  return "R32";
}

function mapStage(round: string): MatchStage {
  if (round.startsWith("Matchday")) return "GROUP";
  return mapRound(round);
}

function parseKickoff(date: string, time?: string): string {
  if (!time) return `${date}T18:00:00Z`;

  const match = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]?\d+(?::\d{2})?)?$/i);
  if (!match) return `${date}T18:00:00Z`;

  const hour = match[1]!.padStart(2, "0");
  const minute = match[2]!;
  let offset = match[3] ?? "0";
  if (!offset.includes(":")) {
    const sign = offset.startsWith("-") ? "-" : "+";
    const digits = offset.replace(/^[-+]/, "").padStart(2, "0");
    offset = `${sign}${digits}:00`;
  } else if (/^[+-]\d:$/.test(offset)) {
    offset = `${offset[0]}0${offset.slice(1)}:00`;
  } else if (/^[+-]\d{2}$/.test(offset)) {
    offset = `${offset}:00`;
  }

  return new Date(`${date}T${hour}:${minute}:00${offset}`).toISOString();
}

function parseSlotTeam(raw: string): MatchInfo["homeTeam"] {
  const trimmed = raw.trim();

  if (/^[12][A-L]$/.test(trimmed) || /^W\d+$/.test(trimmed) || /^L\d+$/.test(trimmed)) {
    const position = trimmed.startsWith("1")
      ? "Winner"
      : trimmed.startsWith("2")
        ? "Runner-up"
        : trimmed.startsWith("W")
          ? "Winner"
          : "Loser";
    const label = /^[12][A-L]$/.test(trimmed)
      ? `${trimmed.startsWith("1") ? "Winner" : "Runner-up"} Group ${trimmed[1]}`
      : `${position} Match ${trimmed.slice(1)}`;
    return buildTeamInfo(trimmed, label);
  }

  if (/^3([A-L](\/[A-L])*)$/.test(trimmed)) {
    const groups = trimmed.slice(1).split("/").join("/");
    return buildTeamInfo("3RD", `Best 3rd · Groups ${groups}`);
  }

  const code = nameToCode.get(normalizeTeamName(trimmed));
  if (code) return buildTeamInfo(code, trimmed);

  return buildTeamInfo("TBD", trimmed);
}

function stableGroupMatchId(date: string, team1: string, team2: string): number {
  let hash = 0;
  const key = `${date}|${team1}|${team2}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return 100_000 + (hash % 900_000);
}

function parseOpenFootballMatch(raw: OpenFootballMatch): MatchInfo | null {
  if (!raw.team1 || !raw.team2 || !raw.date) return null;

  const roundLabel = raw.round ?? "Matchday 1";
  const stage = mapStage(roundLabel);
  const round = stage === "GROUP" ? "R32" : stage;
  const homeTeam = parseSlotTeam(raw.team1);
  const awayTeam = parseSlotTeam(raw.team2);
  const utcDate = parseKickoff(raw.date, raw.time);
  const hasFinalScore = Boolean(raw.score?.ft);
  const homeScore = raw.score?.ft?.[0] ?? null;
  const awayScore = raw.score?.ft?.[1] ?? null;

  let winnerCode: string | undefined;
  if (hasFinalScore && homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) winnerCode = homeTeam.code;
    else if (awayScore > homeScore) winnerCode = awayTeam.code;
  }

  const id =
    raw.num != null
      ? (fifaToFixtureId.get(raw.num) ?? 500_000 + raw.num)
      : stableGroupMatchId(raw.date, raw.team1, raw.team2);

  const group =
    raw.group != null ? raw.group.replace(/\s+/g, "_").toUpperCase() : undefined;

  return {
    id,
    round,
    stage,
    group,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    status: inferMatchStatusFromKickoff(utcDate, hasFinalScore),
    utcDate,
    venue: raw.ground ?? "",
    winnerCode,
  };
}

export async function fetchOpenFootballRawMatches(): Promise<OpenFootballMatch[]> {
  const docs = await Promise.all(OPENFOOTBALL_URLS.map((url) => fetchOpenFootballDoc(url)));
  return mergeOpenFootballDocs(docs.filter((doc): doc is OpenFootballDoc => doc != null));
}

async function fetchOpenFootballDoc(url: string): Promise<OpenFootballDoc | null> {
  try {
    const res = await fetch(cacheBustUrl(url), freshUpstreamFetch);
    if (!res.ok) return null;
    return (await res.json()) as OpenFootballDoc;
  } catch {
    return null;
  }
}

/**
 * Free public-domain World Cup 2026 fixtures and results (no API key).
 * Pulls from fast-updating and official mirrors in parallel on every call.
 * @see https://github.com/openfootball/worldcup.json
 */
export async function fetchOpenFootballMatches(): Promise<MatchInfo[]> {
  const docs = await Promise.all(OPENFOOTBALL_URLS.map((url) => fetchOpenFootballDoc(url)));
  const merged = mergeOpenFootballDocs(docs.filter((doc): doc is OpenFootballDoc => doc != null));
  if (!merged.length) return [];

  return merged
    .map((match) => parseOpenFootballMatch(match))
    .filter((match): match is MatchInfo => match != null);
}
