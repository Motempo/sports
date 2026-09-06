import {
  addDaysToDayKey,
  dayKeyToLocalDate,
  localDayKeyFromUtc,
  resolveScheduleTimeZone,
  todayKey,
} from "@/lib/match-timezone";
import type { MatchInfo } from "@/lib/types";
import { isMatchLive, LIVE_MATCH_STATUSES } from "@/lib/match-status";

export interface MatchDayGroup {
  dayKey: string;
  dayStart: Date;
  label: string;
  matches: MatchInfo[];
}

export function formatLocalMatchTime(utcDate: string): string {
  return new Date(utcDate).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLocalDayLabel(
  dayKey: string,
  now = new Date(),
  timeZone?: string
): string {
  const tz = resolveScheduleTimeZone(timeZone);
  const today = todayKey(now, tz);
  const tomorrow = addDaysToDayKey(today, 1);
  const dayStart = dayKeyToLocalDate(dayKey);

  const weekday = dayStart.toLocaleDateString(undefined, { weekday: "short" });
  const monthDay = dayStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  if (dayKey === today) return `Today · ${weekday}, ${monthDay}`;
  if (dayKey === tomorrow) return `Tomorrow · ${weekday}, ${monthDay}`;
  return `${weekday}, ${monthDay}`;
}

const LIVE_STATUSES = LIVE_MATCH_STATUSES;
const SCHEDULE_STATUSES = new Set<MatchInfo["status"]>([
  "SCHEDULED",
  "LIVE",
  "IN_PLAY",
  "PAUSED",
  "FINISHED",
]);

/**
 * Matches for the day-grouped schedule from today through the next 30 local
 * calendar days, plus any live fixtures in that window.
 */
export function selectScheduleMatches(
  matches: MatchInfo[],
  now = new Date(),
  timeZone?: string
): MatchInfo[] {
  const tz = resolveScheduleTimeZone(timeZone);
  const today = todayKey(now, tz);
  const horizon = addDaysToDayKey(today, 30);

  return matches
    .filter((match) => {
      if (!SCHEDULE_STATUSES.has(match.status)) return false;

      const matchDay = localDayKeyFromUtc(match.utcDate, tz);
      if (matchDay < today || matchDay > horizon) return false;

      if (LIVE_STATUSES.has(match.status)) return true;
      if (match.status === "FINISHED") return matchDay === today;
      return true;
    })
    .sort(sortMatchesInDay);
}

/**
 * Final stretch of a finished season — last `dayWindow` calendar days that had
 * fixtures, used when nothing remains in the forward schedule horizon.
 */
export function selectSeasonTailMatches(
  matches: MatchInfo[],
  dayWindow = 21
): MatchInfo[] {
  const finished = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  if (finished.length === 0) return [];

  const lastKick = new Date(finished[finished.length - 1]!.utcDate).getTime();
  const cutoff = lastKick - dayWindow * 24 * 60 * 60 * 1000;

  return finished.filter((m) => new Date(m.utcDate).getTime() >= cutoff);
}

function sortMatchesInDay(a: MatchInfo, b: MatchInfo): number {
  return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
}

export function groupMatchesByLocalDay(
  matches: MatchInfo[],
  now = new Date(),
  timeZone?: string,
  options?: { includePastDays?: boolean }
): MatchDayGroup[] {
  const tz = resolveScheduleTimeZone(timeZone);
  const today = todayKey(now, tz);
  const buckets = new Map<string, MatchInfo[]>();

  for (const match of matches) {
    const key = localDayKeyFromUtc(match.utcDate, tz);
    if (!options?.includePastDays && key < today) continue;

    const list = buckets.get(key) ?? [];
    list.push(match);
    buckets.set(key, list);
  }

  const groups = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayMatches]) => ({
      dayKey,
      dayStart: dayKeyToLocalDate(dayKey),
      label: formatLocalDayLabel(dayKey, now, tz),
      matches: [...dayMatches].sort(sortMatchesInDay),
    }));

  if (!options?.includePastDays && groups.length > 0 && groups[0]!.dayKey > today) {
    groups.unshift({
      dayKey: today,
      dayStart: dayKeyToLocalDate(today),
      label: formatLocalDayLabel(today, now, tz),
      matches: [],
    });
  }

  return groups;
}

export function combineScheduleMatches(
  todayMatches: MatchInfo[],
  upcomingMatches: MatchInfo[]
): MatchInfo[] {
  const seen = new Set<number>();
  const combined: MatchInfo[] = [];

  for (const match of [...todayMatches, ...upcomingMatches]) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    combined.push(match);
  }

  return combined.sort(sortMatchesInDay);
}

/** Total fixtures across day columns (empty “today” placeholders do not count). */
export function countDayGroupMatches(groups: MatchDayGroup[]): number {
  return groups.reduce((total, group) => total + group.matches.length, 0);
}

/**
 * Keep day columns in order, but only the first `limit` fixtures overall.
 * Empty placeholder days are dropped so the first visible slots are real games.
 */
export function sliceDayGroupsByMatchCount(
  groups: MatchDayGroup[],
  limit: number
): MatchDayGroup[] {
  if (limit <= 0) return [];

  const result: MatchDayGroup[] = [];
  let remaining = limit;

  for (const group of groups) {
    if (remaining <= 0) break;
    if (group.matches.length === 0) continue;

    const matches = group.matches.slice(0, remaining);
    result.push({ ...group, matches });
    remaining -= matches.length;
  }

  return result;
}

/**
 * Featured match for returning users: live first, then the soonest scheduled
 * kickoff, then the most recent finished match (tournament complete).
 */
export function selectFeaturedMatch(
  matches: MatchInfo[],
  now = new Date()
): MatchInfo | null {
  const live = matches
    .filter((match) => isMatchLive(match.status))
    .sort(sortMatchesInDay);
  if (live[0]) return live[0];

  const upcoming = matches
    .filter((match) => {
      if (match.status !== "SCHEDULED") return false;
      return new Date(match.utcDate).getTime() >= now.getTime() - 60_000;
    })
    .sort(sortMatchesInDay);
  if (upcoming[0]) return upcoming[0];

  const finished = matches
    .filter((match) => match.status === "FINISHED")
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
  return finished[0] ?? null;
}

/**
 * Finished fixtures in chronological order (oldest → newest) for the previous-events
 * carousel. Excludes the featured match when it is already shown as the last result.
 */
export function selectPreviousMatches(
  matches: MatchInfo[],
  options?: { excludeMatchId?: number; limit?: number }
): MatchInfo[] {
  const limit = options?.limit ?? 10;
  const finished = matches
    .filter((match) => match.status === "FINISHED")
    .filter((match) => options?.excludeMatchId == null || match.id !== options.excludeMatchId)
    .sort(sortMatchesInDay);

  if (finished.length <= limit) return finished;
  return finished.slice(finished.length - limit);
}
