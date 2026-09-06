import "server-only";

import { uncachedFetch } from "@/lib/fetch-options";
import type { MatchInfo, VenueImage } from "@/lib/types";

export type VenueImageKind = "circuit" | "stadium";

export type { VenueImage };

const USER_AGENT = "Sports-by-Motempo/1.0 (https://sports.motempo.com)";
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Bump when scoring/search changes so in-process hits from older logic are dropped. */
const CACHE_VERSION = "aerial-oblique-v1";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

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
  const data = (await wikiJson(`${WIKI_API}?${params.toString()}`)) as {
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

function isCircuitSchematic(fileTitle: string): boolean {
  const name = fileTitle.toLowerCase();
  if (name.endsWith(".svg")) return true;
  return /schematic|circuit[_ -]?map|layout[_ -]?map|track[_ -]?map|diagram|circuit\.(png|svg)$/.test(
    name
  );
}

function isObliqueAerial(fileTitle: string): boolean {
  const name = fileTitle.toLowerCase();
  return /aerial|from[_ ]?(the[_ ])?air|air[_ -]?view|oblique|helicopter|drone|bird.?s.?eye|from[_ ]above|overview|vista[_ ]aerea|veduta[_ ]aerea/.test(
    name
  );
}

function isUnusableVenueFile(fileTitle: string): boolean {
  return /\.(pdf|svg|djvu|webm|ogv|tiff?)$/i.test(fileTitle);
}

/**
 * Rank a Wikimedia file for a circuit (oblique aerial photo) or stadium (photograph).
 * Exported for scoring checks — higher is better; 0 and below are skipped.
 */
export function scoreVenueImageFile(fileTitle: string, kind: VenueImageKind, lead: boolean): number {
  const name = fileTitle.toLowerCase();
  if (/logo|wordmark|coat_of_arms|flag|icon|pictogram/.test(name)) return -100;

  let score = lead ? 10 : 0;

  if (kind === "circuit") {
    const schematic = isCircuitSchematic(name);
    const aerial = isObliqueAerial(name);
    const nadir = /skysat|satellite|orthophoto|planet[_ ]?imagery/.test(name);
    const isHistoricalLayout = /19(4|5|6|7|8|9)\d|vs_19|compared|evolution/.test(name);

    // Flat layout maps / SVG diagrams — never the next-event photo.
    if (schematic && !aerial) return -40;
    if (isHistoricalLayout) score -= 35;

    // Prefer a 45°-style view from the air over a straight-down satellite map.
    if (aerial) score += 55;
    if (nadir) score -= 25;
    if (/\.jpe?g/.test(name)) score += 20;
    if (name.endsWith(".png") && aerial) score += 12;

    if (/motorsport|grandstand|pit_lane|paddock|start_|dtm_|bestanddeelnr|cockpit|helmet/.test(name)) {
      score -= 30;
    }
    if (/circuit|track|autodromo|zandvoort|suzuka|monza|spa|silverstone/.test(name)) score += 6;
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

function preferUploadUrl(info: { thumburl?: string; url?: string; mime?: string }): string | null {
  if (!info.mime?.startsWith("image/") || info.mime.includes("svg")) return null;
  const original = info.url ? stripTracking(info.url) : "";
  const thumb = info.thumburl ? stripTracking(info.thumburl) : "";
  // Next/Image allowlists upload.wikimedia.org; Commons now serves some thumbs from thumb.wikimedia.org.
  if (thumb.includes("upload.wikimedia.org")) return thumb;
  if (original.includes("upload.wikimedia.org")) return original;
  return thumb || original || null;
}

async function fileOriginalUrl(fileTitle: string, api = WIKI_API): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "1600",
    format: "json",
  });
  const data = (await wikiJson(`${api}?${params.toString()}`)) as {
    query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string }> }> };
  } | null;
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return preferUploadUrl(info);
}

async function commonsFileSearch(query: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srnamespace: "6",
    srlimit: "12",
    format: "json",
    utf8: "1",
  });
  const data = (await wikiJson(`${COMMONS_API}?${params.toString()}`)) as {
    query?: { search?: Array<{ title?: string }> };
  } | null;
  return (data?.query?.search ?? [])
    .map((hit) => hit.title?.trim())
    .filter((title): title is string => typeof title === "string" && title.length > 0 && !isUnusableVenueFile(title));
}

async function pickCommonsAerialUrl(name: string): Promise<string | null> {
  const queries = [
    `${name} aerial`,
    `${name} circuit aerial view`,
    `${name} overview`,
    `${name} Grand Prix aerial`,
  ];

  for (const query of queries) {
    const files = await commonsFileSearch(query);
    const ranked = files
      .map((title) => ({ title, score: scoreVenueImageFile(title, "circuit", false) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const { title } of ranked.slice(0, 6)) {
      const url = await fileOriginalUrl(title, COMMONS_API);
      if (url && !url.toLowerCase().includes(".svg")) return url;
    }
  }
  return null;
}

async function pickPhotoUrl(wikiTitle: string, kind: VenueImageKind): Promise<string | null> {
  const encoded = encodeURIComponent(wikiTitle.replace(/ /g, "_"));
  const media = (await wikiJson(`https://en.wikipedia.org/api/rest_v1/page/media-list/${encoded}`)) as {
    items?: MediaItem[];
  } | null;
  const images = (media?.items ?? []).filter((item) => item.type === "image" && item.title);

  const ranked = images
    .map((item) => ({ item, score: scoreVenueImageFile(item.title ?? "", kind, Boolean(item.leadImage)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { item } of ranked.slice(0, 8)) {
    if (kind === "circuit" && item.title && isCircuitSchematic(item.title) && !isObliqueAerial(item.title)) {
      continue;
    }
    const fromSet = bestSrcsetUrl(item);
    if (fromSet) {
      if (kind === "circuit" || !fromSet.toLowerCase().includes(".svg")) return fromSet;
    }
    if (item.title) {
      const original = await fileOriginalUrl(item.title);
      if (original) {
        if (kind === "circuit" && original.toLowerCase().includes(".svg")) continue;
        return original;
      }
    }
  }
  return null;
}

function searchQuery(kind: VenueImageKind, name: string, hint?: string): string[] {
  const trimmed = name.trim();
  if (kind === "circuit") {
    return [
      `${trimmed} aerial`,
      `${trimmed} Grand Prix circuit`,
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
 * Circuits prefer an oblique aerial (from the air at ~45°), not a flat layout map.
 */
export async function resolveVenueImage(input: {
  kind: VenueImageKind;
  name: string;
  hint?: string;
}): Promise<VenueImage | null> {
  const name = input.name.trim();
  if (!name || name.toUpperCase() === "TBD") return null;

  const cacheKey = `${CACHE_VERSION}:${input.kind}:${name.toLowerCase()}:${(input.hint ?? "").toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  try {
    if (input.kind === "circuit") {
      const aerialUrl = await pickCommonsAerialUrl(name);
      if (aerialUrl) {
        const value = { url: aerialUrl, alt: `${name} from the air` };
        cacheSet(cacheKey, value);
        return value;
      }
    }

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
