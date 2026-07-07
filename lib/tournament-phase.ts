import type { BracketRound, MatchInfo } from "@/lib/types";
import { isMatchLive } from "@/lib/match-status";

export type TournamentPhase =
  | "PRE"
  | "GROUP"
  | "GROUP_FINAL"
  | "KNOCKOUT"
  | "FINAL"
  | "COMPLETE";

export type RailStep = "GROUP" | "R32" | "R16" | "QF" | "SF" | "FINAL";

export const TOURNAMENT_START = new Date("2026-06-11T00:00:00Z");
export const GROUP_STAGE_END = new Date("2026-06-27T23:59:59Z");
export const FINAL_DATE = new Date("2026-07-19T23:59:59Z");

const RAIL_STEPS: { id: RailStep; label: string; shortLabel: string }[] = [
  { id: "GROUP", label: "Group stage", shortLabel: "Groups" },
  { id: "R32", label: "Round of 32", shortLabel: "R32" },
  { id: "R16", label: "Round of 16", shortLabel: "R16" },
  { id: "QF", label: "Quarter-finals", shortLabel: "QF" },
  { id: "SF", label: "Semi-finals", shortLabel: "SF" },
  { id: "FINAL", label: "Final", shortLabel: "Final" },
];

export function getRailSteps() {
  return RAIL_STEPS;
}

function hasKnockoutActivity(matches: MatchInfo[]): boolean {
  return matches.some(
    (m) =>
      m.stage !== "GROUP" &&
      (isMatchLive(m.status) || m.status === "FINISHED")
  );
}

function activeKnockoutRound(matches: MatchInfo[]): BracketRound | null {
  const order: BracketRound[] = ["FINAL", "SF", "QF", "R16", "R32"];
  for (const round of order) {
    const roundMatches = matches.filter((m) => m.stage === round);
    if (roundMatches.some((m) => m.status !== "SCHEDULED")) return round;
  }
  return null;
}

export function detectTournamentPhase(
  knockoutMatches: MatchInfo[],
  groupMatches: MatchInfo[],
  now = new Date()
): TournamentPhase {
  if (now > FINAL_DATE) return "COMPLETE";
  if (now < TOURNAMENT_START) return "PRE";

  const knockoutActive = hasKnockoutActivity(knockoutMatches);
  if (knockoutActive || now > GROUP_STAGE_END) return "KNOCKOUT";

  const groupFinished = groupMatches.filter((m) => m.status === "FINISHED").length;
  const groupTotal = groupMatches.length;
  if (groupTotal > 0 && groupFinished >= groupTotal * 0.9) return "GROUP_FINAL";

  return "GROUP";
}

export function getActiveRailStep(
  phase: TournamentPhase,
  knockoutMatches: MatchInfo[]
): RailStep {
  if (phase === "PRE" || phase === "GROUP" || phase === "GROUP_FINAL") return "GROUP";
  if (phase === "FINAL" || phase === "COMPLETE") return "FINAL";

  const round = activeKnockoutRound(knockoutMatches);
  if (round === "FINAL") return "FINAL";
  if (round === "SF") return "SF";
  if (round === "QF") return "QF";
  if (round === "R16") return "R16";
  return "R32";
}

export function getPhaseSubtitle(phase: TournamentPhase): string {
  switch (phase) {
    case "PRE":
      return "48 teams · 12 groups · Tournament starts June 11";
    case "GROUP":
      return "Top 2 per group advance, plus the 8 best third-place teams (32 total)";
    case "GROUP_FINAL":
      return "Final group games — the Round of 32 bracket locks in when all groups finish";
    case "KNOCKOUT":
      return "Knockout stage — win or go home. Tied after 90 min → extra time → penalties";
    case "FINAL":
      return "The final — one game decides the champion";
    case "COMPLETE":
      return "Tournament complete";
  }
}

export function getWhatsNextLine(phase: TournamentPhase): string | null {
  switch (phase) {
    case "PRE":
      return "Next: group stage — each team plays 3 matches. Check standings to see who advances.";
    case "GROUP":
      return "Next: Round of 32 — 32 teams enter single-elimination knockouts (new in 2026).";
    case "GROUP_FINAL":
      return "Next: Round of 32 pairings are set once all 72 group games finish.";
    case "KNOCKOUT":
      return "Next: winners advance one round at a time until the final on July 19.";
    default:
      return null;
  }
}

export function showGroupStandingsPrimary(phase: TournamentPhase): boolean {
  return phase === "PRE" || phase === "GROUP" || phase === "GROUP_FINAL";
}
