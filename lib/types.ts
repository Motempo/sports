export type MatchStatus = "SCHEDULED" | "LIVE" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "CANCELLED";

export interface TeamInfo {
  code: string;
  name: string;
  shortName?: string;
  crest?: string;
  iso2: string;
  capital?: string;
  confederation?: string;
  fifaRank?: number;
}

export interface MatchInfo {
  id: number;
  round: BracketRound;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  utcDate: string;
  venue: string;
  city?: string;
  winnerCode?: string;
}

export type BracketRound = "R32" | "R16" | "QF" | "SF" | "FINAL" | "THIRD";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  xHandle: string;
  xName: string;
  xAvatar: string;
  xProfileUrl: string;
  verified: boolean;
}

export interface FunFact {
  id: string;
  title: string;
  summary: string;
  category: string;
  emoji: string;
  wikipediaTitle?: string;
  detail: string;
  imageUrl?: string;
  sourceHandle: string;
  sourceName?: string;
  xProfileUrl?: string;
  verified?: boolean;
}

export interface BracketData {
  matches: MatchInfo[];
  lastUpdated: string;
  source: "api" | "seed";
}
