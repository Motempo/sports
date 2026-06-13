import type { MatchInfo } from "@/lib/types";

export interface MatchDayGroup {
  dayKey: string;
  dayStart: Date;
  label: string;
  matches: MatchInfo[];
}

function localDayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfLocalDayFromKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalMatchTime(utcDate: string): string {
  return new Date(utcDate).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLocalDayLabel(dayStart: Date, now = new Date()): string {
  const todayKey = localDayKey(now);
  const dayKey = localDayKey(dayStart);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDayKey(tomorrow);

  const weekday = dayStart.toLocaleDateString(undefined, { weekday: "short" });
  const monthDay = dayStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  if (dayKey === todayKey) return `Today · ${weekday}, ${monthDay}`;
  if (dayKey === tomorrowKey) return `Tomorrow · ${weekday}, ${monthDay}`;
  return `${weekday}, ${monthDay}`;
}

const LIVE_STATUSES = new Set<MatchInfo["status"]>(["LIVE", "IN_PLAY", "PAUSED"]);

function sortMatchesInDay(a: MatchInfo, b: MatchInfo): number {
  const aLive = LIVE_STATUSES.has(a.status) ? 0 : 1;
  const bLive = LIVE_STATUSES.has(b.status) ? 0 : 1;
  if (aLive !== bLive) return aLive - bLive;
  return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
}

export function groupMatchesByLocalDay(
  matches: MatchInfo[],
  now = new Date()
): MatchDayGroup[] {
  const buckets = new Map<string, MatchInfo[]>();

  for (const match of matches) {
    const key = localDayKey(new Date(match.utcDate));
    const list = buckets.get(key) ?? [];
    list.push(match);
    buckets.set(key, list);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayMatches]) => {
      const dayStart = startOfLocalDayFromKey(dayKey);
      return {
        dayKey,
        dayStart,
        label: formatLocalDayLabel(dayStart, now),
        matches: [...dayMatches].sort(sortMatchesInDay),
      };
    });
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

  return combined.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
}
