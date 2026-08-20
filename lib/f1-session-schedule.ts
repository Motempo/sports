import {
  addDaysToDayKey,
  dayKeyToLocalDate,
  localDayKeyFromUtc,
  resolveScheduleTimeZone,
  todayKey,
} from "@/lib/match-timezone";
import { getCurrentOrNextGrandPrix } from "@/lib/f1-phase";
import type {
  F1GrandPrix,
  F1SessionInfo,
  F1SessionStatus,
  F1SessionType,
  F1TitleFightInsight,
} from "@/lib/f1-types";

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

export type FeaturedF1Event =
  | { kind: "session"; session: F1SessionInfo; status: "live" | "upcoming" }
  | { kind: "gp"; gp: F1GrandPrix; status: "upcoming" | "complete" };

function sortByTimeAsc(a: { utcDate: string }, b: { utcDate: string }): number {
  return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
}

/**
 * Featured F1 event: live session, else next weekend session, else next GP,
 * else the last completed race once the season is over.
 */
export function selectFeaturedF1Event(
  sessions: F1SessionInfo[],
  calendar: F1GrandPrix[],
  now = new Date()
): FeaturedF1Event | null {
  const live = sessions.find((session) => session.status === LIVE_STATUS);
  if (live) return { kind: "session", session: live, status: "live" };

  const nextWeekendSession = selectWeekendSessions(sessions, now)
    .filter(
      (session) =>
        session.status === "scheduled" &&
        new Date(session.utcDate).getTime() >= now.getTime() - 60_000
    )
    .sort(sortByTimeAsc)[0];
  if (nextWeekendSession) {
    return { kind: "session", session: nextWeekendSession, status: "upcoming" };
  }

  const nextGp = getCurrentOrNextGrandPrix(calendar, now);
  if (nextGp && nextGp.status !== "completed") {
    return { kind: "gp", gp: nextGp, status: "upcoming" };
  }

  const lastCompleted = [...calendar]
    .filter((gp) => gp.status === "completed")
    .sort((a, b) => b.round - a.round)[0];
  if (lastCompleted) {
    return { kind: "gp", gp: lastCompleted, status: "complete" };
  }

  return null;
}

const SESSION_COPY: Record<F1SessionType, string> = {
  practice: " Teams shake down the car and lock in race pace.",
  qualifying: " Qualifying sets the Grand Prix grid (Q1–Q3).",
  sprint_qualifying: " This session sets the sprint grid.",
  sprint: " Top eight score sprint points (8 down to 1).",
  race: " Championship points: 25 for the winner, then 18–15–12–10–8–6–4–2–1.",
};

export function describeFeaturedF1Event(
  event: FeaturedF1Event,
  titleFight?: F1TitleFightInsight | null
): string {
  const fight = titleFight?.message ? ` ${titleFight.message}` : "";

  if (event.kind === "session") {
    const session = event.session;
    const sessionLine = SESSION_COPY[session.sessionType] ?? "";
    const sprint = session.isSprintWeekend
      ? " Sprint weekend: one practice, then sprint qualifying and the sprint before Sunday's race."
      : " Standard weekend: practice, qualifying, then the Grand Prix.";
    if (event.status === "live") {
      return `${session.sessionLabel} is live at ${session.circuit}.${sessionLine}`;
    }
    return `${session.sessionLabel} is next at ${session.circuit}.${sessionLine}${sprint}${fight}`.trim();
  }

  const gp = event.gp;
  const sprint = gp.isSprintWeekend
    ? " It's a sprint weekend — extra points on Saturday."
    : " Practice, qualifying, then the race on Sunday.";
  if (event.status === "complete") {
    const winner = gp.winner ? ` ${gp.winner} won the finale.` : "";
    return `The season is over. Last race: ${gp.name} at ${gp.circuit}.${winner}`;
  }
  return `Next up: ${gp.name} at ${gp.circuit}.${sprint}${fight}`.trim();
}
