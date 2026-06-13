import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "@/lib/types";

const RSS_FEEDS = [
  {
    url: "https://news.google.com/rss/search?q=world+cup+2026+football&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
  },
  {
    url: "https://www.theguardian.com/football/world-cup-2026/rss",
    source: "The Guardian",
  },
  {
    url: "http://newsrss.bbc.co.uk/rss/sportonline_uk_edition/football/rss.xml",
    source: "BBC Sport",
  },
];

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  "media:content"?: { "@_url"?: string };
  enclosure?: { "@_url"?: string };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function parseItems(feedXml: unknown, source: string): NewsItem[] {
  const channel = (feedXml as { rss?: { channel?: { item?: RssItem | RssItem[] } } })?.rss?.channel;
  if (!channel?.item) return [];

  const items = Array.isArray(channel.item) ? channel.item : [channel.item];
  const keywords = /world cup|fifa|2026|football|soccer/i;

  return items
    .filter((item) => keywords.test(item.title ?? "") || keywords.test(item.description ?? ""))
    .map((item, i) => {
      const summary = stripHtml(item.description ?? "").slice(0, 200);
      const imageUrl =
        item["media:content"]?.["@_url"] ?? item.enclosure?.["@_url"] ?? undefined;

      return {
        id: `${source}-${i}-${item.link ?? item.title}`,
        title: stripHtml(item.title ?? "Untitled"),
        summary: summary || stripHtml(item.title ?? ""),
        source,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: item.link ?? "#",
        imageUrl,
      };
    });
}

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const all: NewsItem[] = [];

  await Promise.all(
    RSS_FEEDS.map(async ({ url, source }) => {
      try {
        const res = await fetch(url, { next: { revalidate: 1800 } });
        if (!res.ok) return;
        const xml = await res.text();
        const parsed = parser.parse(xml);
        all.push(...parseItems(parsed, source));
      } catch {
        // skip failed feed
      }
    })
  );

  return all
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item, idx, arr) => arr.findIndex((x) => x.title === item.title) === idx);
}

export async function enrichNewsItem(item: NewsItem): Promise<NewsItem> {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) return item;

  try {
    const q = encodeURIComponent(item.title.slice(0, 80));
    const res = await fetch(
      `https://content.guardianapis.com/search?q=${q}&section=football&show-fields=thumbnail,trailText,body&api-key=${apiKey}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return item;
    const data = (await res.json()) as {
      response?: {
        results?: Array<{
          webUrl: string;
          fields?: { thumbnail?: string; trailText?: string; body?: string };
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
