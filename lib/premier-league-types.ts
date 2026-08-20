import type { MatchInfo, TeamInfo } from "@/lib/types";
import type { MatchDataSource } from "@/lib/football-data";

export type LeagueZone =
  | "CHAMPIONS_LEAGUE"
  | "EUROPA_LEAGUE"
  | "CONFERENCE_LEAGUE"
  | "MID_TABLE"
  | "RELEGATION";

export type PremierLeaguePhase = "PRE" | "EARLY" | "MID" | "RUN_IN" | "COMPLETE";

export interface LeagueStandingRow {
  team: TeamInfo;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  zone: LeagueZone;
  form: Array<"W" | "D" | "L">;
}

export interface LeagueStandings {
  seasonLabel: string;
  matchday: number;
  totalMatchdays: number;
  rows: LeagueStandingRow[];
}

export interface PremierLeagueRaceInsight {
  kind: "title" | "relegation";
  title: string;
  message: string;
  leaderLabel: string;
  chaseLabel: string;
  remaining: number;
}

export interface PremierLeagueSeasonData {
  seasonLabel: string;
  seasonStartYear: number;
  matches: MatchInfo[];
  standings: LeagueStandings;
  todayMatches: MatchInfo[];
  upcomingMatches: MatchInfo[];
  source: MatchDataSource;
  phase: PremierLeaguePhase;
  titleRace: PremierLeagueRaceInsight | null;
  relegationRace: PremierLeagueRaceInsight | null;
}

export interface PremierLeagueRailStep {
  id: string;
  label: string;
  shortLabel: string;
}
