import stadiums from "@/data/wc2026-stadiums.json";
import venueCacheSeed from "@/data/wc2026-venue-cache.json";
import { grokChatJson } from "@/lib/grok";
import type { MatchInfo } from "@/lib/types";

type StadiumEntry = {
  venue: string;
  city: string;
  aliases?: string[];
};

type VenueRecord = {
  venue: string;
  city?: string;
};

export type ResolvedStadium = {
  venue: string;
  city: string;
};

const stadiumList = stadiums as StadiumEntry[];
const seedCache = venueCacheSeed as Record<string, VenueRecord>;

const runtimeCache = new Map<number, VenueRecord>();

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const stadiumByNormalized = new Map<string, StadiumEntry>();
for (const entry of stadiumList) {
  stadiumByNormalized.set(normalizeName(entry.venue), entry);
  for (const alias of entry.aliases ?? []) {
    stadiumByNormalized.set(normalizeName(alias), entry);
  }
}

export function isMissingVenue(venue?: string | null): boolean {
  const trimmed = venue?.trim();
  return !trimmed || trimmed.toUpperCase() === "TBD";
}

export function resolveStadium(venue?: string | null): ResolvedStadium | null {
  if (isMissingVenue(venue)) return null;

  const trimmed = venue!.trim();
  const candidates = [trimmed, trimmed.split(",")[0]?.trim()].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const entry = stadiumByNormalized.get(normalizeName(candidate));
    if (entry) return { venue: entry.venue, city: entry.city };
  }

  const normalized = normalizeName(trimmed);
  for (const stadium of stadiumList) {
    const names = [stadium.venue, ...(stadium.aliases ?? [])];
    for (const name of names) {
      const nameNorm = normalizeName(name);
      if (nameNorm.length < 4) continue;
      if (normalized.includes(nameNorm) || nameNorm.includes(normalized)) {
        return { venue: stadium.venue, city: stadium.city };
      }
    }
  }

  return null;
}

export function cityForStadium(venue: string): string | undefined {
  return resolveStadium(venue)?.city;
}

export function formatMatchVenueLine(match: Pick<MatchInfo, "venue" | "city">): string | null {
  const resolved = resolveStadium(match.venue);
  const venue = resolved?.venue ?? match.venue?.trim();
  const city = resolved?.city ?? match.city?.trim() ?? (venue ? cityForStadium(venue) : undefined);

  if (isMissingVenue(venue)) {
    if (city && !isMissingVenue(city)) return city;
    return null;
  }

  return [venue, city].filter(Boolean).join(" · ");
}

function applyVenueRecord(match: MatchInfo, record: VenueRecord): MatchInfo {
  const venue = record.venue?.trim();
  if (!venue || isMissingVenue(venue)) return match;

  const resolved = resolveStadium(venue);
  if (resolved) return { ...match, venue: resolved.venue, city: resolved.city };

  const city = record.city?.trim() || cityForStadium(venue);
  return { ...match, venue, city };
}

function cacheKeyForMatch(match: MatchInfo): string {
  return String(match.id);
}

function lookupCachedVenue(match: MatchInfo): VenueRecord | undefined {
  const fromRuntime = runtimeCache.get(match.id);
  if (fromRuntime) return fromRuntime;

  const fromSeed = seedCache[cacheKeyForMatch(match)];
  if (fromSeed?.venue && !isMissingVenue(fromSeed.venue)) {
    runtimeCache.set(match.id, fromSeed);
    return fromSeed;
  }

  return undefined;
}

function isNearTermMatch(match: MatchInfo, now = new Date()): boolean {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  const matchTime = new Date(match.utcDate).getTime();
  return matchTime >= start.getTime() - 86_400_000 && matchTime < end.getTime();
}

function needsVenueResolution(match: MatchInfo): boolean {
  return !resolveStadium(match.venue);
}

