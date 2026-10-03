/**
 * News, facts, venue photos, and other non-score fetches stay uncached.
 * Sports scoreboards go through `cachedUpstreamFetch` in
 * `lib/sports-upstream-cache.ts` (90s shared Data Cache, no URL cache-busting).
 */
export const uncachedFetch = { cache: "no-store" as const };
