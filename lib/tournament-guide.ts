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

export interface GroupStageStatus {
  heading: string;
  paragraphs: string[];
}

export function getGroupStageStatus(phase: TournamentPhase): GroupStageStatus | null {
  switch (phase) {
    case "PRE":
      return {
        heading: "Before the group stage",
        paragraphs: [
          "Each group has four teams. Every team plays the other three once — three matches per team, 72 group games in all.",
          "Results earn points: 3 for a win, 1 for a draw, 0 for a loss. The standings above will fill in as matches kick off.",
          "When the group stage ends, the top two in each group advance (24 teams), plus the eight best third-place teams (32 total). Those 32 move into the Round of 32 knockouts.",
        ],
      };
    case "GROUP":
      return {
        heading: "How the group stage works",
        paragraphs: [
          "Each group is playing three round-robin matches. Every result above shuffles the table — wins climb, losses drop.",
          "Teams are ranked by points (win 3, draw 1, loss 0). Ties on points are broken by goal difference, then goals scored, then fair-play points.",
          "The top two in every group go through automatically. The eight best third-place teams — highlighted in the pills above — also advance. Four third-place teams go home.",
          "Next: the Round of 32. Thirty-two teams enter single-elimination knockouts — lose once and your tournament is over.",
        ],
      };
    case "GROUP_FINAL":
      return {
        heading: "Group stage finale",
        paragraphs: [
          "The last group games are happening now. A win or draw can still lift a team into the top two; third place can clinch one of the eight wild-card spots.",
          "Once all 72 matches are final, the Round of 32 bracket locks in. Third-place teams are ranked against each other on points, goal difference, and goals scored.",
          "Next: single-elimination knockouts begin. Thirty-two teams, one loss and you're out.",
        ],
      };
    default:
      return null;
  }
}
