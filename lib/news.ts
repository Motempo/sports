import { XMLParser } from "fast-xml-parser";
import { uncachedFetch } from "@/lib/fetch-options";
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
      ...uncachedFetch,
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
