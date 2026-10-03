/** Primary host timezone for World Cup 2026 kickoff scheduling. */
export const TOURNAMENT_TIMEZONE = "America/New_York";

/**
 * Locale for viewer-facing clocks. Pinned so the server render and the
 * browser hydration pass produce the same string.
 */
export const SCHEDULE_LOCALE = "en-US";

/**
 * Zone used for the server render and the matching hydration render.
 * `useViewerTimeZone` swaps in the viewer's zone after paint.
 */
export const HYDRATION_TIME_ZONE = "UTC";

export function resolveScheduleTimeZone(provided?: string): string {
  if (provided) return provided;
  if (typeof Intl !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return TOURNAMENT_TIMEZONE;
}

/** Server render timestamp, always labeled so it is not mistaken for local time. */
export function formatUpdatedTime(date = new Date()): string {
  return date.toLocaleTimeString(SCHEDULE_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: HYDRATION_TIME_ZONE,
    timeZoneName: "short",
  });
}

function noonUtcOnDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Civil calendar date (`YYYY-MM-DD`), not a kickoff instant. */
export function formatCalendarDate(dayKey: string): string {
  return noonUtcOnDayKey(dayKey).toLocaleDateString(SCHEDULE_LOCALE, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Weekday and month/day for a civil day key. Independent of the runtime zone. */
export function formatCalendarDayParts(dayKey: string): { weekday: string; monthDay: string } {
  const noon = noonUtcOnDayKey(dayKey);
  return {
    weekday: noon.toLocaleDateString(SCHEDULE_LOCALE, {
      weekday: "short",
      timeZone: "UTC",
    }),
    monthDay: noon.toLocaleDateString(SCHEDULE_LOCALE, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  };
}

export function formatViewerDateTime(
  utcDate: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(SCHEDULE_LOCALE, { ...options, timeZone }).format(
    new Date(utcDate)
  );
}

/** Calendar day key (YYYY-MM-DD) for a UTC instant in the given IANA timezone. */
export function localDayKeyFromUtc(utcDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcDate));
}

export function todayKey(now: Date, timeZone: string): string {
  return localDayKeyFromUtc(now.toISOString(), timeZone);
}

export function addDaysToDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayKeyToLocalDate(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isOnLocalDay(utcDate: string, dayKey: string, timeZone: string): boolean {
  return localDayKeyFromUtc(utcDate, timeZone) === dayKey;
}

export function isOnOrAfterLocalDay(utcDate: string, dayKey: string, timeZone: string): boolean {
  return localDayKeyFromUtc(utcDate, timeZone) >= dayKey;
}

export function isOnOrBeforeLocalDay(utcDate: string, dayKey: string, timeZone: string): boolean {
  return localDayKeyFromUtc(utcDate, timeZone) <= dayKey;
}

/** Build an ISO string for a June World Cup kickoff in Eastern Daylight Time. */
export function tournamentKickoffIso(dayKey: string, hour: number, minute = 0): string {
  return new Date(
    `${dayKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-04:00`
  ).toISOString();
}
