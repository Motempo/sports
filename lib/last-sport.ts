import { CURRENT_SPORT_SLUG, getSportBySlug } from "@/lib/sports";

/** Essential preference cookie: last sports page the user opened. */
export const LAST_SPORT_COOKIE = "motempo-sports-last-sport";

/** Persist for one year. */
export const LAST_SPORT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isRememberableSportSlug(slug: string | undefined | null): slug is string {
  if (!slug) return false;
  const sport = getSportBySlug(slug);
  return Boolean(sport?.available);
}

/** Resolve homepage target: remembered available sport, else global default. */
export function resolveHomeSportSlug(remembered: string | undefined | null): string {
  return isRememberableSportSlug(remembered) ? remembered : CURRENT_SPORT_SLUG;
}
