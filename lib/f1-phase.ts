import type { F1GrandPrix, F1RailStep, F1SeasonPhase } from "@/lib/f1-types";

const RACE_WEEKEND_MS = 4 * 24 * 60 * 60 * 1000;

function parseUtc(date: string, time?: string): Date {
  if (time) return new Date(`${date}T${time}`);
  return new Date(`${date}T12:00:00Z`);
}

function weekendStart(gp: F1GrandPrix): Date {
  const raceDate = new Date(gp.utcDate);
  return new Date(raceDate.getTime() - RACE_WEEKEND_MS);
}

function weekendEnd(gp: F1GrandPrix): Date {
  const raceDate = new Date(gp.utcDate);
  return new Date(raceDate.getTime() + 24 * 60 * 60 * 1000);
}

export function detectSeasonPhase(calendar: F1GrandPrix[], now = new Date()): F1SeasonPhase {
  if (calendar.length === 0) return "PRE";

  const sorted = [...calendar].sort((a, b) => a.round - b.round);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  if (now < weekendStart(first)) return "PRE";
  if (last.status === "completed" && now > weekendEnd(last)) return "COMPLETE";

  for (const gp of sorted) {
    if (gp.status === "cancelled") continue;
    const start = weekendStart(gp);
    const end = weekendEnd(gp);
    if (now >= start && now <= end) return "RACE_WEEKEND";
  }

  return "ACTIVE";
}

export function getCurrentOrNextGrandPrix(
  calendar: F1GrandPrix[],
  now = new Date()
): F1GrandPrix | null {
  const sorted = [...calendar]
    .filter((gp) => gp.status !== "cancelled")
    .sort((a, b) => a.round - b.round);

  for (const gp of sorted) {
    if (gp.status === "upcoming" || gp.status === "current") {
      const start = weekendStart(gp);
      const end = weekendEnd(gp);
      if (now <= end) return gp;
    }
  }

  return sorted.find((gp) => gp.status === "upcoming") ?? sorted[sorted.length - 1] ?? null;
}

export function getActiveGrandPrix(
  calendar: F1GrandPrix[],
  now = new Date()
): F1GrandPrix | null {
  const sorted = [...calendar]
    .filter((gp) => gp.status !== "cancelled")
    .sort((a, b) => a.round - b.round);

  for (const gp of sorted) {
    const start = weekendStart(gp);
    const end = weekendEnd(gp);
    if (now >= start && now <= end) return gp;
  }

  return null;
}

export function buildSeasonRailSteps(calendar: F1GrandPrix[]): F1RailStep[] {
  const steps: F1RailStep[] = [
    { id: "PRE", label: "Pre-season", shortLabel: "Pre" },
  ];

  for (const gp of calendar.filter((g) => g.status !== "cancelled")) {
    steps.push({
      id: `R${gp.round}`,
      label: gp.name.replace(" Grand Prix", " GP"),
      shortLabel: `R${gp.round}`,
      round: gp.round,
    });
  }

  steps.push({ id: "CHAMPION", label: "Champion", shortLabel: "🏆" });
  return steps;
}

export function getActiveRailStep(
  calendar: F1GrandPrix[],
  phase: F1SeasonPhase,
  now = new Date()
): F1RailStep["id"] {
  if (phase === "PRE") return "PRE";
  if (phase === "COMPLETE") return "CHAMPION";

  const active = getActiveGrandPrix(calendar, now);
  if (active) return `R${active.round}`;

  const next = getCurrentOrNextGrandPrix(calendar, now);
  if (next) return `R${next.round}`;

  const lastCompleted = [...calendar]
    .filter((gp) => gp.status === "completed")
    .sort((a, b) => b.round - a.round)[0];

  if (lastCompleted) return `R${lastCompleted.round}`;
  return "PRE";
}

export function getWhatsNextLine(
  phase: F1SeasonPhase,
  nextGp: F1GrandPrix | null
): string | null {
  if (!nextGp) return null;

  switch (phase) {
    case "PRE":
      return `Next up: ${nextGp.name} at ${nextGp.circuit}.`;
    case "ACTIVE":
      return `Next race: ${nextGp.name} — ${formatGpDate(nextGp.date)}.`;
    case "RACE_WEEKEND":
      return `This weekend: ${nextGp.name} at ${nextGp.circuit}.`;
    case "COMPLETE":
      return null;
  }
}

export function showStandingsPrimary(phase: F1SeasonPhase): boolean {
  return phase === "RACE_WEEKEND" || phase === "COMPLETE";
}

function formatGpDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function countRacesRemaining(calendar: F1GrandPrix[]): number {
  return calendar.filter((gp) => gp.status === "upcoming" || gp.status === "current").length;
}

export { parseUtc, weekendStart, weekendEnd };
