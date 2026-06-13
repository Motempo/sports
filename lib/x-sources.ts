export interface XSource {
  id: string;
  handle: string;
  name: string;
  verified: boolean;
  category: "news" | "facts";
  rssUrl?: string;
  profileUrl: string;
  avatarUrl: string;
}

export const X_SOURCES: XSource[] = [
  {
    id: "fifa",
    handle: "FIFAcom",
    name: "FIFA World Cup",
    verified: true,
    category: "news",
    rssUrl: "https://www.fifa.com/rss-feeds/news",
    profileUrl: "https://x.com/FIFAcom",
    avatarUrl: "https://unavatar.io/x/FIFAcom",
  },
  {
    id: "bbc",
    handle: "BBCSport",
    name: "BBC Sport",
    verified: true,
    category: "news",
    rssUrl: "http://newsrss.bbc.co.uk/rss/sportonline_uk_edition/football/rss.xml",
    profileUrl: "https://x.com/BBCSport",
    avatarUrl: "https://unavatar.io/x/BBCSport",
  },
  {
    id: "guardian",
    handle: "guardian_sport",
    name: "Guardian sport",
    verified: true,
    category: "news",
    rssUrl: "https://www.theguardian.com/football/world-cup-2026/rss",
    profileUrl: "https://x.com/guardian_sport",
    avatarUrl: "https://unavatar.io/x/guardian_sport",
  },
  {
    id: "opta",
    handle: "OptaJoe",
    name: "OptaJoe",
    verified: true,
    category: "facts",
    profileUrl: "https://x.com/OptaJoe",
    avatarUrl: "https://unavatar.io/x/OptaJoe",
  },
  {
    id: "skysports",
    handle: "SkySports",
    name: "Sky Sports",
    verified: true,
    category: "news",
    rssUrl: "https://www.skysports.com/rss/12040",
    profileUrl: "https://x.com/SkySports",
    avatarUrl: "https://unavatar.io/x/SkySports",
  },
  {
    id: "telegraph",
    handle: "TeleFootball",
    name: "Telegraph Football",
    verified: true,
    category: "news",
    profileUrl: "https://x.com/TeleFootball",
    avatarUrl: "https://unavatar.io/x/TeleFootball",
  },
];

export const NEWS_SOURCES = X_SOURCES.filter((s) => s.category === "news");
export const FACT_SOURCES = X_SOURCES.filter((s) => s.category === "facts");

export function getSourceByHandle(handle: string): XSource | undefined {
  return X_SOURCES.find((s) => s.handle.toLowerCase() === handle.toLowerCase());
}

export function getXAvatar(handle: string): string {
  return `https://unavatar.io/x/${handle}`;
}
