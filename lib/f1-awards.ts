import {
  maxConstructorPointsRemaining,
  maxDriverPointsRemaining,
  shareChances,
  titleChances,
} from "@/lib/f1-award-chances";
import { capForecast } from "@/lib/match-forecast";
import type {
  F1ConstructorStandingRow,
  F1GrandPrix,
  F1SeasonData,
  F1StandingRow,
} from "@/lib/f1-types";

export {
  maxConstructorPointsRemaining,
  maxDriverPointsRemaining,
  normalizeChances,
  shareChances,
  titleChances,
  F1_CONSTRUCTOR_RACE_POINTS,
  F1_CONSTRUCTOR_SPRINT_POINTS,
  F1_DRIVER_RACE_POINTS,
  F1_DRIVER_SPRINT_POINTS,
} from "@/lib/f1-award-chances";

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

function buildContenders(
  entries: Array<{
    label: string;
    constructorId: string;
    constructorName: string;
    stat: number;
    statLabel: string;
  }>,
  chances: number[]
): F1AwardContender[] {
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
      `${a.label} (${a.constructorName}) leads the Drivers' Championship on ${a.stat} ${a.statLabel} — about a ${a.winChance}% title chance with the races still to run. With ${progress}% of races complete, late-season form still matters.`,
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} leads on ${a.stat} ${a.statLabel} (${a.winChance}% title chance), with ${b.label} (${b.constructorName}) on ${b.stat} at ${b.winChance}%. Drivers who can no longer catch the leader even by winning out show 0%. ${progress}% of the season is in the books.`,
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
    `${a.label} tops the constructors' table with ${a.stat} ${a.statLabel} (~${a.winChance}% title chance). ${b ? `${b.label} is next on ${b.stat} (${b.winChance}%). ` : ""}Teams mathematically eliminated from the lead show 0%. ${progress}% of the season complete.`,
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
    `${a.label} leads the wins chart with ${a.stat} ${a.statLabel} (~${a.winChance}% share). ${b && b.stat > 0 ? `${b.label} is next on ${b.stat} (${b.winChance}%). ` : ""}Percentages are a straight share of wins among the leaders shown — 0 wins means 0%. ${progress}% raced.`,
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
    `${a.label} has the most race wins this season (${a.stat}) with about a ${a.winChance}% share. ${b && b.stat > 0 ? `${b.label} sits on ${b.stat} (${b.winChance}%). ` : ""}Share of wins among the teams shown — blanks stay at 0%. ${progress}% of Grands Prix are done.`,
    F1_AWARD_COMMENTARY_MAX_CHARS
  );
}

