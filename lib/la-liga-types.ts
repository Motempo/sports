import type { MatchInfo, TeamInfo } from "@/lib/types";
import type { MatchDataSource } from "@/lib/football-data";
import type {
  LeagueStandings,
  LeagueZone,
  LeagueStandingRow,
  PremierLeagueRaceInsight,
} from "@/lib/premier-league-types";

export type LaLigaPhase = "PRE" | "EARLY" | "MID" | "RUN_IN" | "COMPLETE";

export type { LeagueStandings, LeagueZone, LeagueStandingRow, PremierLeagueRaceInsight as LeagueRaceInsight };

export interface LaLigaSeasonData {
  seasonLabel: string;
  seasonStartYear: number;
  matches: MatchInfo[];
  standings: LeagueStandings;
  todayMatches: MatchInfo[];
  upcomingMatches: MatchInfo[];
  source: MatchDataSource;
  phase: LaLigaPhase;
  titleRace: PremierLeagueRaceInsight | null;
  relegationRace: PremierLeagueRaceInsight | null;
}

export interface LaLigaRailStep {
  id: string;
  label: string;
  shortLabel: string;
}

export interface ClubSeed {
  code: string;
  name: string;
  shortName: string;
  crest: string;
}
