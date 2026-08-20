import { XMLParser } from "fast-xml-parser";
import { uncachedFetch } from "@/lib/fetch-options";
import { resolveGoogleNewsUrl } from "@/lib/google-news";
import {
  extractRssMedia,
  isGoogleNewsUrl,
  isSafeHttpUrl,
  scrapeMediaFromHtml,
  youtubeThumbnailUrl,
  youtubeVideoId,
  type NewsMedia,
} from "@/lib/news-media";
import {
  getNewsFeedSources,
  getNewsKeywordPattern,
  getSourceByHandle,
  interleavePersonOrgMix,
  isPersonSource,
  matchOutletToHandle,
  type ResolvedSportSource,
} from "@/lib/sport-sources";
import type { NewsItem } from "@/lib/types";

const USER_AGENT = "Mozilla/5.0 (compatible; Sports-by-Motempo/1.0; +https://sports.motempo.com)";
const OG_TIMEOUT_MS = 8000;
const OG_CACHE_TTL_MS = 30 * 60 * 1000;

const ogCache = new Map<string, { value: NewsMedia; expiresAt: number }>();

interface RssItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  published?: unknown;
  updated?: unknown;
  description?: unknown;
  summary?: unknown;
  "content:encoded"?: unknown;
  content?: unknown;
  source?: string | { "#text"?: string };
  "media:content"?: unknown;
  "media:thumbnail"?: unknown;
  enclosure?: unknown;
  guid?: unknown;
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return textOf(value[0]);
  if (value && typeof value === "object" && "#text" in value) {
    const text = (value as { "#text"?: unknown })["#text"];
    return typeof text === "string" ? text : "";
  }
  return "";
}

function linkOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return linkOf(value[0]);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["@_href"] === "string") return record["@_href"].trim();
    if (typeof record.href === "string") return record.href.trim();
    if (typeof record["#text"] === "string") return record["#text"].trim();
  }
  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseOutletName(source: RssItem["source"]): string | undefined {
  if (!source) return undefined;
  if (typeof source === "string") return source;
  return source["#text"];
}

function feedItems(feedXml: unknown): RssItem[] {
  const rss = feedXml as { rss?: { channel?: { item?: RssItem | RssItem[] } } };
  const rssItems = rss.rss?.channel?.item;
  if (rssItems) return Array.isArray(rssItems) ? rssItems : [rssItems];

  const atom = feedXml as { feed?: { entry?: RssItem | RssItem[] } };
  const atomItems = atom.feed?.entry;
  if (atomItems) return Array.isArray(atomItems) ? atomItems : [atomItems];

  return [];
}

function parseRssItems(
  feedXml: unknown,
  source: ResolvedSportSource & { googleNews?: boolean },
  sportSlug: string,
  keywordPattern: RegExp
): NewsItem[] {
  const items = feedItems(feedXml);

  return items
    .filter((item) => {
      const text = `${textOf(item.title)} ${textOf(item.description)} ${textOf(item.summary)}`;
      return keywordPattern.test(text);
    })
    .map((item, i) => {
      const title = stripHtml(textOf(item.title) || "Untitled");
      const summary = stripHtml(textOf(item.description) || textOf(item.summary) || textOf(item["content:encoded"])).slice(
        0,
        280
      );
      const url = linkOf(item.link) || source.profileUrl;
      const media = extractRssMedia(item);
      const publishedRaw = textOf(item.pubDate) || textOf(item.published) || textOf(item.updated);

      let handle = source.handle;
      let name = source.name;
      let avatar = source.avatarUrl;
      let profileUrl = source.profileUrl;
      let verified = source.verified;

      if (source.googleNews && !isPersonSource(sportSlug, source.handle)) {
        const outlet = parseOutletName(item.source);
        if (outlet) {
          const matched = matchOutletToHandle(sportSlug, outlet);
          if (matched) {
            const resolved = getSourceByHandle(sportSlug, matched);
            if (resolved) {
              handle = resolved.handle;
              name = resolved.name;
              avatar = resolved.avatarUrl;
              profileUrl = resolved.profileUrl;
              verified = resolved.verified;
            }
          }
        }
      }

      return {
        id: `${sportSlug}-${handle}-${i}-${url || title}`,
        title,
        summary: summary || title,
        source: name,
        publishedAt: publishedRaw ? new Date(publishedRaw).toISOString() : new Date().toISOString(),
        url,
        imageUrl: media.imageUrl,
        videoUrl: media.videoUrl,
        videoKind: media.videoKind,
        xHandle: handle,
        xName: name,
        xAvatar: avatar,
        xProfileUrl: profileUrl,
        verified,
      };
    });
}

