/** football-data.org free tier is 10 requests/minute for the whole key. */
export const MAX_VENUE_DETAIL_FETCHES = 4;

/** Same window as the provider's per-minute budget. */
export const VENUE_DETAIL_WINDOW_MS = 60_000;

/** Don't ask again immediately when a detail call has no stadium. */
export const VENUE_DETAIL_MISS_TTL_MS = 10 * 60_000;

const LIVE_STATUSES = new Set(["LIVE", "IN_PLAY", "PAUSED"]);

export type VenueDetailCandidate = {
  id: number;
  utcDate: string;
  venue?: string | null;
  status?: string;
};

export type VenueDetailWindow = {
  windowStartedAt: number;
  used: number;
  pausedUntil: number;
};

export function isMissingVenue(venue?: string | null): boolean {
  const trimmed = venue?.trim();
  return !trimmed || trimmed.toUpperCase() === "TBD";
}

export function createVenueDetailWindow(now = 0): VenueDetailWindow {
  return { windowStartedAt: now, used: 0, pausedUntil: 0 };
}

/**
 * Claim one match-detail slot. Synchronous so concurrent renders on one
 * isolate cannot each take a full set of calls.
 */
export function claimVenueDetailSlot(window: VenueDetailWindow, now: number): boolean {
  if (now < window.pausedUntil) return false;
  if (window.windowStartedAt === 0 || now - window.windowStartedAt >= VENUE_DETAIL_WINDOW_MS) {
    window.windowStartedAt = now;
    window.used = 0;
  }
  if (window.used >= MAX_VENUE_DETAIL_FETCHES) return false;
  window.used += 1;
  return true;
}

export function pauseVenueDetailWindow(window: VenueDetailWindow, now: number): void {
  const until = now + VENUE_DETAIL_WINDOW_MS;
  if (until > window.pausedUntil) window.pausedUntil = until;
}

export function noteVenueDetailMiss(misses: Map<number, number>, matchId: number, now: number): void {
  misses.set(matchId, now + VENUE_DETAIL_MISS_TTL_MS);
}

export function venueDetailMissIsActive(misses: Map<number, number>, matchId: number, now: number): boolean {
  const until = misses.get(matchId);
  return until !== undefined && now < until;
}

/**
 * Fixtures that still have no venue, capped at `limit`.
 * Prefer the match a viewer is looking at: live, then the next kickoff,
 * then the most recently finished.
 */
export function selectVenueDetailMatches<T extends VenueDetailCandidate>(
  matches: readonly T[],
  options?: { limit?: number; now?: Date }
): T[] {
  const limit = options?.limit ?? MAX_VENUE_DETAIL_FETCHES;
  if (limit <= 0) return [];

  const nowMs = (options?.now ?? new Date()).getTime();
  const missing = matches.filter((match) => isMissingVenue(match.venue));
  const ranked = [...missing].sort((a, b) => compareRank(a, b, nowMs));

  const seen = new Set<number>();
  const picked: T[] = [];
  for (const match of ranked) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    picked.push(match);
    if (picked.length >= limit) break;
  }
  return picked;
}

function compareRank(a: VenueDetailCandidate, b: VenueDetailCandidate, nowMs: number): number {
  const aRank = rank(a, nowMs);
  const bRank = rank(b, nowMs);
  if (aRank[0] !== bRank[0]) return aRank[0] - bRank[0];
  if (aRank[1] !== bRank[1]) return aRank[1] - bRank[1];
  return aRank[2] - bRank[2];
}

function rank(match: VenueDetailCandidate, nowMs: number): [number, number, number] {
  const ms = Date.parse(match.utcDate);
  const valid = !Number.isNaN(ms);
  const status = match.status ?? "";

  if (LIVE_STATUSES.has(status)) {
    return [0, valid ? ms : Number.POSITIVE_INFINITY, match.id];
  }
  if (status === "SCHEDULED" && valid && ms >= nowMs - 60_000) {
    return [1, ms, match.id];
  }
  if (status === "FINISHED" && valid) {
    return [2, -ms, match.id];
  }
  return [3, valid ? Math.abs(ms - nowMs) : Number.POSITIVE_INFINITY, match.id];
}
