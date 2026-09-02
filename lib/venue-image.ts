import "server-only";

import fs from "node:fs";
import path from "node:path";

import curatedAerials from "@/data/venue-aerial-images.json";
import { uncachedFetch } from "@/lib/fetch-options";
import type { MatchInfo, VenueImage } from "@/lib/types";

export type VenueImageKind = "circuit" | "stadium";

export type { VenueImage };

const USER_AGENT = "Sports-by-Motempo/1.0 (https://sports.motempo.com)";
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const cache = new Map<string, { value: VenueImage | null; expiresAt: number }>();

type CuratedVenueImage = { url: string; alt: string };

/** Wikipedia page titles that reliably host aerial photography for each circuit. */
const CIRCUIT_WIKI_PAGES: Record<string, string> = {
  "albert park grand prix circuit": "Albert Park Circuit",
  "shanghai international circuit": "Shanghai International Circuit",
  "suzuka circuit": "Suzuka International Racing Course",
  "miami international autodrome": "Miami International Autodrome",
  "circuit gilles villeneuve": "Circuit Gilles Villeneuve",
  "circuit de monaco": "Circuit de Monaco",
  "circuit de barcelona-catalunya": "Circuit de Barcelona-Catalunya",
  "red bull ring": "Red Bull Ring",
  "silverstone circuit": "Silverstone Circuit",
  "circuit de spa-francorchamps": "Circuit de Spa-Francorchamps",
  hungaroring: "Hungaroring",
  "circuit park zandvoort": "Circuit Zandvoort",
  "autodromo nazionale di monza": "Monza Circuit",
  madring: "IFEMA Madrid",
  "baku city circuit": "Baku City Circuit",
  "marina bay street circuit": "Marina Bay Street Circuit",
  "circuit of the americas": "Circuit of the Americas",
  "autódromo hermanos rodríguez": "Autódromo Hermanos Rodríguez",
  "autodromo hermanos rodriguez": "Autódromo Hermanos Rodríguez",
  "autódromo josé carlos pace": "Autódromo José Carlos Pace",
  "autodromo jose carlos pace": "Autódromo José Carlos Pace",
  "las vegas strip street circuit": "Las Vegas Strip Circuit",
  "losail international circuit": "Losail International Circuit",
  "yas marina circuit": "Yas Marina Circuit",
};

function normalizeVenueKey(name: string): string {
  return name.trim().toLowerCase();
}

