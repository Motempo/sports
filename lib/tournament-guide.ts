import type { TournamentPhase } from "@/lib/tournament-phase";

export interface TournamentGuideSection {
  title: string;
  body: string;
}

const FULL_GUIDE: TournamentGuideSection[] = [
  {
    title: "Who's here",
    body:
      "Forty-eight national teams earned spots through years of regional qualifying across six continents. Hosts United States, Mexico, and Canada qualify automatically; everyone else had to win their way in.",
  },
  {
    title: "Group stage",
    body:
      "Teams are split into 12 groups of four. Each team plays three matches. Wins earn 3 points, draws 1, losses 0. When every group game is done, the top two in each group advance (24 teams), plus the eight best third-place teams — 32 move on.",
  },
  {
    title: "Knockouts",
    body:
      "From the Round of 32 onward it's win-or-go-home. The bracket narrows through the Round of 16, quarter-finals, and semi-finals to one final. Tied after 90 minutes? Teams play 30 minutes of extra time, then penalties if needed.",
  },
];

const PHASE_INTROS: Partial<Record<TournamentPhase, string>> = {
  PRE: "The 2026 World Cup starts June 11 across the USA, Mexico, and Canada.",
  GROUP: "We're in the group stage — every result shifts who survives and who goes home.",
  GROUP_FINAL:
    "Last group games are deciding who fills the Round of 32 bracket.",
  KNOCKOUT: "The knockout stage is under way — one loss ends a team's tournament.",
  FINAL: "One match left to crown the champion.",
  COMPLETE: "The tournament is over.",
};

export function getTournamentGuide(phase: TournamentPhase): {
  intro: string;
  sections: TournamentGuideSection[];
} {
  return {
    intro: PHASE_INTROS[phase] ?? PHASE_INTROS.GROUP!,
    sections: FULL_GUIDE,
  };
}
