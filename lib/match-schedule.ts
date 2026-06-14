import {
  addDaysToDayKey,
  dayKeyToLocalDate,
  localDayKeyFromUtc,
  resolveScheduleTimeZone,
  todayKey,
} from "@/lib/match-timezone";
import type { MatchInfo } from "@/lib/types";

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

const LIVE_STATUSES = new Set<MatchInfo["status"]>(["LIVE", "IN_PLAY", "PAUSED"]);
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

function matchDaySortRank(status: MatchInfo["status"]): number {
  if (LIVE_STATUSES.has(status)) return 0;
  if (status === "SCHEDULED") return 1;
  if (status === "FINISHED") return 2;
  return 3;
}

function sortMatchesInDay(a: MatchInfo, b: MatchInfo): number {
  const rankDiff = matchDaySortRank(a.status) - matchDaySortRank(b.status);
  if (rankDiff !== 0) return rankDiff;

  const aTime = new Date(a.utcDate).getTime();
  const bTime = new Date(b.utcDate).getTime();

  // Upcoming/live: soonest first. Finished today: most recent first.
  if (a.status === "FINISHED" && b.status === "FINISHED") {
    return bTime - aTime;
  }

  return aTime - bTime;
}

export function groupMatchesByLocalDay(
  matches: MatchInfo[],
  now = new Date(),
  timeZone?: string
): MatchDayGroup[] {
  const tz = resolveScheduleTimeZone(timeZone);
  const today = todayKey(now, tz);
  const buckets = new Map<string, MatchInfo[]>();

  for (const match of matches) {
    const key = localDayKeyFromUtc(match.utcDate, tz);
    if (key < today) continue;

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

  if (groups.length > 0 && groups[0]!.dayKey > today) {
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
