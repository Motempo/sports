import { capForecast } from "@/lib/match-forecast";
import type {
  F1ConstructorStandingRow,
  F1GrandPrix,
  F1SeasonData,
  F1StandingRow,
} from "@/lib/f1-types";

export const F1_AWARD_COMMENTARY_MAX_CHARS = 300;

export interface F1AwardContender {
  rank: number;
  label: string;
  constructorId: string;
  constructorName: string;
  stat: number;
  statLabel: string;
  winChance: number;
}

export interface F1Award {
  id: string;
  name: string;
  sponsor: string;
  emoji: string;
  description: string;
  progress: number;
  contenders: F1AwardContender[];
  commentary: string;
}

function seasonProgress(calendar: F1GrandPrix[]): number {
  if (calendar.length === 0) return 0;
  const done = calendar.filter((gp) => gp.status === "completed").length;
  return Math.min(100, Math.round((done / calendar.length) * 100));
}

function winChances(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values, 1);
  const weights = values.map((v) => Math.exp((v / max) * 2.4));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => Math.round((w / total) * 100));
}

function buildContenders(
  entries: Array<{
    label: string;
    constructorId: string;
    constructorName: string;
    stat: number;
    statLabel: string;
  }>
): F1AwardContender[] {
  const chances = winChances(entries.map((e) => e.stat));
  return entries.map((entry, i) => ({
    rank: i + 1,
    label: entry.label,
    constructorId: entry.constructorId,
    constructorName: entry.constructorName,
    stat: entry.stat,
    statLabel: entry.statLabel,
    winChance: chances[i] ?? 0,
  }));
}

function driversCommentary(contenders: F1AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a) {
    return capForecast(
      "The Drivers' Championship is just getting started — every Grand Prix reshuffles the order. Consistency across a long calendar usually beats a short purple patch.",
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  if (!b || a.stat === b.stat) {
    return capForecast(
      `${a.label} (${a.constructorName}) leads the Drivers' Championship on ${a.stat} ${a.statLabel} — roughly a ${a.winChance}% chance if the season ended today. With ${progress}% of races complete, late-season form still matters.`,
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} leads on ${a.stat} ${a.statLabel} (${a.winChance}% chance), with ${b.label} (${b.constructorName}) on ${b.stat} chasing at ${b.winChance}%. A win is worth 25 points — one weekend can swing the title fight. ${progress}% of the season is in the books.`,
    F1_AWARD_COMMENTARY_MAX_CHARS
  );
}

function constructorsCommentary(contenders: F1AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a) {
    return capForecast(
      "The Constructors' Championship rewards both cars every weekend. Teams that score with two drivers week after week usually pull away over a long season.",
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} tops the constructors' table with ${a.stat} ${a.statLabel} (~${a.winChance}% chance). ${b ? `${b.label} is next on ${b.stat} (${b.winChance}%). ` : ""}Double points finishes and reliability decide this trophy. ${progress}% of the season complete.`,
    F1_AWARD_COMMENTARY_MAX_CHARS
  );
}

function winsCommentary(contenders: F1AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a || a.stat === 0) {
    return capForecast(
      "Race wins are the highlight-reel currency of Formula 1 — the driver who collects the most chequered flags often frames the championship narrative.",
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} leads the wins chart with ${a.stat} ${a.statLabel} (~${a.winChance}%). ${b && b.stat > 0 ? `${b.label} is next on ${b.stat} (${b.winChance}%). ` : ""}Sunday victories don't always equal the title — but they define seasons. ${progress}% raced.`,
    F1_AWARD_COMMENTARY_MAX_CHARS
  );
}

