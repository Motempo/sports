import type { MatchDataSource } from "@/lib/football-data";
import type { MatchInfo } from "@/lib/types";

export type LeagueCascadeCandidate = {
  matches: MatchInfo[];
  source: Exclude<MatchDataSource, "seed">;
};

/** Finished fixtures drive the league table — prefer the source with the most. */
export function countFinishedMatches(matches: MatchInfo[]): number {
  return matches.filter((match) => match.status === "FINISHED").length;
}

/**
 * Among live mirrors for the current season, pick the freshest board.
 * Seed is never passed here — callers fall back to seed when this returns null.
 */
export function pickFreshestLeagueCandidate(
  candidates: Array<LeagueCascadeCandidate | null | undefined>
): LeagueCascadeCandidate | null {
  const viable = candidates.filter((entry): entry is LeagueCascadeCandidate => {
    return Boolean(entry && entry.matches.length >= 10);
  });
  if (viable.length === 0) return null;

  viable.sort((a, b) => {
    const finishedDelta = countFinishedMatches(b.matches) - countFinishedMatches(a.matches);
    if (finishedDelta !== 0) return finishedDelta;
    // Prefer official API, then ESPN, then community mirror when counts tie.
    const rank = (source: LeagueCascadeCandidate["source"]) =>
      source === "api" ? 0 : source === "espn" ? 1 : 2;
    return rank(a.source) - rank(b.source);
  });

  return viable[0] ?? null;
}
