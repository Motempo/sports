import "server-only";

import { uncachedFetch } from "@/lib/fetch-options";
import type { MatchInfo, VenueImage } from "@/lib/types";

export type VenueImageKind = "circuit" | "stadium";

export type { VenueImage };

const USER_AGENT = "Sports-by-Motempo/1.0 (https://sports.motempo.com)";
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const cache = new Map<string, { value: VenueImage | null; expiresAt: number }>();

function cacheGet(key: string): VenueImage | null | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key: string, value: VenueImage | null) {
  if (cache.size > 200) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function wikiJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    ...uncachedFetch,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return res.json();
}

function absoluteWikiUrl(src: string): string {
  if (src.startsWith("//")) return `https:${src}`;
  return src;
}

function stripTracking(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

interface WikiSummary {
  type?: string;
  title?: string;
  originalimage?: { source?: string };
  thumbnail?: { source?: string };
}

async function wikipediaSummary(title: string): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const data = (await wikiJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`)) as WikiSummary | null;
  if (!data?.title || data.type === "disambiguation") return null;
  return data;
}

async function wikipediaSearch(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5",
    format: "json",
    utf8: "1",
  });
  const data = (await wikiJson(`https://en.wikipedia.org/w/api.php?${params.toString()}`)) as {
    query?: { search?: Array<{ title?: string }> };
  } | null;
  const hits = data?.query?.search ?? [];
  for (const hit of hits) {
    const title = hit.title?.trim();
    if (!title) continue;
    if (/list of|disambiguation/i.test(title)) continue;
    return title;
  }
  return null;
}

interface MediaItem {
  title?: string;
  type?: string;
  leadImage?: boolean;
  srcset?: Array<{ src?: string; scale?: string }>;
}

function fileScore(fileTitle: string, kind: VenueImageKind, lead: boolean): number {
  const name = fileTitle.toLowerCase();
  if (/logo|wordmark|coat_of_arms|flag|icon|pictogram/.test(name)) return -100;

  let score = lead ? 10 : 0;

  if (kind === "circuit") {
    // MOT-49: prefer official-style track schematics / layout maps, not race photography.
    const isHistoricalLayout = /19(4|5|6|7|8|9)\d|vs_19|compared|evolution/.test(name);
    const isSchematic =
      /circuit\.(png|svg)$/.test(name) ||
      (/circuit|track|layout|map|diagram|schematic|plan/.test(name) &&
        (name.endsWith(".svg") || name.endsWith(".png")));

    if (isHistoricalLayout) score -= 35;
    if (isSchematic) score += 50;
    if (name.endsWith(".svg") && /circuit|track|layout|map/.test(name) && !isHistoricalLayout) {
      score += 20;
    }
    if (lead && isSchematic) score += 15;

    // Demote photos of cars / crowds / aerial scenery.
    if (/motorsport|race_track|grandstand|pit_lane|paddock|start_|dtm_|bestanddeelnr/.test(name)) {
      score -= 30;
    }
    if (/aerial|from_air|air_|drone|satellite/.test(name)) score -= 25;
    if (/\.jpe?g/.test(name) && !isSchematic) score -= 10;
    if (/circuit|track|zandvoort|suzuka|monza|spa|silverstone/.test(name)) score += 6;
  } else {
    if (name.endsWith(".svg")) return -80;
    if (/\.jpe?g/.test(name)) score += 18;
    if (name.endsWith(".png")) score += 8;
    if (/aerial|panorama|stadium|estadio/.test(name)) score += 16;
  }
  return score;
}

function bestSrcsetUrl(item: MediaItem): string | undefined {
  const set = item.srcset ?? [];
  const ranked = [...set].sort((a, b) => {
    const aw = Number.parseInt(a.src?.match(/\/(\d+)px-/)?.[1] ?? "0", 10);
    const bw = Number.parseInt(b.src?.match(/\/(\d+)px-/)?.[1] ?? "0", 10);
    return bw - aw;
  });
  const src = ranked[0]?.src;
  return src ? stripTracking(absoluteWikiUrl(src)) : undefined;
}

