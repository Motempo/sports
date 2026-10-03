import "server-only";

import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import {
  SPORTS_UPSTREAM_CACHE_TAG,
  SPORTS_UPSTREAM_TTL_SECONDS,
  readThroughUpstream,
  upstreamCacheKey,
  upstreamWindow,
  type MemoryRecord,
  type UpstreamResult,
  type UpstreamSuccess,
  UpstreamHttpError,
} from "@/lib/sports-upstream-cache-core";

/**
 * Shared cache for upstream sports JSON/text.
 *
 * Vercel Hobby has no Redis. The free cross-isolate store is the Next.js Data
 * Cache, which `unstable_cache` writes. Pages stay `force-dynamic` (HTML is
 * rendered per request) and must not set `fetchCache = "force-no-store"` —
 * that flag skips Data Cache reads.
 *
 * A time bucket is part of the cache key so the first request after the TTL
 * blocks on a new upstream read instead of serving stale-while-revalidate.
 * Only HTTP 200 bodies are stored. A 429 throws and is not cached, so the
 * league cascade can still fall through to ESPN on that request and try
 * football-data again on the next one.
 *
 * The in-process map dedupes concurrent misses on one isolate and serves
 * repeat reads without another Data Cache round trip. It is not the shared
 * layer — a cold isolate still hits the Data Cache.
 */

const memory = new Map<string, MemoryRecord>();
const inflight = new Map<string, Promise<UpstreamResult>>();

function tokenFingerprint(headers?: HeadersInit): string {
  const token = new Headers(headers).get("x-auth-token");
  if (!token) return "";
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

function labelFor(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function headerEntries(headers?: HeadersInit): [string, string][] {
  return [...new Headers(headers).entries()];
}

async function fetchSuccessPayload(
  url: string,
  headers: [string, string][],
  label: string,
  signal?: AbortSignal
): Promise<Pick<UpstreamSuccess, "body" | "contentType">> {
  console.info(`[sports-cache] miss ${label}`);
  const res = await fetch(url, { headers, signal });
  const body = await res.text();
  if (res.status !== 200) {
    console.info(`[sports-cache] skip ${res.status} ${label}`);
    throw new UpstreamHttpError(res.status, body);
  }
  return { body, contentType: res.headers.get("content-type") };
}

async function loadShared(
  url: string,
  init: RequestInit | undefined,
  label: string,
  cacheKey: string
): Promise<UpstreamSuccess> {
  const headers = headerEntries(init?.headers);
  const signal = init?.signal ?? undefined;
  let ran = false;
  const run = unstable_cache(
    async () => {
      ran = true;
      return fetchSuccessPayload(url, headers, label, signal);
    },
    [cacheKey],
    {
      revalidate: SPORTS_UPSTREAM_TTL_SECONDS,
      tags: [SPORTS_UPSTREAM_CACHE_TAG],
    }
  );

  const stored = await run();
  if (!ran) console.info(`[sports-cache] hit ${label}`);
  return {
    ok: true,
    status: 200,
    body: stored.body,
    contentType: stored.contentType,
  };
}

function toResponse(result: UpstreamResult): Response {
  const headers = new Headers();
  if (result.ok && result.contentType) {
    headers.set("content-type", result.contentType);
  }
  return new Response(result.body, { status: result.status, headers });
}

export async function cachedUpstreamFetch(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  const label = labelFor(url);
  const windowId = upstreamWindow();
  const cacheKey = upstreamCacheKey(url, tokenFingerprint(init?.headers), windowId);

  const result = await readThroughUpstream({
    memoryKey: cacheKey,
    window: windowId,
    memory,
    inflight,
    onMemoryHit: () => console.info(`[sports-cache] hit ${label}`),
    load: () => loadShared(url, init, label, cacheKey),
  });

  return toResponse(result);
}
