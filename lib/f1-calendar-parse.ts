import { inferSessionStatus } from "@/lib/f1-session-status";
import { normalizeCalendarRace } from "@/lib/f1-circuits";
import type { F1GrandPrix, F1SessionInfo, F1SessionType } from "@/lib/f1-types";

export interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string };
  };
  FirstPractice?: { date: string; time: string };
  SecondPractice?: { date: string; time: string };
  ThirdPractice?: { date: string; time: string };
  Qualifying?: { date: string; time: string };
  Sprint?: { date: string; time: string };
  SprintQualifying?: { date: string; time: string };
  Results?: Array<{
    position: string;
    Driver: { code: string; givenName: string; familyName: string };
    Constructor: { name: string };
    status: string;
  }>;
}

export function toUtcIso(date: string, time?: string): string {
  if (time) return `${date}T${time}`;
  return `${date}T12:00:00Z`;
}

export function parseGrandPrix(race: JolpicaRace, standingsRound: number, now = new Date()): F1GrandPrix {
  const round = parseInt(race.round, 10);
  const country = race.Circuit.Location.country;
  let status: F1GrandPrix["status"] = "upcoming";

  if (round < standingsRound) {
    status = "completed";
  } else if (round === standingsRound) {
    const raceTime = new Date(toUtcIso(race.date, race.time)).getTime();
    status = now.getTime() > raceTime + 3 * 60 * 60 * 1000 ? "completed" : "current";
  }

  const identity = normalizeCalendarRace({
    raceName: race.raceName,
    circuitId: race.Circuit.circuitId,
    circuitName: race.Circuit.circuitName,
    country,
  });

  const winner = race.Results?.[0];
  return {
    round,
    name: identity.name,
    circuit: identity.circuit,
    circuitId: identity.circuitId,
    country: identity.country,
    countryCode: identity.countryCode,
    date: race.date,
    utcDate: toUtcIso(race.date, race.time),
    status,
    isSprintWeekend: Boolean(race.Sprint),
    winner: winner ? `${winner.Driver.givenName} ${winner.Driver.familyName}` : undefined,
    winnerCode: winner?.Driver.code,
  };
}

const SESSION_DEFS: Array<{
  key: keyof JolpicaRace;
  sessionType: F1SessionType;
  label: string;
}> = [
  { key: "FirstPractice", sessionType: "practice", label: "Practice 1" },
  { key: "SecondPractice", sessionType: "practice", label: "Practice 2" },
  { key: "ThirdPractice", sessionType: "practice", label: "Practice 3" },
  { key: "SprintQualifying", sessionType: "sprint_qualifying", label: "Sprint Qualifying" },
  { key: "Qualifying", sessionType: "qualifying", label: "Qualifying" },
  { key: "Sprint", sessionType: "sprint", label: "Sprint" },
];

export function parseSessionsFromRace(race: JolpicaRace, now = new Date()): F1SessionInfo[] {
  const round = parseInt(race.round, 10);
  const identity = normalizeCalendarRace({
    raceName: race.raceName,
    circuitId: race.Circuit.circuitId,
    circuitName: race.Circuit.circuitName,
    country: race.Circuit.Location.country,
  });
  const isSprintWeekend = Boolean(race.Sprint);
  const sessions: F1SessionInfo[] = [];

  for (const def of SESSION_DEFS) {
    const block = race[def.key] as { date: string; time: string } | undefined;
    if (!block || typeof block !== "object" || !("date" in block)) continue;
    const utcDate = toUtcIso(block.date, block.time);
    sessions.push({
      id: `${round}-${String(def.key)}`,
      round,
      gpName: identity.name,
      circuit: identity.circuit,
      circuitId: identity.circuitId,
      country: identity.country,
      countryCode: identity.countryCode,
      sessionType: def.sessionType,
      sessionLabel: def.label,
      utcDate,
      status: inferSessionStatus(utcDate, now, { sessionType: def.sessionType }),
      isSprintWeekend,
    });
  }

  const raceUtc = toUtcIso(race.date, race.time);
  sessions.push({
    id: `${round}-Race`,
    round,
    gpName: identity.name,
    circuit: identity.circuit,
    circuitId: identity.circuitId,
    country: identity.country,
    countryCode: identity.countryCode,
    sessionType: "race",
    sessionLabel: "Race",
    utcDate: raceUtc,
    status: inferSessionStatus(raceUtc, now, { sessionType: "race" }),
    isSprintWeekend,
  });

  return sessions;
}
