import photos from "@/data/football-venue-photos.json" with { type: "json" };
import type { VenueImage } from "@/lib/types";

export interface FootballVenuePhoto {
  id: string;
  league: "la-liga" | "premier-league" | "world-cup";
  code: string | null;
  venue: string;
  city: string;
  aliases: string[];
  view: "aerial" | "vantage" | "exterior";
  file: string;
  width: number;
  height: number;
  alt: string;
  commonsTitle: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  modified: string;
  note?: string;
}

const catalog = photos as FootballVenuePhoto[];

/** Fold accents and punctuation so "Sánchez-Pizjuán" matches "Sanchez Pizjuan". */
export function normalizeVenueName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const byAlias = new Map<string, FootballVenuePhoto>();
for (const photo of catalog) {
  for (const alias of photo.aliases) {
    const key = normalizeVenueName(alias);
    const existing = byAlias.get(key);
    if (existing && existing.id !== photo.id) {
      throw new Error(`Venue photo alias "${alias}" is used by ${existing.id} and ${photo.id}`);
    }
    byAlias.set(key, photo);
  }
}

function toImage(photo: FootballVenuePhoto): VenueImage {
  return {
    url: photo.file,
    alt: photo.alt,
    width: photo.width,
    height: photo.height,
    credit: {
      author: photo.author,
      license: photo.license,
      sourceUrl: photo.sourceUrl,
    },
  };
}

/**
 * Same-origin photo for a La Liga, Premier League, or World Cup ground.
 * Matching is exact on the catalog's venue names and aliases, after accent folding.
 */
export function lookupFootballVenuePhoto(name: string | null | undefined): VenueImage | null {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.toUpperCase() === "TBD") return null;
  const direct = byAlias.get(normalizeVenueName(trimmed));
  if (direct) return toImage(direct);
  const head = trimmed.split(",")[0] ?? trimmed;
  const headed = byAlias.get(normalizeVenueName(head));
  return headed ? toImage(headed) : null;
}

export function listFootballVenuePhotos(): readonly FootballVenuePhoto[] {
  return catalog;
}