function driversChampionship(
  drivers: F1StandingRow[],
  seasonPct: number,
  maxPointsLeft: number
): F1Award {
  const entries = drivers.slice(0, 5).map((d) => ({
    label: d.driverName,
    constructorId: d.constructorId,
    constructorName: d.constructorName,
    stat: d.points,
    statLabel: d.points === 1 ? "pt" : "pts",
  }));
  const contenders = buildContenders(
    entries,
    titleChances(
      entries.map((e) => e.stat),
      maxPointsLeft
    )
  );
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
  seasonPct: number,
  maxPointsLeft: number
): F1Award {
  const entries = constructors.slice(0, 5).map((c) => ({
    label: c.constructorName,
    constructorId: c.constructorId,
    constructorName: c.constructorName,
    stat: c.points,
    statLabel: c.points === 1 ? "pt" : "pts",
  }));
  const contenders = buildContenders(
    entries,
    titleChances(
      entries.map((e) => e.stat),
      maxPointsLeft
    )
  );
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
  const contenders = buildContenders(
    entries,
    shareChances(entries.map((e) => e.stat))
  );
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
  const contenders = buildContenders(
    entries,
    shareChances(entries.map((e) => e.stat))
  );
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

function titleLeadCommentary(contenders: F1AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a) {
    return capForecast(
      "The championship lead opens once two drivers are on the board. A big cushion buys recovery Sundays; a tiny one turns every pit stop into title maths.",
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  if (!b || a.stat === 0) {
    return capForecast(
      `${a.label} sits alone at the top so far — the lead chart fills once a real chase forms. ${progress}% of the season is done.`,
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} leads ${b.label} by ${a.stat} ${a.statLabel} with about a ${a.winChance}% title chance from the remaining calendar. ${a.stat <= 25 ? "One weekend can wipe that out." : "Chasers who cannot catch up even by winning out sit on 0%."} ${progress}% raced.`,
    F1_AWARD_COMMENTARY_MAX_CHARS
  );
}

function pointsPerRaceCommentary(contenders: F1AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a || a.stat === 0) {
    return capForecast(
      "Points per race measures scoring rate, not just the raw total — the driver who banks the most each Sunday usually owns the title narrative.",
      F1_AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} averages ${a.stat} ${a.statLabel} (~${a.winChance}% share of the rate chart). ${b && b.stat > 0 ? `${b.label} is next on ${b.stat} (${b.winChance}%). ` : ""}A win is 25 — sustained high twenties is title pace. ${progress}% of the calendar is in.`,
    F1_AWARD_COMMENTARY_MAX_CHARS
  );
}

/** Points cushion from P1 to each chasing driver — who owns the lead maths. */
function titleLeadAward(
  drivers: F1StandingRow[],
  seasonPct: number,
  maxPointsLeft: number
): F1Award {
  const leader = drivers[0];
  const top = drivers.slice(0, 5);
  const entries = top.map((d, i) => {
    const gap = leader ? Math.max(0, Math.round((leader.points - d.points) * 10) / 10) : 0;
    const isLeader = i === 0;
    const leadOverP2 =
      isLeader && drivers[1]
        ? Math.max(0, Math.round((leader.points - drivers[1].points) * 10) / 10)
        : gap;
    return {
      label: d.driverName,
      constructorId: d.constructorId,
      constructorName: d.constructorName,
      stat: isLeader ? leadOverP2 : gap,
      statLabel: isLeader
        ? leadOverP2 === 1
          ? "pt lead"
          : "pts lead"
        : "pts back",
      points: d.points,
    };
  });
  // Same remaining-season title chances as the Drivers' Championship card (MOT-87).
  const chances = titleChances(
    entries.map((e) => e.points),
    maxPointsLeft
  );
  const contenders = buildContenders(
    entries.map(({ label, constructorId, constructorName, stat, statLabel }) => ({
      label,
      constructorId,
      constructorName,
      stat,
      statLabel,
    })),
    chances
  );
  return {
    id: "title-lead",
    name: "Championship Lead",
    sponsor: "FIA",
    emoji: "📏",
    description:
      "The points gap from the leader to the chase — how much breathing room the title favourite has.",
    progress: seasonPct,
    contenders,
    commentary: titleLeadCommentary(contenders, seasonPct),
  };
}

function pointsPerRaceAward(
  drivers: F1StandingRow[],
  racesDone: number,
  seasonPct: number
): F1Award {
  const completed = Math.max(racesDone, 1);
  const sorted = [...drivers].sort((a, b) => b.points - a.points);
  const entries = sorted.slice(0, 5).map((d) => {
    const avg = Math.round((d.points / completed) * 10) / 10;
    return {
      label: d.driverName,
      constructorId: d.constructorId,
      constructorName: d.constructorName,
      stat: avg,
      statLabel: "pts/race",
    };
  });
  const contenders = buildContenders(
    entries,
    shareChances(entries.map((e) => e.stat))
  );
  return {
    id: "points-per-race",
    name: "Points Per Race",
    sponsor: "FIA",
    emoji: "⚡",
    description:
      "Average points scored each Grand Prix weekend — the scoring rate behind the championship table.",
    progress: seasonPct,
    contenders,
    commentary: pointsPerRaceCommentary(contenders, seasonPct),
  };
}

export function buildF1Awards(data: F1SeasonData): F1Award[] {
  const seasonPct = seasonProgress(data.calendar);
  const racesDone = data.calendar.filter((gp) => gp.status === "completed").length;
  const driverRemain = maxDriverPointsRemaining(data.calendar);
  const constructorRemain = maxConstructorPointsRemaining(data.calendar);
  const awards: F1Award[] = [];

  if (data.driverStandings.length > 0) {
    awards.push(driversChampionship(data.driverStandings, seasonPct, driverRemain));
    awards.push(raceWinsAward(data.driverStandings, seasonPct));
    awards.push(titleLeadAward(data.driverStandings, seasonPct, driverRemain));
    awards.push(pointsPerRaceAward(data.driverStandings, racesDone, seasonPct));
  }
  if (data.constructorStandings.length > 0) {
    awards.push(
      constructorsChampionship(data.constructorStandings, seasonPct, constructorRemain)
    );
    awards.push(constructorWinsAward(data.constructorStandings, seasonPct));
  }

  return awards;
}
