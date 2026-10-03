import type { F1SessionInfo, F1SessionStatus, F1SessionType } from "@/lib/f1-types";

const MINUTE_MS = 60_000;

/**
 * How long the live badge stays up when the feed only has a start time.
 *
 * Lengths follow the 2026 FIA Formula 1 Sporting Regulations (Section B), plus a
 * 15-minute buffer so a cool-down lap or a short delay does not drop the badge
 * while the session is still on track:
 *
 * - Practice: 60 minutes (B2.1). FP can be extended to 90; that needs a real end.
 * - Sprint qualifying: 12 + 7 + 10 + 7 + 8 = 44 minutes (B2.2), treated as ~45.
 * - Qualifying: 18 + 7 + 15 + 7 + 13 = 60 minutes (B2.4).
 * - Sprint: about 30–45 minutes for 100 km; the unstopped cap is 60 (B2.3).
 * - Race: two-hour cap before a suspension (B2.5). A red flag can run to three
 *   hours; that stays live only when a fetched end time says so.
 */
const ESTIMATED_LIVE_WINDOW_MS: Record<F1SessionType, number> = {
  practice: 75 * MINUTE_MS,
  sprint_qualifying: 60 * MINUTE_MS,
  qualifying: 75 * MINUTE_MS,
  sprint: 60 * MINUTE_MS,
  race: 135 * MINUTE_MS,
};

/** Clock-skew grace after a source-provided end. Not the type-based buffer. */
const KNOWN_END_GRACE_MS = 5 * MINUTE_MS;

export type InferSessionStatusOptions = {
  sessionType: F1SessionType;
  /** Real end from OpenF1 or another source already fetched. Preferred over the estimate. */
  utcEnd?: string | null;
  /** Explicit status from a fetched source. `cancelled` and `finished` win over the estimate. */
  reportedStatus?: F1SessionStatus | null;
};

function parseInstant(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function estimatedEnd(startMs: number, sessionType: F1SessionType, utcEnd?: string | null): number {
  const knownEnd = parseInstant(utcEnd);
  if (knownEnd !== null && knownEnd >= startMs) return knownEnd + KNOWN_END_GRACE_MS;
  return startMs + ESTIMATED_LIVE_WINDOW_MS[sessionType];
}

/**
 * Live while the session should still be on track.
 * A fetched end time replaces the type estimate. `cancelled` always wins, and
 * `finished` wins once the start has passed (the session ended early). A stale
 * `live` or `scheduled` flag does not keep the badge up past the window.
 */
export function inferSessionStatus(
  utcDate: string,
  now: Date = new Date(),
  options: InferSessionStatusOptions,
): F1SessionStatus {
  if (options.reportedStatus === "cancelled") return "cancelled";

  const startMs = parseInstant(utcDate);
  if (startMs === null) {
    if (options.reportedStatus === "finished") return "finished";
    return "scheduled";
  }

  const nowMs = now.getTime();
  if (nowMs < startMs) return "scheduled";
  if (options.reportedStatus === "finished") return "finished";

  const endMs = estimatedEnd(startMs, options.sessionType, options.utcEnd);
  if (nowMs <= endMs) return "live";
  return "finished";
}

/** Recompute a stored session, keeping an explicit finished or cancelled flag. */
export function resolveSessionStatus(session: F1SessionInfo, now: Date = new Date()): F1SessionStatus {
  const reportedStatus =
    session.status === "cancelled" || session.status === "finished" ? session.status : undefined;
  return inferSessionStatus(session.utcDate, now, {
    sessionType: session.sessionType,
    utcEnd: session.utcEnd,
    reportedStatus,
  });
}

function findOpenF1Session(
  session: F1SessionInfo,
  openF1Sessions: F1SessionInfo[],
): F1SessionInfo | undefined {
  const label = session.sessionLabel.toLowerCase();
  const byLabel = openF1Sessions.find((candidate) => candidate.sessionLabel.toLowerCase() === label);
  if (byLabel) return byLabel;

  const sameType = openF1Sessions.filter((candidate) => candidate.sessionType === session.sessionType);
  if (sameType.length === 1) return sameType[0];
  return undefined;
}

/**
 * Copy start, end, and status from the matching OpenF1 session.
 * Label matches first so Practice 1's end is not applied to Practice 2.
 */
export function mergeOpenF1Sessions(
  jolpicaSessions: F1SessionInfo[],
  openF1Sessions: F1SessionInfo[],
): F1SessionInfo[] {
  if (openF1Sessions.length === 0) return jolpicaSessions;

  return jolpicaSessions.map((session) => {
    const match = findOpenF1Session(session, openF1Sessions);
    if (!match) return session;
    return {
      ...session,
      utcDate: match.utcDate,
      utcEnd: match.utcEnd ?? session.utcEnd,
      status: match.status,
    };
  });
}
