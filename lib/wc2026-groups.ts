import wc2026Groups from "@/data/wc2026-groups.json";
import type { MatchInfo } from "@/lib/types";

export const OFFICIAL_WC2026_GROUPS = wc2026Groups as Record<string, string[]>;

const GROUP_ORDER = Array.from({ length: 12 }, (_, i) => `GROUP_${String.fromCharCode(65 + i)}`);

/** Map team code → official group id (e.g. BEL → GROUP_G). */
const teamToGroup = new Map<string, string>();
for (const [groupId, codes] of Object.entries(OFFICIAL_WC2026_GROUPS)) {
  for (const code of codes) {
    teamToGroup.set(code, groupId);
  }
}

export function officialGroupIds(): string[] {
  const known = GROUP_ORDER.filter((id) => OFFICIAL_WC2026_GROUPS[id]?.length);
  const extra = Object.keys(OFFICIAL_WC2026_GROUPS)
    .filter((id) => !known.includes(id))
    .sort();
  return [...known, ...extra];
}

export function officialGroupTeamCodes(groupId: string): string[] {
  return OFFICIAL_WC2026_GROUPS[groupId] ?? [];
}

export function officialGroupForTeam(code: string): string | undefined {
  return teamToGroup.get(code);
}

export function isOfficialGroupPair(
  groupId: string,
  homeCode: string,
  awayCode: string
): boolean {
  const codes = new Set(officialGroupTeamCodes(groupId));
  return codes.has(homeCode) && codes.has(awayCode);
}

/** Keep group-stage matches that belong to the official draw roster. */
export function filterOfficialGroupMatches(matches: MatchInfo[]): MatchInfo[] {
  return matches.filter((match) => {
    if (match.stage !== "GROUP" || !match.group) return true;

    const roster = new Set(officialGroupTeamCodes(match.group));
    if (!roster.has(match.homeTeam.code) || !roster.has(match.awayTeam.code)) {
      return false;
    }

    const homeGroup = officialGroupForTeam(match.homeTeam.code);
    const awayGroup = officialGroupForTeam(match.awayTeam.code);
    return homeGroup === match.group && awayGroup === match.group;
  });
}
