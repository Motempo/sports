import type { F1SeasonPhase } from "@/lib/f1-types";

export interface F1GuideSection {
  title: string;
  body: string;
}

const FULL_GUIDE: F1GuideSection[] = [
  {
    title: "Who's racing",
    body:
      "Twenty-two drivers across eleven teams compete every weekend — Cadillac joined as the 11th constructor in 2026. Each team runs two cars; teamwork and strategy matter as much as raw speed.",
  },
  {
    title: "Race weekend",
    body:
      "A standard weekend has three practices, then qualifying (Q1–Q3) to set Sunday's grid, then the Grand Prix. On six sprint weekends there's only one practice: sprint qualifying and the sprint come first, then separate qualifying for Sunday's race.",
  },
  {
    title: "Points",
    body:
      "The top ten in the Grand Prix score 25–18–15–12–10–8–6–4–2–1. Sprint races award 8 down to 1 for the top eight. Points count toward both championships — Drivers (individual) and Constructors (teams).",
  },
  {
    title: "Quick glossary",
    body:
      "DNF means Did Not Finish. A Safety Car slows the field after an incident. DRS is gone in 2026 — Overtake Mode gives a chasing car extra electric boost when within one second, and active aero flattens the wings on straights.",
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
