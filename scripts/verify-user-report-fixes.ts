import { espnSeasonDateQueries, isEspnEventInSeason, fetchEspnLeagueMatches } from "../lib/espn-league-data";
import { pickFreshestLeagueCandidate, countFinishedMatches } from "../lib/league-data-cascade";

async function main() {
  console.log("espn queries", espnSeasonDateQueries("2026-27"));
  console.log("in season Aug26", isEspnEventInSeason("2026-08-15T12:00:00Z", 2026));
  console.log("out season Jan26", isEspnEventInSeason("2026-01-15T12:00:00Z", 2026));
  console.log("in season May27", isEspnEventInSeason("2027-05-15T12:00:00Z", 2026));

  const matches = await fetchEspnLeagueMatches("eng.1", "2026-27", {
    resolveCode: (name, tla) => (tla || name.slice(0, 3)).toUpperCase(),
    buildTeam: (code, name, crest, shortName) => ({
      code,
      name: name || code,
      shortName: shortName || code,
      crest: crest || "",
      iso2: code.slice(0, 2).toLowerCase(),
    }),
  });
  if (!matches) throw new Error("ESPN returned null");
  const finished = countFinishedMatches(matches);
  console.log("espn matches", matches.length, "finished", finished);
  if (finished <= 40) throw new Error("expected more than MD4 finished (40)");

  const best = pickFreshestLeagueCandidate([
    {
      matches: matches.slice(0, 40).map((m) => ({ ...m, status: "FINISHED" as const })),
      source: "openfootball",
    },
    { matches, source: "espn" },
  ]);
  console.log("freshest", best?.source, countFinishedMatches(best!.matches));
  if (best?.source !== "espn") throw new Error("expected espn to win");
  console.log("OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
