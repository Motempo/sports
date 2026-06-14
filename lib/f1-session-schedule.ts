import {
  addDaysToDayKey,
  dayKeyToLocalDate,
  localDayKeyFromUtc,
  resolveScheduleTimeZone,
  todayKey,
} from "@/lib/match-timezone";
import type { F1SessionInfo, F1SessionStatus } from "@/lib/f1-types";

export interface F1SessionDayGroup {
  dayKey: string;
  dayStart: Date;
  label: string;
  sessions: F1SessionInfo[];
}

const LIVE_STATUS: F1SessionStatus = "live";

export function formatLocalSessionTime(utcDate: string): string {
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

function sessionSortRank(status: F1SessionStatus): number {
  if (status === LIVE_STATUS) return 0;
  if (status === "scheduled") return 1;
  if (status === "finished") return 2;
  return 3;
}

function sortSessionsInDay(a: F1SessionInfo, b: F1SessionInfo): number {
  const rankDiff = sessionSortRank(a.status) - sessionSortRank(b.status);
  if (rankDiff !== 0) return rankDiff;

  const aTime = new Date(a.utcDate).getTime();
  const bTime = new Date(b.utcDate).getTime();

  if (a.status === "finished" && b.status === "finished") {
    return bTime - aTime;
  }

  return aTime - bTime;
}

export function selectWeekendSessions(
  sessions: F1SessionInfo[],
  now = new Date(),
  timeZone?: string
): F1SessionInfo[] {
  const tz = resolveScheduleTimeZone(timeZone);
  const today = todayKey(now, tz);
  const horizon = addDaysToDayKey(today, 7);

  return sessions
    .filter((session) => {
      if (session.status === "cancelled") return false;
      const sessionDay = localDayKeyFromUtc(session.utcDate, tz);
      if (sessionDay < today || sessionDay > horizon) return false;
      if (session.status === LIVE_STATUS) return true;
      if (session.status === "finished") return sessionDay === today;
      return true;
    })
    .sort(sortSessionsInDay);
}

export function groupSessionsByLocalDay(
  sessions: F1SessionInfo[],
  now = new Date(),
  timeZone?: string
): F1SessionDayGroup[] {
  const tz = resolveScheduleTimeZone(timeZone);
  const today = todayKey(now, tz);
  const buckets = new Map<string, F1SessionInfo[]>();

  for (const session of sessions) {
    const key = localDayKeyFromUtc(session.utcDate, tz);
    if (key < today) continue;

    const list = buckets.get(key) ?? [];
    list.push(session);
    buckets.set(key, list);
  }

  const groups = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, daySessions]) => ({
      dayKey,
      dayStart: dayKeyToLocalDate(dayKey),
      label: formatLocalDayLabel(dayKey, now, tz),
      sessions: [...daySessions].sort(sortSessionsInDay),
    }));

  if (groups.length > 0 && groups[0]!.dayKey > today) {
    groups.unshift({
      dayKey: today,
      dayStart: dayKeyToLocalDate(today),
      label: formatLocalDayLabel(today, now, tz),
      sessions: [],
    });
  }

  return groups;
}

export { sortSessionsInDay };
