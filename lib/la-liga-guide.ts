import type { LaLigaPhase } from "@/lib/la-liga-types";

export interface LaLigaGuideSection {
  title: string;
  body: string;
}

export interface LaLigaGuide {
  intro: string;
  sections: LaLigaGuideSection[];
}

const BASE_SECTIONS: LaLigaGuideSection[] = [
  {
    title: "Points",
    body: "Win = 3 points, draw = 1, loss = 0. After 38 matchdays, the club with the most points is champion.",
  },
  {
    title: "Tiebreakers",
    body: "If clubs finish level on points, goal difference separates them, then goals scored.",
  },
  {
    title: "Europe",
    body: "Places 1–4 usually enter the Champions League. 5th often goes to the Europa League and 6th toward the Conference League — Copa del Rey winners can nudge those slots.",
  },
  {
    title: "Relegation",
    body: "The bottom three are relegated to the Segunda División. Three clubs come up the other way each summer.",
  },
];

export function getLaLigaGuide(phase: LaLigaPhase): LaLigaGuide {
  switch (phase) {
    case "PRE":
      return {
        intro:
          "Twenty clubs, 38 matchdays, one table. La Liga runs from August to May with every team playing home and away.",
        sections: BASE_SECTIONS,
      };
    case "EARLY":
      return {
        intro:
          "The opening stretch sets early trends — form can swing fast, but Europe and relegation races rarely settle before autumn.",
        sections: BASE_SECTIONS,
      };
    case "MID":
      return {
        intro:
          "Mid-season is when the single table starts to tell a clearer story: title contenders separate, mid-table solidifies, and the drop zone gets real.",
        sections: BASE_SECTIONS,
      };
    case "RUN_IN":
      return {
        intro:
          "From spring onward every point is magnified. Title maths, European spots, and survival fights often go to the final weekends.",
        sections: BASE_SECTIONS,
      };
    case "COMPLETE":
      return {
        intro:
          "The final table is locked. Champions, European qualifiers, and the three relegated clubs are decided from one season-long league — not a knockout bracket.",
        sections: BASE_SECTIONS,
      };
  }
}
