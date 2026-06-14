export type F1SessionType =
  | "practice"
  | "qualifying"
  | "sprint_qualifying"
  | "sprint"
  | "race";

export type F1SessionStatus = "scheduled" | "live" | "finished" | "cancelled";

export type F1GrandPrixStatus = "upcoming" | "current" | "completed" | "cancelled";

export type F1SeasonPhase = "PRE" | "ACTIVE" | "RACE_WEEKEND" | "COMPLETE";

export interface F1SessionInfo {
  id: string;
  round: number;
  gpName: string;
  circuit: string;
  country: string;
  countryCode?: string;
  sessionType: F1SessionType;
  sessionLabel: string;
  utcDate: string;
  status: F1SessionStatus;
  isSprintWeekend: boolean;
}

export interface F1StandingRow {
  position: number;
  driverId?: string;
  driverCode?: string;
  driverName: string;
  constructorId: string;
  constructorName: string;
  points: number;
  wins: number;
}

export interface F1ConstructorStandingRow {
  position: number;
  constructorId: string;
  constructorName: string;
  points: number;
  wins: number;
}

export interface F1GrandPrix {
  round: number;
  name: string;
  circuit: string;
  country: string;
  countryCode?: string;
  date: string;
  utcDate: string;
  status: F1GrandPrixStatus;
  winner?: string;
  winnerCode?: string;
  isSprintWeekend: boolean;
}

export interface F1RaceResult {
  round: number;
  gpName: string;
  position: number;
  driverCode: string;
  driverName: string;
  constructorName: string;
  status: string;
}

export interface F1SeasonData {
  season: number;
  calendar: F1GrandPrix[];
  driverStandings: F1StandingRow[];
  constructorStandings: F1ConstructorStandingRow[];
  sessions: F1SessionInfo[];
  lastRaceResults: F1RaceResult[];
  source: "api" | "seed";
}

export type F1RailStepId = "PRE" | `R${number}` | "CHAMPION";

export interface F1RailStep {
  id: F1RailStepId;
  label: string;
  shortLabel: string;
  round?: number;
}

export interface F1TitleFightInsight {
  leaderName: string;
  leaderPoints: number;
  challengerName: string;
  challengerPoints: number;
  gap: number;
  racesRemaining: number;
  winsNeededEstimate: number;
  message: string;
}