function venueSlug(name: string): string {
  return normalizeVenueKey(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
  const data = (await wikiJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
  )) as WikiSummary | null;
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
  if (/logo|wordmark|coat_of_arms|flag|icon|pictogram|seal/.test(name)) return -100;

  let score = lead ? 8 : 0;

  const isAerial =
    /aerial|from_air|from.the.air|from_the_air|air_view|airview|drone|satellite|overview|bird.?s.?eye|helicopter|oblique|panorama|skysat|planetlabs|google.?earth/.test(
      name
    );
  const isSchematic =
    /circuit\.(png|svg)$/.test(name) ||
    (/circuit|track|layout|map|diagram|schematic|plan/.test(name) &&
      (name.endsWith(".svg") || name.endsWith(".png")));
  const isGroundLevel =
    /startfinish|start_finish|epingle|salut-gilles|grandstand|pit_lane|paddock|tunnel|tribune/.test(name);

  if (isAerial) score += 70;
  if (/skysat|satellite/.test(name)) score += 25;
  if (isGroundLevel && !isAerial) score -= 45;
  if (/\.jpe?g/.test(name)) score += 12;
  if (name.endsWith(".png") && !isSchematic) score += 6;

  if (kind === "circuit") {
    if (isSchematic) score -= 55;
    if (/grandstand|pit_lane|paddock|start_|motorsport|race_track|crowd|podium/.test(name)) {
      score -= 25;
    }
    if (/circuit|track|speedway|raceway|autodrom|autodrome|ring|zandvoort|monza|silverstone|spa/.test(name)) {
      score += 8;
    }
  } else {
    if (name.endsWith(".svg")) return -80;
    if (/stadium|estadio|arena|ground|park|field|coliseum/.test(name)) score += 10;
    if (/interior|locker|tunnel|stand_seats|pitch_close|dressing/.test(name)) score -= 30;
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

async function pickAerialPhotoUrl(wikiTitle: string, kind: VenueImageKind): Promise<string | null> {
  const encoded = encodeURIComponent(wikiTitle.replace(/ /g, "_"));
  const media = (await wikiJson(`https://en.wikipedia.org/api/rest_v1/page/media-list/${encoded}`)) as {
    items?: MediaItem[];
  } | null;
  const images = (media?.items ?? []).filter((item) => item.type === "image" && item.title);

  const ranked = images
    .map((item) => ({ item, score: fileScore(item.title ?? "", kind, Boolean(item.leadImage)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { item } of ranked.slice(0, 10)) {
    if (item.title) {
      const original = await fileOriginalUrl(item.title);
      if (original && !original.toLowerCase().endsWith(".svg")) return original;
    }
    const fromSet = bestSrcsetUrl(item);
    if (fromSet && !fromSet.toLowerCase().includes(".svg")) return fromSet;
  }
  return null;
}

function searchQueries(kind: VenueImageKind, name: string, hint?: string): string[] {
  const trimmed = name.trim();
  if (kind === "circuit") {
    const wikiPage = CIRCUIT_WIKI_PAGES[normalizeVenueKey(trimmed)];
    const queries = [
      wikiPage,
      `${trimmed} aerial view`,
      `${trimmed} circuit aerial`,
      `${trimmed} racing circuit`,
      trimmed,
    ].filter(Boolean) as string[];
    return queries;
  }

  const stadiumish = /stadium|estadio|arena|ground|park|field/i.test(trimmed);
  const queries = stadiumish
    ? [`${trimmed} aerial view`, trimmed]
    : [`${trimmed} football stadium aerial`, `${trimmed} stadium aerial`, `${trimmed} stadium`];
  if (hint?.trim()) queries.unshift(`${trimmed} ${hint.trim()} stadium aerial`);
  return queries;
}

function curatedImage(kind: VenueImageKind, name: string): VenueImage | null {
  const key = normalizeVenueKey(name);
  const bucket = kind === "circuit" ? curatedAerials.circuit : curatedAerials.stadium;
  const hit = bucket[key as keyof typeof bucket] as CuratedVenueImage | null | undefined;
  if (!hit?.url) return null;
  return { url: hit.url, alt: hit.alt || `${name} aerial view` };
}

function localGeneratedImage(kind: VenueImageKind, name: string): VenueImage | null {
  const slug = venueSlug(name);
  const relPath = `/venues/aerial/${kind}/${slug}.webp`;
  const absPath = path.join(process.cwd(), "public", relPath.slice(1));
  if (!fs.existsSync(absPath)) return null;
  return { url: relPath, alt: `${name} aerial view` };
}

async function resolveFromWikipedia(input: {
  kind: VenueImageKind;
  name: string;
  hint?: string;
}): Promise<VenueImage | null> {
  const name = input.name.trim();
  let wikiTitle: string | null = CIRCUIT_WIKI_PAGES[normalizeVenueKey(name)] ?? null;

  if (!wikiTitle) {
    const direct = await wikipediaSummary(name);
    if (direct?.title) wikiTitle = direct.title;
  }

  if (!wikiTitle) {
    for (const query of searchQueries(input.kind, name, input.hint)) {
      wikiTitle = await wikipediaSearch(query);
      if (wikiTitle) break;
    }
  }

  if (!wikiTitle) return null;

  const url = await pickAerialPhotoUrl(wikiTitle, input.kind);
  return url ? { url, alt: `${wikiTitle} aerial view` } : null;
}

/**
 * 45°-style aerial photograph of a race circuit or football stadium.
 * Cascade: curated Wikimedia → local generated asset → live Wikipedia search.
 */
export async function resolveVenueImage(input: {
  kind: VenueImageKind;
  name: string;
  hint?: string;
}): Promise<VenueImage | null> {
  const name = input.name.trim();
  if (!name || name.toUpperCase() === "TBD") return null;

  const cacheKey = `${input.kind}:${normalizeVenueKey(name)}:${(input.hint ?? "").toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const curated = curatedImage(input.kind, name);
    if (curated) {
      cacheSet(cacheKey, curated);
      return curated;
    }

    const generated = localGeneratedImage(input.kind, name);
    if (generated) {
      cacheSet(cacheKey, generated);
      return generated;
    }

    const wiki = await resolveFromWikipedia(input);
    cacheSet(cacheKey, wiki);
    return wiki;
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
