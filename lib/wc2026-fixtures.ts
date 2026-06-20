import groupFixtures from "@/data/wc2026-group-fixtures.json";
import type { MatchInfo } from "@/lib/types";

type GroupFixtureDef = {
  fifaMatch: number;
  venue: string;
  city: string;
};

const fixtures = groupFixtures as Record<string, GroupFixtureDef>;

export function groupFixtureKey(match: Pick<MatchInfo, "group" | "homeTeam" | "awayTeam">): string | null {
  if (!match.group) return null;
  return `${match.group}|${match.homeTeam.code}|${match.awayTeam.code}`;
}

export function lookupGroupFixture(
  match: Pick<MatchInfo, "group" | "stage" | "homeTeam" | "awayTeam">
): GroupFixtureDef | undefined {
  if (match.stage !== "GROUP") return undefined;
  const key = groupFixtureKey(match);
  return key ? fixtures[key] : undefined;
}
