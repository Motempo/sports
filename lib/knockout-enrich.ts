import knockoutFixtures from "@/data/wc2026-knockout-fixtures.json";
import teamIsoMap from "@/data/team-iso-map.json";
import type { GroupStandings } from "@/lib/group-standings";
import { isMissingVenue } from "@/lib/match-venue";
import type { MatchInfo, TeamInfo } from "@/lib/types";

type SlotDef = { code: string; name: string };

type FixtureDef = {
  fifaMatch: number;
  home: SlotDef;
  away: SlotDef;
  venue: string;
  city: string;
};

const fixtures = knockoutFixtures as Record<string, FixtureDef>;
const isoMap = teamIsoMap as Record<string, string>;

function slotTeam(code: string, name: string): TeamInfo {
  return {
    code,
    name,
    iso2: isoMap[code] ?? "un",
  };
}

function isRealTeam(team: TeamInfo): boolean {
  return team.code !== "TBD" && team.name !== "TBD";
}

function isGroupComplete(groupId: string, groupMatches: MatchInfo[]): boolean {
  const games = groupMatches.filter((m) => m.group === groupId);
  return games.length >= 6 && games.every((m) => m.status === "FINISHED");
}

function teamFromGroupPosition(
  groupLetter: string,
  position: 1 | 2,
  standings: GroupStandings[],
  groupMatches: MatchInfo[]
): TeamInfo | null {
  const groupId = `GROUP_${groupLetter}`;
  if (!isGroupComplete(groupId, groupMatches)) return null;

  const group = standings.find((g) => g.groupId === groupId);
  const row = group?.rows.find((r) => r.position === position);
  return row?.team ?? null;
}

function parseGroupSlot(code: string): { letter: string; position: 1 | 2 } | null {
  const match = code.match(/^([12])([A-L])$/);
  if (!match) return null;
  return { letter: match[2]!, position: match[1] === "1" ? 1 : 2 };
}

function parseWinnerSlot(code: string): number | null {
  const match = code.match(/^W(\d+)$/);
  return match ? Number(match[1]) : null;
}

function resolveSlotTeam(
  slot: SlotDef,
  matchesByFifa: Map<number, MatchInfo>,
  standings: GroupStandings[],
  groupMatches: MatchInfo[]
): TeamInfo | null {
  const groupSlot = parseGroupSlot(slot.code);
  if (groupSlot) {
    return teamFromGroupPosition(
      groupSlot.letter,
      groupSlot.position,
      standings,
      groupMatches
    );
  }

  const winnerMatch = parseWinnerSlot(slot.code);
  if (winnerMatch) {
    const source = matchesByFifa.get(winnerMatch);
    if (!source || source.status !== "FINISHED" || !source.winnerCode) return null;
    const winner =
      source.homeTeam.code === source.winnerCode ? source.homeTeam : source.awayTeam;
    return isRealTeam(winner) ? winner : null;
  }

  return null;
}

function applyFixtureMetadata(match: MatchInfo, fixture: FixtureDef): MatchInfo {
  let homeTeam = match.homeTeam;
  let awayTeam = match.awayTeam;

  if (!isRealTeam(homeTeam)) {
    homeTeam = slotTeam(fixture.home.code, fixture.home.name);
  }
  if (!isRealTeam(awayTeam)) {
    awayTeam = slotTeam(fixture.away.code, fixture.away.name);
  }

  const venue = isMissingVenue(match.venue) ? fixture.venue : match.venue;
  const city = match.city || fixture.city;

  return { ...match, homeTeam, awayTeam, venue, city };
}

function resolveKnownTeams(
  match: MatchInfo,
  matchesByFifa: Map<number, MatchInfo>,
  standings: GroupStandings[],
  groupMatches: MatchInfo[]
): MatchInfo {
  const fixture = fixtures[String(match.id)];
  if (!fixture) return match;

  let homeTeam = match.homeTeam;
  let awayTeam = match.awayTeam;

  if (!isRealTeam(homeTeam)) {
    const resolved = resolveSlotTeam(fixture.home, matchesByFifa, standings, groupMatches);
    homeTeam = resolved ?? homeTeam;
  }
  if (!isRealTeam(awayTeam)) {
    const resolved = resolveSlotTeam(fixture.away, matchesByFifa, standings, groupMatches);
    awayTeam = resolved ?? awayTeam;
  }

  return { ...match, homeTeam, awayTeam };
}

/**
 * Fill knockout bracket slots, venues, and known teams when the football-data API
 * only returns TBD placeholders.
 */
export function enrichKnockoutBracket(
  knockoutMatches: MatchInfo[],
  groupMatches: MatchInfo[],
  standings: GroupStandings[]
): MatchInfo[] {
  const withMetadata = knockoutMatches.map((match) => {
    const fixture = fixtures[String(match.id)];
    return fixture ? applyFixtureMetadata(match, fixture) : match;
  });

  const matchesByFifa = new Map<number, MatchInfo>();
  for (const match of withMetadata) {
    const fixture = fixtures[String(match.id)];
    if (fixture) matchesByFifa.set(fixture.fifaMatch, match);
  }

  let enriched = withMetadata.map((match) =>
    resolveKnownTeams(match, matchesByFifa, standings, groupMatches)
  );

  // Re-run winner propagation after group teams are applied (two passes).
  for (let pass = 0; pass < 2; pass++) {
    enriched = enriched.map((match) => {
      const fixture = fixtures[String(match.id)];
      if (!fixture) return match;
      matchesByFifa.set(fixture.fifaMatch, match);
      return resolveKnownTeams(match, matchesByFifa, standings, groupMatches);
    });
  }

  return enriched;
}
