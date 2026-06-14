import { XMLParser } from "fast-xml-parser";
import {
  getNewsFeedSources,
  getNewsKeywordPattern,
  getSourceByHandle,
  getSourceRank,
  matchOutletToHandle,
  type ResolvedSportSource,
} from "@/lib/sport-sources";
import type { NewsItem } from "@/lib/types";

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string };
  "media:content"?: { "@_url"?: string };
  "media:thumbnail"?: { "@_url"?: string };
  enclosure?: { "@_url"?: string };
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

function parseRssItems(
  feedXml: unknown,
  source: ResolvedSportSource & { googleNews?: boolean },
  sportSlug: string,
  keywordPattern: RegExp
): NewsItem[] {
  const channel = (feedXml as { rss?: { channel?: { item?: RssItem | RssItem[] } } })?.rss?.channel;
  if (!channel?.item) return [];

  const items = Array.isArray(channel.item) ? channel.item : [channel.item];

  return items
    .filter((item) => {
      const text = `${item.title ?? ""} ${item.description ?? ""}`;
      return keywordPattern.test(text);
    })
    .map((item, i) => {
      const summary = stripHtml(item.description ?? "").slice(0, 280);
      const imageUrl =
        item["media:content"]?.["@_url"] ??
        item["media:thumbnail"]?.["@_url"] ??
        item.enclosure?.["@_url"] ??
        undefined;

      let handle = source.handle;
      let name = source.name;
      let avatar = source.avatarUrl;
      let profileUrl = source.profileUrl;
      let verified = source.verified;

      if (source.googleNews) {
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
        id: `${sportSlug}-${handle}-${i}-${item.link ?? item.title}`,
        title: stripHtml(item.title ?? "Untitled"),
        summary: summary || stripHtml(item.title ?? ""),
        source: name,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: item.link ?? profileUrl,
        imageUrl,
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
      next: { revalidate: 1800 },
      headers: { "User-Agent": "Sports-by-Motempo/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    return parseRssItems(parser.parse(xml), source, sportSlug, keywordPattern);
  } catch {
    return [];
  }
}

/** Interleave items by source rank so the feed surfaces official and major media, not one outlet. */
function sortNewsByAuthority(items: NewsItem[], sportSlug: string): NewsItem[] {
  const queues = new Map<string, NewsItem[]>();

  for (const item of items) {
    const list = queues.get(item.xHandle) ?? [];
    list.push(item);
    queues.set(item.xHandle, list);
  }

  for (const list of queues.values()) {
    list.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  const handles = [...queues.keys()].sort(
    (a, b) => getSourceRank(sportSlug, a) - getSourceRank(sportSlug, b)
  );

  const sorted: NewsItem[] = [];
  let hasItems = true;
  while (hasItems) {
    hasItems = false;
    for (const handle of handles) {
      const queue = queues.get(handle);
      if (queue?.length) {
        sorted.push(queue.shift()!);
        hasItems = true;
      }
    }
  }

  return sorted;
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

  return sortNewsByAuthority(deduped, sportSlug);
}

export async function enrichNewsItem(item: NewsItem): Promise<NewsItem> {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey || item.xHandle !== "guardian_sport") return item;

  try {
    const q = encodeURIComponent(item.title.slice(0, 80));
    const res = await fetch(
      `https://content.guardianapis.com/search?q=${q}&section=football&show-fields=thumbnail,trailText&api-key=${apiKey}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return item;
    const data = (await res.json()) as {
      response?: {
        results?: Array<{
          webUrl: string;
          fields?: { thumbnail?: string; trailText?: string };
        }>;
      };
    };
    const result = data.response?.results?.[0];
    if (!result) return item;

    return {
      ...item,
      summary: result.fields?.trailText ?? item.summary,
      imageUrl: result.fields?.thumbnail ?? item.imageUrl,
      url: result.webUrl ?? item.url,
    };
  } catch {
    return item;
  }
}
