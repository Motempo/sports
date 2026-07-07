/** Bypass Next.js Data Cache — always hit upstream on each request. */
export const uncachedFetch = { cache: "no-store" as const };

/** Request init that also asks CDNs (e.g. GitHub raw) not to serve a stale edge copy. */
export const freshUpstreamFetch: RequestInit = {
  cache: "no-store",
  headers: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
  },
};

/** Append a cache-busting query param so GitHub raw edges revalidate. */
export function cacheBustUrl(url: string, now = Date.now()): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${now}`;
}