async function fetchVenueFromFootballData(
  apiKey: string,
  matchId: number
): Promise<VenueRecord | undefined> {
  try {
    const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return undefined;

    const data = (await res.json()) as { venue?: string | null };
    const venue = data.venue?.trim();
    if (!venue || isMissingVenue(venue)) return undefined;

    const resolved = resolveStadium(venue);
    if (!resolved) return undefined;

    return resolved;
  } catch {
    return undefined;
  }
}

async function resolveVenuesWithGrok(
  matches: MatchInfo[]
): Promise<Map<number, VenueRecord>> {
  const result = new Map<number, VenueRecord>();
  if (matches.length === 0) return result;

  const payload = matches.map((m) => ({
    id: m.id,
    home: m.homeTeam.name,
    away: m.awayTeam.name,
    group: m.group?.replace("GROUP_", "Group ") ?? null,
    utcDate: m.utcDate,
  }));

  const parsed = await grokChatJson<Record<string, VenueRecord>>(
    `You know the official FIFA World Cup 2026 match schedule and host stadiums across the USA, Mexico, and Canada.
For each match, return the stadium name and host city/metro (e.g. "East Rutherford, NJ").
Use only real 2026 World Cup venues. If truly unknown, omit that match id.
Respond with JSON only — an object keyed by match id string:
{"12345": {"venue": "MetLife Stadium", "city": "East Rutherford, NJ"}}`,
    JSON.stringify(payload),
    { maxTokens: 8192 }
  );

  if (!parsed) return result;

  for (const match of matches) {
    const record = parsed[String(match.id)] ?? parsed[match.id as unknown as string];
    if (record?.venue && !isMissingVenue(record.venue)) {
      const resolved = resolveStadium(record.venue.trim());
      const normalized: VenueRecord = resolved ?? {
        venue: record.venue.trim(),
        city: record.city?.trim() || cityForStadium(record.venue),
      };
      result.set(match.id, normalized);
      runtimeCache.set(match.id, normalized);
    }
  }

  return result;
}

export async function enrichMatchVenues(
  matches: MatchInfo[],
  options?: { footballDataApiKey?: string; useGrok?: boolean }
): Promise<MatchInfo[]> {
  const enriched = matches.map((match) => {
    const resolved = resolveStadium(match.venue);
    if (resolved) {
      return { ...match, venue: resolved.venue, city: resolved.city };
    }

    const cached = lookupCachedVenue(match);
    return cached ? applyVenueRecord(match, cached) : match;
  });

  const stillUnresolved = enriched.filter((m) => needsVenueResolution(m));
  if (stillUnresolved.length === 0) return enriched;

  const nearTermUnresolved = stillUnresolved.filter((m) => isNearTermMatch(m));

  if (options?.footballDataApiKey && nearTermUnresolved.length > 0) {
    const detailResults = await Promise.all(
      nearTermUnresolved.slice(0, 24).map(async (match) => {
        const record = await fetchVenueFromFootballData(options.footballDataApiKey!, match.id);
        if (record) runtimeCache.set(match.id, record);
        return { matchId: match.id, record };
      })
    );

    for (const { matchId, record } of detailResults) {
      if (!record) continue;
      const idx = enriched.findIndex((m) => m.id === matchId);
      if (idx >= 0) enriched[idx] = applyVenueRecord(enriched[idx]!, record);
    }
  }

  const needsGrok = enriched.filter((m) => needsVenueResolution(m) && isNearTermMatch(m));
  if (needsGrok.length > 0 && options?.useGrok !== false) {
    const grokResults = await resolveVenuesWithGrok(needsGrok.slice(0, 32));
    for (let i = 0; i < enriched.length; i++) {
      const record = grokResults.get(enriched[i]!.id);
      if (record) enriched[i] = applyVenueRecord(enriched[i]!, record);
    }
  }

  return enriched.map((match) => {
    const resolved = resolveStadium(match.venue);
    if (resolved) {
      return { ...match, venue: resolved.venue, city: resolved.city };
    }
    if (isMissingVenue(match.venue)) {
      return { ...match, venue: "" };
    }
    return match;
  });
}
