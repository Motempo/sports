import type { MatchInfo } from "@/lib/types";

export interface MatchWatchLink {
  label: string;
  href: string;
  hint: string;
}

function buildWatchQuery(match: MatchInfo): string {
  const home = match.homeTeam.name.trim();
  const away = match.awayTeam.name.trim();
  return `2026 FIFA World Cup ${home} vs ${away}`;
}

/**
 * U.S. English coverage is on Fox / FS1. YouTube TV carries those channels;
 * Prime Video offers Fox One as an add-on with full tournament access.
 */
export function getMatchWatchLinks(match: MatchInfo): MatchWatchLink[] {
  const query = buildWatchQuery(match);

  return [
    {
      label: "YouTube TV",
      hint: "Fox · FS1",
      href: `https://tv.youtube.com/search?q=${encodeURIComponent(query)}`,
    },
    {
      label: "Prime Video",
      hint: "Fox One",
      href: `https://www.amazon.com/gp/video/search?phrase=${encodeURIComponent(query)}`,
    },
  ];
}
