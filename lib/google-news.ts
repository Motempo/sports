import "server-only";

import { isGoogleNewsUrl, isSafeHttpUrl } from "@/lib/news-media";

const BATCH_EXECUTE_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const USER_AGENT = "Mozilla/5.0 (compatible; Sports-by-Motempo/1.0; +https://sports.motempo.com)";
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const resolvedCache = new Map<string, { value: string | null; expiresAt: number }>();

function cacheGet(key: string): string | null | undefined {
  const hit = resolvedCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    resolvedCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key: string, value: string | null) {
  if (resolvedCache.size > 200) {
    const first = resolvedCache.keys().next().value;
    if (first) resolvedCache.delete(first);
  }
  resolvedCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function googleNewsArticleId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.replace(/^www\./, "") !== "news.google.com") return undefined;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const articlesIdx = parts.lastIndexOf("articles");
    if (articlesIdx === -1 || !parts[articlesIdx + 1]) return undefined;
    return parts[articlesIdx + 1];
  } catch {
    return undefined;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchDecodingParams(
  articleId: string,
  originalUrl: string
): Promise<{ signature: string; timestamp: string } | null> {
  const candidates = [
    originalUrl,
    `https://news.google.com/rss/articles/${articleId}`,
    `https://news.google.com/articles/${articleId}`,
  ];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const html = await fetchHtml(candidate);
    if (!html) continue;
    const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (signature && timestamp && /^\d+$/.test(timestamp)) {
      return { signature, timestamp };
    }
  }
  return null;
}

function parseBatchedUrl(body: string): string | null {
  let text = body;
  if (text.startsWith(")]}'")) {
    text = text.split("\n").slice(1).join("\n");
  }
  text = text.trimStart();
  const firstLine = text.split("\n", 1)[0] ?? "";
  if (/^\d+$/.test(firstLine.trim())) {
    text = text.slice(firstLine.length).trimStart();
  }

  try {
    const envelopes = JSON.parse(text) as unknown;
    if (!Array.isArray(envelopes)) return null;
    for (const envelope of envelopes) {
      if (!Array.isArray(envelope) || envelope[0] !== "wrb.fr" || envelope[1] !== "Fbv4je") {
        continue;
      }
      const payloadRaw = envelope[2];
      if (typeof payloadRaw !== "string") continue;
      const payload = JSON.parse(payloadRaw) as unknown;
      if (Array.isArray(payload) && payload[0] === "garturlres" && typeof payload[1] === "string") {
        return payload[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Resolve a Google News `articles/CBMi…` wrapper to the publisher URL.
 * Post-2024 IDs are encrypted; this uses Google's article landing page + batchexecute RPC.
 */
export async function resolveGoogleNewsUrl(url: string): Promise<string | null> {
  if (!isGoogleNewsUrl(url)) return url;

  const cached = cacheGet(url);
  if (cached !== undefined) return cached;

  const articleId = googleNewsArticleId(url);
  if (!articleId) {
    cacheSet(url, null);
    return null;
  }

  try {
    const params = await fetchDecodingParams(articleId, url);
    if (!params) {
      cacheSet(url, null);
      return null;
    }

    const rpcInner = JSON.stringify([
      "garturlreq",
      [
        ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
        "X",
        "X",
        1,
        [1, 1, 1],
        1,
        1,
        null,
        0,
        0,
        null,
        0,
      ],
      articleId,
      Number.parseInt(params.timestamp, 10),
      params.signature,
    ]);
    const fReq = JSON.stringify([[["Fbv4je", rpcInner, null, "generic"]]]);

    const res = await fetch(BATCH_EXECUTE_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Referer: "https://news.google.com/",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({ "f.req": fReq }).toString(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      cacheSet(url, null);
      return null;
    }

    const resolved = parseBatchedUrl(await res.text());
    const safe = resolved && isSafeHttpUrl(resolved) && !isGoogleNewsUrl(resolved) ? resolved : null;
    cacheSet(url, safe);
    return safe;
  } catch {
    cacheSet(url, null);
    return null;
  }
}