async function fetchSourceFeed(
  source: ResolvedSportSource & { googleNews?: boolean },
  sportSlug: string,
  keywordPattern: RegExp
): Promise<NewsItem[]> {
  if (!source.rssUrl) return [];

  try {
    const res = await fetch(source.rssUrl, {
      ...uncachedFetch,
      headers: { "User-Agent": "Sports-by-Motempo/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    return parseRssItems(parser.parse(xml), source, sportSlug, keywordPattern);
  } catch {
    return [];
  }
}

export async function fetchNewsItems(sportSlug: string): Promise<NewsItem[]> {
  const sources = getNewsFeedSources(sportSlug);
  const keywordPattern = getNewsKeywordPattern(sportSlug);
  const results = await Promise.all(
    sources.map((source) => fetchSourceFeed(source, sportSlug, keywordPattern))
  );
  const all = results.flat();

  const deduped = all
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item, idx, arr) => arr.findIndex((x) => x.title === item.title) === idx);

  return interleavePersonOrgMix(deduped, sportSlug, (item) => item.xHandle);
}

function ogCacheGet(url: string): NewsMedia | undefined {
  const hit = ogCache.get(url);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    ogCache.delete(url);
    return undefined;
  }
  return hit.value;
}

function ogCacheSet(url: string, value: NewsMedia) {
  if (ogCache.size > 200) {
    const first = ogCache.keys().next().value;
    if (first) ogCache.delete(first);
  }
  ogCache.set(url, { value, expiresAt: Date.now() + OG_CACHE_TTL_MS });
}

function canonicalArticleUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.replace(/^www\./, "");
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

const publisherFeedCache = new Map<string, { items: RssItem[]; expiresAt: number }>();

async function fetchPublisherFeedItems(origin: string): Promise<RssItem[]> {
  const cached = publisherFeedCache.get(origin);
  if (cached && Date.now() < cached.expiresAt) return cached.items;

  const paths = ["/feed", "/rss.xml", "/rss", "/feed.xml"];
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

  for (const path of paths) {
    try {
      const res = await fetch(`${origin}${path}`, {
        cache: "no-store",
        headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(OG_TIMEOUT_MS),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const xml = await res.text();
      if (!/<rss[\s>]|<feed[\s>]/i.test(xml)) continue;
      const items = feedItems(parser.parse(xml));
      if (items.length === 0) continue;
      publisherFeedCache.set(origin, { items, expiresAt: Date.now() + OG_CACHE_TTL_MS });
      return items;
    } catch {
      continue;
    }
  }

  publisherFeedCache.set(origin, { items: [], expiresAt: Date.now() + 5 * 60 * 1000 });
  return [];
}

async function lookupPublisherFeedMedia(articleUrl: string): Promise<NewsMedia> {
  if (!isSafeHttpUrl(articleUrl) || isGoogleNewsUrl(articleUrl)) return {};
  let origin: string;
  try {
    origin = new URL(articleUrl).origin;
  } catch {
    return {};
  }

  const target = canonicalArticleUrl(articleUrl);
  if (!target) return {};

  const items = await fetchPublisherFeedItems(origin);
  for (const item of items) {
    const candidates = [linkOf(item.link), textOf(item.guid)];
    if (candidates.some((candidate) => candidate && canonicalArticleUrl(candidate) === target)) {
      return extractRssMedia(item);
    }
  }
  return {};
}

async function scrapeArticleMedia(url: string): Promise<NewsMedia> {
  const cached = ogCacheGet(url);
  if (cached) return cached;
  if (!isSafeHttpUrl(url) || isGoogleNewsUrl(url)) return {};

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(OG_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      return {};
    }
    const html = await res.text();
    const media = scrapeMediaFromHtml(html);
    ogCacheSet(url, media);
    return media;
  } catch {
    return {};
  }
}

export interface EnrichNewsOptions {
  /** Also scrape the publisher page when an RSS image already exists, looking for a video. */
  includeVideo?: boolean;
}

async function enrichNewsItem(item: NewsItem, options: EnrichNewsOptions): Promise<NewsItem> {
  const resolvedUrl = isGoogleNewsUrl(item.url)
    ? ((await resolveGoogleNewsUrl(item.url)) ?? item.url)
    : item.url;

  const needsScrape =
    isSafeHttpUrl(resolvedUrl) &&
    !isGoogleNewsUrl(resolvedUrl) &&
    (!item.imageUrl || (options.includeVideo && !item.videoUrl));

  const scraped = needsScrape ? await scrapeArticleMedia(resolvedUrl) : {};
  const feedMedia =
    needsScrape && !scraped.imageUrl && !scraped.videoUrl
      ? await lookupPublisherFeedMedia(resolvedUrl)
      : {};
  const videoUrl = item.videoUrl ?? scraped.videoUrl ?? feedMedia.videoUrl;
  const videoKind = item.videoKind ?? scraped.videoKind ?? feedMedia.videoKind;
  let imageUrl = item.imageUrl ?? scraped.imageUrl ?? feedMedia.imageUrl;
  if (!imageUrl && videoKind === "youtube" && videoUrl) {
    const id = youtubeVideoId(videoUrl);
    if (id) imageUrl = youtubeThumbnailUrl(id);
  }

  return {
    ...item,
    url: resolvedUrl,
    imageUrl,
    videoUrl,
    videoKind,
  };
}

/** Attach publisher URLs plus Open Graph image/video for a page of news items. */
export async function enrichNewsItems(
  items: NewsItem[],
  options: EnrichNewsOptions = {}
): Promise<NewsItem[]> {
  return Promise.all(items.map((item) => enrichNewsItem(item, options)));
}
