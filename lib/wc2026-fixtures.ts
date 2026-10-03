import groupFixtures from "@/data/wc2026-group-fixtures.json";
import type { MatchInfo } from "@/lib/types";
import { canonicalTeamCode } from "@/lib/wc-team-codes";

type GroupFixtureDef = {
  fifaMatch: number;
  venue: string;
  city: string;
};

const fixtures = groupFixtures as Record<string, GroupFixtureDef>;

/** Index group fixtures by group + sorted team pair (home/away order from API may differ). */
const fixturesByCanonicalPair = new Map<string, GroupFixtureDef>();
for (const [key, def] of Object.entries(fixtures)) {
  const [group, home, away] = key.split("|");
  if (!group || !home || !away) continue;
  const canonical = `${group}|${[home, away].sort().join("|")}`;
  fixturesByCanonicalPair.set(canonical, def);
  fixturesByCanonicalPair.set(key, def);
}

export function groupFixtureKey(match: Pick<MatchInfo, "group" | "homeTeam" | "awayTeam">): string | null {
  if (!match.group) return null;
  return `${match.group}|${canonicalTeamCode(match.homeTeam.code)}|${canonicalTeamCode(match.awayTeam.code)}`;
}

export function lookupGroupFixture(
  match: Pick<MatchInfo, "group" | "stage" | "homeTeam" | "awayTeam">
): GroupFixtureDef | undefined {
  if (match.stage !== "GROUP" || !match.group) return undefined;

  const direct = groupFixtureKey(match);
  if (direct && fixtures[direct]) return fixtures[direct];

  const swapped = groupFixtureKey({
    group: match.group,
    homeTeam: match.awayTeam,
    awayTeam: match.homeTeam,
  });
  if (swapped && fixtures[swapped]) return fixtures[swapped];

  const home = canonicalTeamCode(match.homeTeam.code);
  const away = canonicalTeamCode(match.awayTeam.code);
  const canonical = `${match.group}|${[home, away].sort().join("|")}`;
  return fixturesByCanonicalPair.get(canonical);
}
