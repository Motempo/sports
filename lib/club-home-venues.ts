import plHomeVenues from "@/data/pl-home-venues.json";
import laLigaHomeVenues from "@/data/la-liga-home-venues.json";
import { isMissingVenue } from "@/lib/match-venue";
import type { MatchInfo } from "@/lib/types";

type HomeVenue = { code: string; venue: string; city: string };

const plByCode = new Map(
  (plHomeVenues as HomeVenue[]).map((entry) => [entry.code, entry] as const)
);
const laLigaByCode = new Map(
  (laLigaHomeVenues as HomeVenue[]).map((entry) => [entry.code, entry] as const)
);

function applyHomeVenue(
  match: MatchInfo,
  byCode: Map<string, HomeVenue>
): MatchInfo {
  if (!isMissingVenue(match.venue)) return match;
  const home = byCode.get(match.homeTeam.code);
  if (!home) return match;
  return { ...match, venue: home.venue, city: home.city };
}

/** Fill empty league venues from the home club's known ground. */
export function applyPremierLeagueHomeVenues(matches: MatchInfo[]): MatchInfo[] {
  return matches.map((match) => applyHomeVenue(match, plByCode));
}

export function applyLaLigaHomeVenues(matches: MatchInfo[]): MatchInfo[] {
  return matches.map((match) => applyHomeVenue(match, laLigaByCode));
}
