/**
 * Proves the World Cup seed fallback does not invent results.
 * Run: npx tsx scripts/verify-seed-group-matches.ts
 *
 * No test runner is committed (open PRs already edit package.json).
 */
import assert from "node:assert/strict";
import { computeGroupStandings } from "../lib/group-standings";
import { fetchMatches, generateSeedGroupMatches } from "../lib/football-data";

function assertUnplayed(label: string, matches: ReturnType<typeof generateSeedGroupMatches>) {
  assert.ok(matches.length > 0, `${label}: expected group fixtures`);
  const now = Date.now();
  assert.ok(
    matches.some((match) => new Date(match.utcDate).getTime() < now),
    `${label}: expected at least one kickoff already in the past`
  );

  for (const match of matches) {
    assert.equal(match.status, "SCHEDULED", `${label}: ${match.id} status`);
    assert.equal(match.homeScore, null, `${label}: ${match.id} homeScore`);
    assert.equal(match.awayScore, null, `${label}: ${match.id} awayScore`);
    assert.equal(match.winnerCode, undefined, `${label}: ${match.id} winnerCode`);
  }

  const standings = computeGroupStandings(matches);
  assert.ok(standings.length > 0, `${label}: expected groups`);
  for (const group of standings) {
    assert.equal(group.matchday, 0, `${label}: ${group.groupId} matchday`);
    for (const row of group.rows) {
      assert.equal(row.played, 0, `${label}: ${row.team.code} played`);
      assert.equal(row.points, 0, `${label}: ${row.team.code} points`);
      assert.equal(row.goalsFor, 0, `${label}: ${row.team.code} goalsFor`);
    }
  }
}

async function main() {
  const seeded = generateSeedGroupMatches();
  assert.equal(seeded.length, 72, "official group grid is 12 groups × 6 matches");
  assertUnplayed("generator", seeded);

  const originalFetch = globalThis.fetch;
  const previousKey = process.env.FOOTBALL_DATA_API_KEY;
  delete process.env.FOOTBALL_DATA_API_KEY;
  globalThis.fetch = async () => {
    throw new Error("forced upstream failure");
  };

  try {
    const payload = await fetchMatches();
    assert.equal(payload.source, "seed");
    assertUnplayed("fetchMatches", payload.groupMatches);
    for (const match of payload.matches) {
      assert.equal(match.homeScore, null, `knockout ${match.id} homeScore`);
      assert.equal(match.awayScore, null, `knockout ${match.id} awayScore`);
      assert.notEqual(match.status, "FINISHED", `knockout ${match.id} status`);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.FOOTBALL_DATA_API_KEY;
    else process.env.FOOTBALL_DATA_API_KEY = previousKey;
  }

  console.log(
    `OK seed fallback: ${seeded.length} scheduled group matches, 0 played, null scores`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
