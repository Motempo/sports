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

export type BracketRound = "R32" | "R16" | "QF" | "SF" | "FINAL" | "THIRD";

export type MatchStage = BracketRound | "GROUP" | "LEAGUE";

export interface MatchInfo {
  id: number;
  round: BracketRound;
  stage: MatchStage;
  group?: string;
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

export interface VenueImageCredit {
  /** Photographer or rights holder, plain text. */
  author: string;
  /** Short license name, for example "CC BY-SA 4.0". */
  license: string;
  /** Wikimedia Commons file page. */
  sourceUrl: string;
}

export interface VenueImage {
  url: string;
  alt: string;
  /** Pixel size of a same-origin photo, used to keep the stadium in frame. */
  width?: number;
  height?: number;
  /** Shown on the photo when the license asks for attribution. */
  credit?: VenueImageCredit;
}

export type NewsVideoKind = "youtube" | "vimeo" | "file";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  videoUrl?: string;
  videoKind?: NewsVideoKind;
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
