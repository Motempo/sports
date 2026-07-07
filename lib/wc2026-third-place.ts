import annexC from "@/data/wc2026-annex-c.json";
import type { GroupStandings } from "@/lib/group-standings";
import { computeThirdPlaceTracker } from "@/lib/group-standings";
import type { MatchInfo } from "@/lib/types";

const { winners: ANNEX_C_WINNERS, rows: ANNEX_C_ROWS, index: ANNEX_C_INDEX } = annexC as {
  winners: string[];
  rows: string[];
  index: Record<string, number>;
};

/** Group winners that face a third-placed team in the Round of 32 (FIFA Annex C columns). */
export const THIRD_PLACE_WINNER_GROUPS = ANNEX_C_WINNERS;

function allGroupsComplete(groupMatches: MatchInfo[]): boolean {
  for (let i = 0; i < 12; i++) {
    const groupId = `GROUP_${String.fromCharCode(65 + i)}`;
    const games = groupMatches.filter((m) => m.group === groupId);
    if (games.length < 6 || !games.every((m) => m.status === "FINISHED")) {
      return false;
    }
  }
  return true;
}

/**
 * Given the 8 groups whose third-placed teams advance, return which group's third
 * place fills the slot opposite winner group `winnerGroup` (per FIFA Annex C).
 */
export function annexCThirdPlaceGroup(
  advancingGroupLetters: string[],
  winnerGroup: string
): string | null {
  if (advancingGroupLetters.length !== 8) return null;

  const key = [...advancingGroupLetters].sort().join("");
  const rowIndex = ANNEX_C_INDEX[key];
  if (rowIndex === undefined) return null;

  const colIndex = ANNEX_C_WINNERS.indexOf(winnerGroup);
  if (colIndex === -1) return null;

  return ANNEX_C_ROWS[rowIndex]![colIndex] ?? null;
}

/** Third-placed team for the R32 slot opposite `winnerGroupLetter`, when group stage is final. */
export function thirdPlaceTeamForWinnerSlot(
  winnerGroupLetter: string,
  standings: GroupStandings[],
  groupMatches: MatchInfo[]
): MatchInfo["homeTeam"] | null {
  if (!allGroupsComplete(groupMatches)) return null;

  const { rows } = computeThirdPlaceTracker(standings);
  const advancing = rows.filter((r) => r.advances).map((r) => r.groupId.replace("GROUP_", ""));

  if (advancing.length !== 8) return null;

  const thirdGroupLetter = annexCThirdPlaceGroup(advancing, winnerGroupLetter);
  if (!thirdGroupLetter) return null;

  const group = standings.find((g) => g.groupId === `GROUP_${thirdGroupLetter}`);
  const third = group?.rows.find((r) => r.position === 3);
  return third?.team ?? null;
}
