import {
  addDaysToDayKey,
  dayKeyToLocalDate,
  localDayKeyFromUtc,
  resolveScheduleTimeZone,
  todayKey,
} from "@/lib/match-timezone";
import { getCurrentOrNextGrandPrix } from "@/lib/f1-phase";
import { nextEventParagraphs, type NextEventBrief } from "@/lib/next-event-copy";
import type {
  F1ConstructorStandingRow,
  F1GrandPrix,
  F1SessionInfo,
  F1SessionStatus,
  F1SessionType,
  F1StandingRow,
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

function lastName(full: string): string {
  return full.trim().split(/\s+/).pop() || full;
}

function sprintLine(isSprint: boolean): string {
  return isSprint
    ? " Sprint weekend: one practice, then sprint qualifying and the sprint before Sunday's race."
    : " Standard weekend: practice, qualifying, then the Grand Prix.";
}

function f1Description(event: FeaturedF1Event, trackFact?: string | null): string {
  const fact = trackFact?.trim();
  const withFact = (base: string) => (fact ? `${base} ${fact}` : base);

  if (event.kind === "session") {
    const session = event.session;
    const sessionLine = SESSION_COPY[session.sessionType] ?? "";
    if (event.status === "live") {
      return withFact(`${session.sessionLabel} is live at ${session.circuit}.${sessionLine}`);
    }
    return withFact(
      `${session.sessionLabel} is next at ${session.circuit}.${sessionLine}${sprintLine(session.isSprintWeekend)}`.trim()
    );
  }

  const gp = event.gp;
  if (event.status === "complete") {
    const winner = gp.winner ? ` ${gp.winner} won the finale.` : "";
    return withFact(`The season is over. Last race: ${gp.name} at ${gp.circuit}.${winner}`);
  }
  return withFact(`Next up: ${gp.name} at ${gp.circuit}.${sprintLine(gp.isSprintWeekend)}`.trim());
}

function sessionPrediction(sessionType: F1SessionType, circuit: string): string {
  switch (sessionType) {
    case "practice":
      return `Paddock read: FP times bounce around with fuel and engine modes. Experts mark long-run pace and tyre wear at ${circuit}, not the top of the timesheet.`;
    case "sprint_qualifying":
      return `Paddock read: this grid is a one-shot sprint shootout. A Q1 mistake here is hard to undo — there is no second qualifying later in the day.`;
    case "qualifying":
      return `Paddock read: grid is everything at ${circuit}. Experts will watch who finds a lap in Q3 and who gets caught in traffic — Sunday's race is often won on Saturday.`;
    case "sprint":
      return `Paddock read: sprint points are small (8 down to 1) but they nibble at a championship gap before the Grand Prix. Expect a cleaner start than the race, then a tyre-management fight.`;
    case "race":
      return `Paddock read: race day is pit windows, tyre cliffs, and who can pass at ${circuit}. The form book starts with the championship leaders, then whoever looked after their rubber on Friday.`;
  }
}

function f1Prediction(
  event: FeaturedF1Event,
  drivers?: F1StandingRow[],
  constructors?: F1ConstructorStandingRow[]
): string {
  const leader = drivers?.[0];
  const challenger = drivers?.[1];
  const team = constructors?.[0];
  const table =
    leader && challenger
      ? ` ${lastName(leader.driverName)} leads on ${leader.points} pts, ${lastName(challenger.driverName)} is ${leader.points - challenger.points} back.`
      : "";
  const constructorBit = team ? ` ${team.constructorName} sit top of the constructors.` : "";

  if (event.kind === "session") {
    return `${sessionPrediction(event.session.sessionType, event.session.circuit)}${table}${constructorBit}`.trim();
  }
  if (event.status === "complete") {
    return `The championship table is the final word.${table}${constructorBit}`.trim();
  }
  return `Paddock read: the title fight sets the tone for ${event.gp.name}.${table}${constructorBit} Practice and qualifying still decide who can actually cash that in on Sunday.`.trim();
}

function f1Impact(
  event: FeaturedF1Event,
  titleFight?: F1TitleFightInsight | null,
  drivers?: F1StandingRow[]
): string {
  const fight = titleFight?.message?.trim();
  const leader = drivers?.[0];
  const challenger = drivers?.[1];
  const fallback =
    !fight && leader && challenger
      ? `${lastName(challenger.driverName)} trails ${lastName(leader.driverName)} by ${leader.points - challenger.points} pts.`
      : "";
  const championship = fight || fallback;

  if (event.kind === "session") {
    const session = event.session;
    const sprintCost = session.isSprintWeekend
      ? " On a sprint weekend this is the only practice session — a reliability niggle here costs a driver their Friday setup work."
      : " A messy session rarely ends the weekend, but it can leave a driver chasing the setup all Saturday.";
    switch (session.sessionType) {
      case "practice":
        return `${championship ? `${championship} ` : ""}Drivers use this hour to build a car they can trust.${sprintCost}`.trim();
      case "sprint_qualifying":
      case "qualifying":
        return `${championship ? `${championship} ` : ""}Grid position is career-real: a front-row start eases the title maths; a Q1 exit dumps a driver into traffic and damage risk.`.trim();
      case "sprint":
        return `${championship ? `${championship} ` : ""}Sprint points are small, but they still move a driver up the table before Sunday — and a crash here can take them out of the Grand Prix.`.trim();
      case "race":
        return `${championship ? `${championship} ` : ""}A 25-point haul is a full swing in the title maths. Constructors' points pay the team that built the car — double finishes stretch a lead, DNFs haunt a winter.`.trim();
    }
  }

  if (event.status === "complete") {
    return championship
      ? `${championship} The winter is for recovery, contract talks, and who comes back hungrier.`
      : `The winter is for recovery, contract talks, and who comes back hungrier.`;
  }

  return championship
    ? `${championship} What happens this weekend feeds straight into that gap — every starter is driving for their championship, their seat, or both.`
    : `What happens this weekend feeds the championship — every starter is driving for points, their seat, or both.`;
}

export function featuredF1EventBrief(
  event: FeaturedF1Event,
  options?: {
    titleFight?: F1TitleFightInsight | null;
    driverStandings?: F1StandingRow[];
    constructorStandings?: F1ConstructorStandingRow[];
    trackFact?: string | null;
  }
): NextEventBrief {
  return {
    description: f1Description(event, options?.trackFact),
    prediction: f1Prediction(event, options?.driverStandings, options?.constructorStandings),
    impact: f1Impact(event, options?.titleFight, options?.driverStandings),
  };
}

export function featuredF1EventParagraphs(
  event: FeaturedF1Event,
  options?: Parameters<typeof featuredF1EventBrief>[1]
): string[] {
  return nextEventParagraphs(featuredF1EventBrief(event, options));
}
