const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Client identity for rate-limit buckets.
 *
 * Do not key off the first `x-forwarded-for` hop. A caller can set that
 * header, and each new leftmost value would open a fresh bucket.
 *
 * On Vercel the edge sets `x-vercel-forwarded-for` (its own copy of the
 * forwarded list; kept even if a proxy in front rewrites `x-forwarded-for`)
 * and `x-real-ip` (the single connecting address `@vercel/functions`
 * `ipAddress()` reads). When a platform header is a chain, only the
 * rightmost hop was added by the edge — anything to the left can be
 * client-supplied. A spoofed `x-forwarded-for` is never the bucket key.
 *
 * `next start` does not set those headers, so every direct caller shares
 * `unknown` and a forged `x-forwarded-for` still cannot mint a new bucket.
 */
export function rateLimitClientKey(request: {
  headers: { get(name: string): string | null };
}): string {
  const fromVercelChain = rightmostHop(request.headers.get("x-vercel-forwarded-for"));
  if (fromVercelChain) return fromVercelChain;

  const fromRealIp = rightmostHop(request.headers.get("x-real-ip"));
  if (fromRealIp) return fromRealIp;

  return "unknown";
}

function rightmostHop(value: string | null): string | undefined {
  if (!value) return undefined;
  const parts = value.split(",");
  for (let i = parts.length - 1; i >= 0; i--) {
    const hop = parts[i]?.trim();
    if (hop) return hop;
  }
  return undefined;
}

export const IMPROVE_HOURLY_LIMIT = 5;
export const IMPROVE_DAILY_LIMIT = 20;
const IMPROVE_HOURLY_WINDOW_MS = 60 * 60 * 1000;
const IMPROVE_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

const improveHourlyMap = new Map<string, { count: number; resetAt: number }>();
const improveDailyMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Feedback Improve limits: 5 requests per IP per hour and 20 per IP per day.
 * In-memory and per instance, same as `checkRateLimit`. A denied request does
 * not consume either window. Submit feedback keeps the separate 10/hour bucket.
 */
export function checkImproveRateLimit(
  key: string,
  now = Date.now()
): { allowed: boolean; retryAfterSec?: number } {
  const hour = inspectBucket(improveHourlyMap, key, IMPROVE_HOURLY_LIMIT, now);
  const day = inspectBucket(improveDailyMap, key, IMPROVE_DAILY_LIMIT, now);
  if (!hour.allowed || !day.allowed) {
    const retries = [hour.retryAfterSec, day.retryAfterSec].filter(
      (value): value is number => typeof value === "number"
    );
    return { allowed: false, retryAfterSec: Math.min(...retries) };
  }

  commitBucket(improveHourlyMap, key, hour.fresh, now, IMPROVE_HOURLY_WINDOW_MS);
  commitBucket(improveDailyMap, key, day.fresh, now, IMPROVE_DAILY_WINDOW_MS);
  return { allowed: true };
}

function inspectBucket(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  limit: number,
  now: number
): { allowed: boolean; retryAfterSec?: number; fresh: boolean } {
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    return { allowed: true, fresh: true };
  }
  if (entry.count >= limit) {
    return {
      allowed: false,
      fresh: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { allowed: true, fresh: false };
}

function commitBucket(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  fresh: boolean,
  now: number,
  windowMs: number
) {
  if (fresh) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= LIMIT) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