function constructorWinsCommentary(contenders: F1AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a || a.stat === 0) {
    return capForecast(
      "Constructor race wins count every time either car takes the chequered flag. Dominant teams stack Sundays; midfield teams fight for the odd breakthrough.",
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} has the most race wins this season (${a.stat}) with about a ${a.winChance}% share of the wins race. ${b && b.stat > 0 ? `${b.label} sits on ${b.stat} (${b.winChance}%). ` : ""}${progress}% of Grands Prix are done.`,
    F1_AWARD_COMMENTARY_MAX_CHARS
  );
}

function driversChampionship(drivers: F1StandingRow[], seasonPct: number): F1Award {
  const entries = drivers.slice(0, 5).map((d) => ({
    label: d.driverName,
    constructorId: d.constructorId,
    constructorName: d.constructorName,
    stat: d.points,
    statLabel: d.points === 1 ? "pt" : "pts",
  }));
  const contenders = buildContenders(entries);
  return {
    id: "drivers-championship",
    name: "Drivers' Championship",
    sponsor: "FIA",
    emoji: "🏆",
    description:
      "Awarded to the driver with the most points across the season. A win is 25 points; consistency across every Grand Prix decides the title.",
    // Progress bar is season completion, not title-gap tightness (MOT-47).
    progress: seasonPct,
    contenders,
    commentary: driversCommentary(contenders, seasonPct),
  };
}

function constructorsChampionship(
  constructors: F1ConstructorStandingRow[],
  seasonPct: number
): F1Award {
  const entries = constructors.slice(0, 5).map((c) => ({
    label: c.constructorName,
    constructorId: c.constructorId,
    constructorName: c.constructorName,
    stat: c.points,
    statLabel: c.points === 1 ? "pt" : "pts",
  }));
  const contenders = buildContenders(entries);
  return {
    id: "constructors-championship",
    name: "Constructors' Championship",
    sponsor: "FIA",
    emoji: "🏁",
    description:
      "Awarded to the team with the most combined points from both cars. Reliability and double-points finishes win this one.",
    progress: seasonPct,
    contenders,
    commentary: constructorsCommentary(contenders, seasonPct),
  };
}

function raceWinsAward(drivers: F1StandingRow[], seasonPct: number): F1Award {
  const sorted = [...drivers].sort((a, b) => b.wins - a.wins || b.points - a.points);
  const entries = sorted.slice(0, 5).map((d) => ({
    label: d.driverName,
    constructorId: d.constructorId,
    constructorName: d.constructorName,
    stat: d.wins,
    statLabel: d.wins === 1 ? "win" : "wins",
  }));
  const contenders = buildContenders(entries);
  return {
    id: "race-wins",
    name: "Race Wins",
    sponsor: "FIA",
    emoji: "🥇",
    description:
      "The driver who takes the most Grand Prix victories this season — the chequered-flag leaderboard.",
    progress: seasonPct,
    contenders,
    commentary: winsCommentary(contenders, seasonPct),
  };
}

function constructorWinsAward(
  constructors: F1ConstructorStandingRow[],
  seasonPct: number
): F1Award {
  const sorted = [...constructors].sort((a, b) => b.wins - a.wins || b.points - a.points);
  const entries = sorted.slice(0, 5).map((c) => ({
    label: c.constructorName,
    constructorId: c.constructorId,
    constructorName: c.constructorName,
    stat: c.wins,
    statLabel: c.wins === 1 ? "win" : "wins",
  }));
  const contenders = buildContenders(entries);
  return {
    id: "constructor-wins",
    name: "Team Race Wins",
    sponsor: "FIA",
    emoji: "🏎️",
    description:
      "Most Grand Prix wins by a constructor this season — either car counting when it takes the flag.",
    progress: seasonPct,
    contenders,
    commentary: constructorWinsCommentary(contenders, seasonPct),
  };
}

export function buildF1Awards(data: F1SeasonData): F1Award[] {
  const seasonPct = seasonProgress(data.calendar);
  const awards: F1Award[] = [];

  if (data.driverStandings.length > 0) {
    awards.push(driversChampionship(data.driverStandings, seasonPct));
    awards.push(raceWinsAward(data.driverStandings, seasonPct));
  }
  if (data.constructorStandings.length > 0) {
    awards.push(constructorsChampionship(data.constructorStandings, seasonPct));
    awards.push(constructorWinsAward(data.constructorStandings, seasonPct));
  }

  return awards;
}
