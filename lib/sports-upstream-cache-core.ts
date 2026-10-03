/**
 * Pure TTL window + in-process dedupe for upstream sports payloads.
 * The Next.js Data Cache adapter lives in `sports-upstream-cache.ts`.
 *
 * Non-200 responses must be thrown as `UpstreamHttpError` from `load`
 * so they are not stored. A later success in the same window is cached.
 * The window id rolls every TTL, so a full-time result is picked up on the
 * first read of the next window (within one TTL).
 */

export const SPORTS_UPSTREAM_TTL_SECONDS = 90;
export const SPORTS_UPSTREAM_TTL_MS = SPORTS_UPSTREAM_TTL_SECONDS * 1000;
export const SPORTS_UPSTREAM_CACHE_TAG = "sports-upstream";

export function upstreamWindow(now = Date.now(), ttlMs = SPORTS_UPSTREAM_TTL_MS): number {
  return Math.floor(now / ttlMs);
}

export function upstreamCacheKey(url: string, tokenFingerprint: string, window: number): string {
  return JSON.stringify({ url, tokenFingerprint, window });
}

export class UpstreamHttpError extends Error {
  readonly code = "UPSTREAM_HTTP";
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Upstream HTTP ${status}`);
    this.name = "UpstreamHttpError";
    this.status = status;
    this.body = body;
  }
}

export function isUpstreamHttpError(error: unknown): error is UpstreamHttpError {
  if (error instanceof UpstreamHttpError) return true;
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; status?: unknown; body?: unknown };
  return (
    candidate.code === "UPSTREAM_HTTP" &&
    typeof candidate.status === "number" &&
    typeof candidate.body === "string"
  );
}

export type UpstreamSuccess = {
  ok: true;
  status: 200;
  body: string;
  contentType: string | null;
};

export type UpstreamFailure = {
  ok: false;
  status: number;
  body: string;
};

export type UpstreamResult = UpstreamSuccess | UpstreamFailure;

export type MemoryRecord = UpstreamSuccess & { window: number };

export async function readThroughUpstream(options: {
  memoryKey: string;
  window: number;
  memory: Map<string, MemoryRecord>;
  inflight: Map<string, Promise<UpstreamResult>>;
  load: () => Promise<UpstreamSuccess>;
  onMemoryHit?: () => void;
}): Promise<UpstreamResult> {
  const cached = options.memory.get(options.memoryKey);
  if (cached && cached.window === options.window) {
    options.onMemoryHit?.();
    return cached;
  }

  const pending = options.inflight.get(options.memoryKey);
  if (pending) return pending;

  const job = (async (): Promise<UpstreamResult> => {
    try {
      const success = await options.load();
      pruneOtherWindows(options.memory, options.window);
      options.memory.set(options.memoryKey, { ...success, window: options.window });
      return success;
    } catch (error) {
      if (isUpstreamHttpError(error)) {
        return { ok: false, status: error.status, body: error.body };
      }
      throw error;
    } finally {
      options.inflight.delete(options.memoryKey);
    }
  })();

  options.inflight.set(options.memoryKey, job);
  return job;
}

function pruneOtherWindows(memory: Map<string, MemoryRecord>, window: number): void {
  for (const [key, value] of memory) {
    if (value.window !== window) memory.delete(key);
  }
}
