import type { F1SeasonPhase } from "@/lib/f1-types";

export interface F1GuideSection {
  title: string;
  body: string;
}

const FULL_GUIDE: F1GuideSection[] = [
  {
    title: "Who's racing",
    body:
      "Twenty drivers across ten teams compete every weekend. Each team builds its own car and picks two drivers — teamwork and strategy matter as much as raw speed.",
  },
  {
    title: "Race weekend",
    body:
      "Friday and Saturday are practice and qualifying. Qualifying sets the starting grid for Sunday's race. On sprint weekends, there's also a shorter sprint race on Saturday.",
  },
  {
    title: "Points",
    body:
      "The top ten finishers score points: 25 for a win, down to 1 point for tenth. There are two championships — Drivers (individual) and Constructors (teams).",
  },
  {
    title: "Quick glossary",
    body:
      "DNF means a driver Did Not Finish. A Safety Car slows the field after a crash. DRS is a speed boost on straights to help overtaking.",
  },
];

const PHASE_INTROS: Record<F1SeasonPhase, string> = {
  PRE: "The new Formula 1 season is about to begin — 22 Grands Prix around the world.",
  ACTIVE: "The championship is under way — every race weekend reshuffles the standings.",
  RACE_WEEKEND: "It's race week — practice, qualifying, and the Grand Prix are coming up.",
  COMPLETE: "The season is over — the champions have been crowned.",
};

export function getF1Guide(phase: F1SeasonPhase): {
  intro: string;
  sections: F1GuideSection[];
} {
  return {
    intro: PHASE_INTROS[phase],
    sections: FULL_GUIDE,
  };
}