async function fileOriginalUrl(fileTitle: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "1600",
    format: "json",
  });
  const data = (await wikiJson(`https://en.wikipedia.org/w/api.php?${params.toString()}`)) as {
    query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string }> }> };
  } | null;
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  if (info.mime?.includes("svg")) return info.thumburl ? stripTracking(info.thumburl) : null;
  return stripTracking(info.thumburl || info.url || "");
}

async function pickPhotoUrl(wikiTitle: string, kind: VenueImageKind): Promise<string | null> {
  const encoded = encodeURIComponent(wikiTitle.replace(/ /g, "_"));
  const media = (await wikiJson(`https://en.wikipedia.org/api/rest_v1/page/media-list/${encoded}`)) as {
    items?: MediaItem[];
  } | null;
  const images = (media?.items ?? []).filter((item) => item.type === "image" && item.title);

  const ranked = images
    .map((item) => ({ item, score: fileScore(item.title ?? "", kind, Boolean(item.leadImage)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { item } of ranked.slice(0, 8)) {
    // Circuit schematics are often SVG — use rendered thumbnails.
    if (kind === "circuit" && item.title) {
      const original = await fileOriginalUrl(item.title);
      if (original) return original;
    }
    const fromSet = bestSrcsetUrl(item);
    if (fromSet) {
      if (kind === "circuit" || !fromSet.toLowerCase().includes(".svg")) return fromSet;
    }
    if (item.title) {
      const original = await fileOriginalUrl(item.title);
      if (original) return original;
    }
  }
  return null;
}

function searchQuery(kind: VenueImageKind, name: string, hint?: string): string[] {
  const trimmed = name.trim();
  if (kind === "circuit") {
    return [
      `${trimmed} circuit map`,
      `${trimmed} Grand Prix circuit layout`,
      `${trimmed} racing circuit`,
      trimmed,
    ];
  }
  const stadiumish = /stadium|estadio|arena|ground|park|field/i.test(trimmed);
  const queries = stadiumish ? [trimmed] : [`${trimmed} football stadium`, `${trimmed} stadium`];
  if (hint?.trim()) queries.unshift(`${trimmed} ${hint.trim()} stadium`);
  return queries;
}

/**
 * Photograph of a race circuit or football stadium from Wikipedia / Wikimedia Commons.
 */
export async function resolveVenueImage(input: {
  kind: VenueImageKind;
  name: string;
  hint?: string;
}): Promise<VenueImage | null> {
  const name = input.name.trim();
  if (!name || name.toUpperCase() === "TBD") return null;

  const cacheKey = `${input.kind}:${name.toLowerCase()}:${(input.hint ?? "").toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  try {
    let wikiTitle: string | null = null;
    const direct = await wikipediaSummary(name);
    if (direct?.title) wikiTitle = direct.title;

    if (!wikiTitle) {
      for (const query of searchQuery(input.kind, name, input.hint)) {
        wikiTitle = await wikipediaSearch(query);
        if (wikiTitle) break;
      }
    }

    if (!wikiTitle) {
      cacheSet(cacheKey, null);
      return null;
    }

    const url = (await pickPhotoUrl(wikiTitle, input.kind)) ?? null;
    const value = url ? { url, alt: wikiTitle } : null;
    cacheSet(cacheKey, value);
    return value;
  } catch {
    cacheSet(cacheKey, null);
    return null;
  }
}

function isMissingName(name?: string | null): boolean {
  const trimmed = name?.trim();
  return !trimmed || trimmed.toUpperCase() === "TBD";
}

export async function resolveMatchVenueImage(match: MatchInfo | null): Promise<VenueImage | null> {
  if (!match) return null;
  const venue = match.venue?.trim();
  if (!isMissingName(venue)) {
    return resolveVenueImage({
      kind: "stadium",
      name: venue!.includes(",") ? venue!.split(",")[0]!.trim() : venue!,
      hint: match.city?.trim() || match.homeTeam.name,
    });
  }
  return resolveVenueImage({
    kind: "stadium",
    name: match.homeTeam.name,
    hint: "football",
  });
}
