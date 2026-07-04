import type { BracketRound } from "@/lib/types";

export const ROUND_ORDER: BracketRound[] = ["R32", "R16", "QF", "SF", "FINAL"];

const ROUND_LABELS: Record<BracketRound, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  FINAL: "Final",
  THIRD: "Third place",
};

export function getRoundLabel(round: BracketRound): string {
  return ROUND_LABELS[round];
}

const ROUND_SHORT_LABELS: Record<BracketRound, string> = {
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  FINAL: "Final",
  THIRD: "3rd",
};

export function getRoundShortLabel(round: BracketRound): string {
  return ROUND_SHORT_LABELS[round];
}

/** Opening view for the bracket — Round of 16 when that round has fixtures. */
export function getDefaultBracketRound(
  grouped: Record<BracketRound, unknown[]>
): BracketRound {
  const available = ROUND_ORDER.filter((round) => grouped[round].length > 0);
  if (available.includes("R16")) return "R16";
  return available[0] ?? "R32";
}
