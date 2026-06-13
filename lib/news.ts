import { XMLParser } from "fast-xml-parser";
import { NEWS_SOURCES, type XSource } from "@/lib/x-sources";
import type { NewsItem } from "@/lib/types";

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  "media:content"?: { "@_url"?: string };
  "media:thumbnail"?: { "@_url"?: string };
  enclosure?: { "@_url"?: string };
}

const WORLD_CUP_KEYWORDS = /world cup|fifa|2026|football|soccer|international/i;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseItems(feedXml: unknown, source: XSource): NewsItem[] {
  const channel = (feedXml as { rss?: { channel?: { item?: RssItem | RssItem[] } } })?.rss?.channel;
  if (!channel?.item) return [];

  const items = Array.isArray(channel.item) ? channel.item : [channel.item];

  return items
    .filter((item) => {
      const text = `${item.title ?? ""} ${item.description ?? ""}`;
      return WORLD_CUP_KEYWORDS.test(text);
    })
    .map((item, i) => {
      const summary = stripHtml(item.description ?? "").slice(0, 280);
      const imageUrl =
        item["media:content"]?.["@_url"] ??
        item["media:thumbnail"]?.["@_url"] ??
        item.enclosure?.["@_url"] ??
        undefined;

      return {
        id: `${source.handle}-${i}-${item.link ?? item.title}`,
        title: stripHtml(item.title ?? "Untitled"),
        summary: summary || stripHtml(item.title ?? ""),
        source: source.name,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: item.link ?? source.profileUrl,
        imageUrl,
        xHandle: source.handle,
        xName: source.name,
        xAvatar: source.avatarUrl,
        xProfileUrl: source.profileUrl,
        verified: source.verified,
      };
    });
}

async function fetchSourceFeed(source: XSource): Promise<NewsItem[]> {
  if (!source.rssUrl) return [];

  try {
    const res = await fetch(source.rssUrl, {
      next: { revalidate: 1800 },
      headers: { "User-Agent": "Sports-by-Motempo/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    return parseItems(parser.parse(xml), source);
  } catch {
    return [];
  }
}

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const results = await Promise.all(NEWS_SOURCES.map(fetchSourceFeed));
  const all = results.flat();

  return all
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item, idx, arr) => arr.findIndex((x) => x.title === item.title) === idx);
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
