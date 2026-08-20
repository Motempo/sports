import type { MatchInfo } from "@/lib/types";
import type { LaLigaPhase, LaLigaRailStep } from "@/lib/la-liga-types";

const TOTAL_MATCHDAYS = 38;

function finishedMatchdays(matches: MatchInfo[]): number {
  const finished = matches.filter((m) => m.status === "FINISHED");
  if (finished.length === 0) return 0;

  let maxMd = 0;
  for (const match of finished) {
    const md = Number(match.group?.match(/(\d+)/)?.[1] ?? 0);
    if (md > maxMd) maxMd = md;
  }
  if (maxMd > 0) return Math.min(TOTAL_MATCHDAYS, maxMd);

  return Math.min(TOTAL_MATCHDAYS, Math.ceil(finished.length / 10));
}

export function detectLaLigaPhase(matches: MatchInfo[], now = new Date()): LaLigaPhase {
  if (matches.length === 0) return "PRE";

  const sorted = [...matches].sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const firstKick = new Date(first.utcDate);
  const lastKick = new Date(last.utcDate);

  if (now < firstKick) return "PRE";

  // Past the calendar's last kickoff — treat the season as complete even if a
  // few feed rows are missing scores (openfootball sometimes leaves `score: []`).
  const lastKickMs = lastKick.getTime();
  if (!Number.isNaN(lastKickMs) && now.getTime() > lastKickMs + 3 * 60 * 60 * 1000) {
    return "COMPLETE";
  }

  const allFinished = matches.every(
    (m) => m.status === "FINISHED" || m.status === "CANCELLED" || m.status === "POSTPONED"
  );
  if (allFinished && now > lastKick) return "COMPLETE";

  const md = finishedMatchdays(matches);
  if (md <= 10) return "EARLY";
  if (md <= 28) return "MID";
  return "RUN_IN";
}

export function showLaLigaStandingsPrimary(phase: LaLigaPhase): boolean {
  return phase === "EARLY" || phase === "MID" || phase === "RUN_IN" || phase === "COMPLETE";
}

export function getLaLigaWhatsNext(phase: LaLigaPhase, matchday: number): string {
  switch (phase) {
    case "PRE":
      return "Kickoff is around the corner — 20 clubs, 38 matchdays, one Spanish title.";
    case "EARLY":
      return `Matchday ${Math.min(TOTAL_MATCHDAYS, matchday + 1)} is next — early form reshapes Europe and relegation maths.`;
    case "MID":
      return `Through Matchday ${matchday} — the table is settling but mid-table clubs can still climb into Europe.`;
    case "RUN_IN":
      return `Run-in time · Matchday ${matchday}/${TOTAL_MATCHDAYS} — title, Europe, and survival races go to the wire.`;
    case "COMPLETE":
      return "Season complete — champions crowned, Europe places filled, three clubs relegated to Segunda.";
  }
}

export function buildLaLigaRailSteps(): LaLigaRailStep[] {
  return [
    { id: "PRE", label: "Pre-season", shortLabel: "Pre" },
    { id: "EARLY", label: "Opening matches", shortLabel: "Start" },
    { id: "MID", label: "Mid-season", shortLabel: "Mid" },
    { id: "RUN_IN", label: "Run-in", shortLabel: "Run-in" },
    { id: "COMPLETE", label: "Champions", shortLabel: "🏆" },
  ];
}

export function getActiveLaLigaRailStep(phase: LaLigaPhase): string {
  return phase;
}
