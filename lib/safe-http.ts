import { lookup } from "node:dns/promises";
import { scrapeMediaFromHtml, type NewsMedia } from "@/lib/news-media";
import { isBlockedIpAddress, isIpAddress, isSafeHttpUrl, normalizeHost } from "@/lib/safe-url";

/** Redirects followed after the first response. The next hop is not requested. */
export const MAX_SAFE_REDIRECTS = 5;

export type HostResolver = (hostname: string) => Promise<readonly string[]>;

export interface SafeHttpDeps {
  fetchImpl?: typeof fetch;
  resolveHost?: HostResolver;
}

export class UnsafeHttpUrlError extends Error {
  constructor(message = "Refused to fetch a non-public URL") {
    super(message);
    this.name = "UnsafeHttpUrlError";
  }
}

export async function resolveHostAddresses(hostname: string): Promise<readonly string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

/**
 * `isSafeHttpUrl` plus a DNS check. Any loopback, private, link-local,
 * metadata, unique-local, or IPv4-mapped address fails closed. Lookup errors
 * fail closed so a missing record cannot be treated as public.
 */
export async function isPublicHttpUrl(
  raw: string,
  resolveHost: HostResolver = resolveHostAddresses
): Promise<boolean> {
  if (!isSafeHttpUrl(raw)) return false;
  let host: string;
  try {
    host = normalizeHost(new URL(raw).hostname);
  } catch {
    return false;
  }
  if (isIpAddress(host)) return !isBlockedIpAddress(host);
  try {
    const addresses = await resolveHost(host);
    if (addresses.length === 0) return false;
    return addresses.every((address) => isIpAddress(address) && !isBlockedIpAddress(address));
  } catch {
    return false;
  }
}

function isRedirect(response: Response): boolean {
  return response.status >= 300 && response.status < 400;
}

async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The redirect body is unused.
  }
}

/**
 * Fetch with `redirect: "manual"`. Every hop, including the first URL, must
 * pass `isPublicHttpUrl` before a request is sent.
 */
export async function fetchPublicHttp(
  rawUrl: string,
  init: RequestInit = {},
  deps: SafeHttpDeps = {}
): Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const resolveHost = deps.resolveHost ?? resolveHostAddresses;
  let current = rawUrl;

  for (let redirectCount = 0; ; redirectCount += 1) {
    if (!(await isPublicHttpUrl(current, resolveHost))) {
      throw new UnsafeHttpUrlError();
    }
    const response = await fetchImpl(current, { ...init, redirect: "manual" });
    if (!isRedirect(response)) return response;

    const location = response.headers.get("location");
    await discardBody(response);
    if (!location || redirectCount >= MAX_SAFE_REDIRECTS) {
      throw new UnsafeHttpUrlError("Too many redirects");
    }
    try {
      current = new URL(location, current).href;
    } catch {
      throw new UnsafeHttpUrlError();
    }
  }
}

/**
 * GET an article page and parse Open Graph / Twitter media.
 * Returns null when the URL is refused, the response is not OK, or the fetch fails.
 * An empty object means the page loaded and had no image or video.
 */
export async function readPublicArticleMedia(
  url: string,
  init: RequestInit = {},
  deps: SafeHttpDeps = {}
): Promise<NewsMedia | null> {
  try {
    const response = await fetchPublicHttp(url, init, deps);
    if (!response.ok) {
      await discardBody(response);
      return null;
    }
    return scrapeMediaFromHtml(await response.text());
  } catch {
    return null;
  }
}
