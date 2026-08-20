export interface NextEventBrief {
  /** Short description of the session or match. */
  description: string;
  /** Form-book / paddock read — not betting odds, not invented quotes. */
  prediction: string;
  /** What the result means for the drivers or players involved. */
  impact: string;
}

export function nextEventParagraphs(brief: NextEventBrief): string[] {
  return [brief.description, brief.prediction, brief.impact]
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
