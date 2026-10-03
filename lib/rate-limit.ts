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
