import type { MatchInfo } from "@/lib/types";

export const LIVE_MATCH_STATUSES = new Set<MatchInfo["status"]>([
  "LIVE",
  "IN_PLAY",
  "PAUSED",
]);

const API_STATUS_MAP: Record<string, MatchInfo["status"]> = {
  SCHEDULED: "SCHEDULED",
  TIMED: "SCHEDULED",
  LIVE: "LIVE",
  IN_PLAY: "IN_PLAY",
  PAUSED: "PAUSED",
  HALFTIME: "IN_PLAY",
  EXTRA_TIME: "IN_PLAY",
  PENALTY_SHOOTOUT: "IN_PLAY",
  SUSPENDED: "PAUSED",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
  CANCELLED: "CANCELLED",
  AWARDED: "FINISHED",
};

/** Map football-data.org (and similar) API status strings to our MatchStatus. */
export function normalizeApiMatchStatus(status: string): MatchInfo["status"] {
  return API_STATUS_MAP[status.trim().toUpperCase()] ?? "SCHEDULED";
}

/** Infer status for feeds that only publish full-time scores (e.g. openfootball JSON). */
export function inferMatchStatusFromKickoff(
  utcDate: string,
  hasFinalScore: boolean,
  now = new Date()
): MatchInfo["status"] {
  if (hasFinalScore) return "FINISHED";

  const kickoffMs = new Date(utcDate).getTime();
  const nowMs = now.getTime();
  if (Number.isNaN(kickoffMs) || nowMs < kickoffMs) return "SCHEDULED";

  const elapsedMs = nowMs - kickoffMs;
  const liveWindowMs = 130 * 60 * 1000;
  if (elapsedMs <= liveWindowMs) return "IN_PLAY";

  return "SCHEDULED";
}

/** True when a match should show the Live label and live styling. */
export function isMatchLive(status: MatchInfo["status"]): boolean {
  return LIVE_MATCH_STATUSES.has(status);
}

export function isMatchPlayed(
  status: MatchInfo["status"],
  homeScore: number | null,
  awayScore: number | null
): boolean {
  if (status === "FINISHED") return true;
  if (!isMatchLive(status)) return false;
  return homeScore !== null && awayScore !== null;
}
