import type { Metadata, MetadataRoute } from "next";

const SITE_URL = "https://sports.motempo.com";
const SITE_NAME = "Sports by Motempo";

/** Change this to switch which sport loads at sports.motempo.com */
export const CURRENT_SPORT_SLUG = "world-cup";

export interface SportConfig {
  id: string;
  slug: string;
  label: string;
  available: boolean;
  title: string;
  description: string;
  keywords: string[];
}

export const SPORTS: SportConfig[] = [
  {
    id: "world-cup",
    slug: "world-cup",
    label: "FIFA World Cup",
    available: true,
    title: "FIFA World Cup 2026 — Bracket, Standings & News",
    description:
      "Track the FIFA World Cup 2026 with live group standings, knockout bracket, today's matches, news, and fun facts. 48 teams, 12 groups, USA · Canada · Mexico.",
    keywords: [
      "FIFA World Cup 2026",
      "World Cup bracket",
      "World Cup standings",
      "World Cup scores",
      "World Cup schedule",
      "soccer",
      "football",
    ],
  },
  {
    id: "formula-1",
    slug: "formula-1",
    label: "Formula 1",
    available: true,
    title: "Formula 1 2026 — Standings, Race Calendar & News",
    description:
      "Track the Formula 1 2026 season with driver and constructor standings, race calendar, this weekend's sessions, news, and fun facts. Family-friendly F1 companion.",
    keywords: [
      "Formula 1 2026",
      "F1 standings",
      "F1 schedule",
      "F1 race calendar",
      "Grand Prix",
      "F1 news",
    ],
  },
];

export function getSportBySlug(slug: string): SportConfig | undefined {
  return SPORTS.find((s) => s.slug === slug);
}

export function getCurrentSport(): SportConfig {
  return getSportBySlug(CURRENT_SPORT_SLUG) ?? SPORTS[0];
}

export function buildSportMetadata(sport: SportConfig): Metadata {
  const url = `${SITE_URL}/${sport.slug}`;

  return {
    title: {
      absolute: `${sport.title} | ${SITE_NAME}`,
    },
    description: sport.description,
    keywords: sport.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: sport.title,
      description: sport.description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: sport.title,
      description: sport.description,
    },
  };
}

export function getSportSitemapEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  return SPORTS.filter((s) => s.available).map((sport) => ({
    url: `${SITE_URL}/${sport.slug}`,
    lastModified: now,
    changeFrequency: sport.slug === CURRENT_SPORT_SLUG ? "hourly" : "weekly",
    priority: sport.slug === CURRENT_SPORT_SLUG ? 1 : 0.8,
  }));
}

export { SITE_NAME, SITE_URL };
