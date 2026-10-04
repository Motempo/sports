import catalog from "@/data/f1-circuit-photos.json" with { type: "json" };
import type { F1GrandPrix, F1SessionInfo } from "@/lib/f1-types";

export interface F1CircuitRecord {
  id: string;
  slug: string;
  circuit: string;
  aliases: string[];
  country: string;
  iso2: string;
  gpName: string;
  file: string;
  width: number;
  height: number;
  alt: string;
}

const circuits = catalog as F1CircuitRecord[];

/** Feed country strings, including the short forms Jolpica and the seed use. */
const COUNTRY_ISO2: Record<string, string> = {
  australia: "AU",
  austria: "AT",
  azerbaijan: "AZ",
  bahrain: "BH",
  belgium: "BE",
  brazil: "BR",
  canada: "CA",
  china: "CN",
  france: "FR",
  germany: "DE",
  hungary: "HU",
  india: "IN",
  italy: "IT",
  japan: "JP",
  malaysia: "MY",
  mexico: "MX",
  monaco: "MC",
  netherlands: "NL",
  holland: "NL",
  portugal: "PT",
  qatar: "QA",
  "saudi arabia": "SA",
  singapore: "SG",
  spain: "ES",
  "united arab emirates": "AE",
  uae: "AE",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  britain: "GB",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  miami: "US",
};

/**
 * Places a Grand Prix name can refer to. Longer phrases are matched first.
 * City races (Miami, Barcelona, Abu Dhabi, Las Vegas) count as their country.
 */
const RACE_NAME_PLACES: Array<{ phrase: string; iso2: string }> = [
  { phrase: "united arab emirates", iso2: "AE" },
  { phrase: "united states", iso2: "US" },
  { phrase: "saudi arabia", iso2: "SA" },
  { phrase: "great britain", iso2: "GB" },
  { phrase: "united kingdom", iso2: "GB" },
  { phrase: "emilia-romagna", iso2: "IT" },
  { phrase: "emilia romagna", iso2: "IT" },
  { phrase: "mexico city", iso2: "MX" },
  { phrase: "las vegas", iso2: "US" },
  { phrase: "sao paulo", iso2: "BR" },
  { phrase: "abu dhabi", iso2: "AE" },
  { phrase: "australian", iso2: "AU" },
  { phrase: "australia", iso2: "AU" },
  { phrase: "austrian", iso2: "AT" },
  { phrase: "austria", iso2: "AT" },
  { phrase: "azerbaijani", iso2: "AZ" },
  { phrase: "azerbaijan", iso2: "AZ" },
  { phrase: "bahraini", iso2: "BH" },
  { phrase: "bahrain", iso2: "BH" },
  { phrase: "belgian", iso2: "BE" },
  { phrase: "belgium", iso2: "BE" },
  { phrase: "brazilian", iso2: "BR" },
  { phrase: "brazil", iso2: "BR" },
  { phrase: "british", iso2: "GB" },
  { phrase: "britain", iso2: "GB" },
  { phrase: "canadian", iso2: "CA" },
  { phrase: "canada", iso2: "CA" },
  { phrase: "chinese", iso2: "CN" },
  { phrase: "china", iso2: "CN" },
  { phrase: "dutch", iso2: "NL" },
  { phrase: "french", iso2: "FR" },
  { phrase: "france", iso2: "FR" },
  { phrase: "german", iso2: "DE" },
  { phrase: "germany", iso2: "DE" },
  { phrase: "hungarian", iso2: "HU" },
  { phrase: "hungary", iso2: "HU" },
  { phrase: "italian", iso2: "IT" },
  { phrase: "italy", iso2: "IT" },
  { phrase: "japanese", iso2: "JP" },
  { phrase: "japan", iso2: "JP" },
  { phrase: "malaysian", iso2: "MY" },
  { phrase: "malaysia", iso2: "MY" },
  { phrase: "mexican", iso2: "MX" },
  { phrase: "mexico", iso2: "MX" },
  { phrase: "monegasque", iso2: "MC" },
  { phrase: "monaco", iso2: "MC" },
  { phrase: "netherlands", iso2: "NL" },
  { phrase: "portuguese", iso2: "PT" },
  { phrase: "portugal", iso2: "PT" },
  { phrase: "qatari", iso2: "QA" },
  { phrase: "qatar", iso2: "QA" },
  { phrase: "saudi", iso2: "SA" },
  { phrase: "singaporean", iso2: "SG" },
  { phrase: "singapore", iso2: "SG" },
  { phrase: "spanish", iso2: "ES" },
  { phrase: "spain", iso2: "ES" },
  { phrase: "barcelona", iso2: "ES" },
  { phrase: "miami", iso2: "US" },
  { phrase: "uae", iso2: "AE" },
  { phrase: "uk", iso2: "GB" },
  { phrase: "usa", iso2: "US" },
];

const WEEKEND_BEFORE_MS = 3 * 24 * 60 * 60 * 1000;
const WEEKEND_AFTER_MS = 18 * 60 * 60 * 1000;

export function listF1Circuits(): readonly F1CircuitRecord[] {
  return circuits;
}

export function foldCircuitName(value: string): string {
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

const byId = new Map<string, F1CircuitRecord>();
const byAlias = new Map<string, F1CircuitRecord>();
for (const circuit of circuits) {
  byId.set(circuit.id, circuit);
  for (const alias of [circuit.circuit, ...circuit.aliases]) {
    const key = foldCircuitName(alias);
    const existing = byAlias.get(key);
    if (existing && existing.id !== circuit.id) {
      throw new Error(`F1 circuit alias "${alias}" is used by ${existing.id} and ${circuit.id}`);
    }
    byAlias.set(key, circuit);
  }
}

export function countryToIso2(country: string | undefined | null): string | undefined {
  if (!country?.trim()) return undefined;
  return COUNTRY_ISO2[country.trim().toLowerCase()];
}

/** Regional-indicator emoji for a real ISO 3166-1 alpha-2 code. Offline, no image request. */
export function countryFlagEmoji(iso2: string | undefined | null): string | null {
  if (!iso2) return null;
  const code = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return [...code]
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}

export function lookupF1Circuit(
  circuitId: string | undefined,
  circuitName: string | undefined
): F1CircuitRecord | null {
  const id = circuitId?.trim();
  if (id && byId.has(id)) return byId.get(id) ?? null;
  const name = circuitName?.trim();
  if (!name) return null;
  return byAlias.get(foldCircuitName(name)) ?? null;
}

export function placesNamedInRace(raceName: string): string[] {
  let text = ` ${foldCircuitName(raceName)} `;
  const found: string[] = [];
  const phrases = [...RACE_NAME_PLACES].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const { phrase, iso2 } of phrases) {
    const needle = ` ${phrase} `;
    if (!text.includes(needle)) continue;
    found.push(iso2);
    text = text.split(needle).join(" ");
  }
  return found;
}

/**
 * A race name agrees with the circuit country when every place it names is that
 * country. "Miami Grand Prix" agrees with the USA. "Bahrain Grand Prix in
 * Malaysia" does not agree with Malaysia, because it also names Bahrain.
 * A name that names no place is left alone.
 */
export function raceNameAgreesWithCountry(raceName: string, iso2: string): boolean {
  const places = placesNamedInRace(raceName);
  if (places.length === 0) return true;
  return places.every((place) => place === iso2);
}

export interface CalendarRaceIdentity {
  name: string;
  circuit: string;
  circuitId?: string;
  country: string;
  countryCode?: string;
}

/**
 * Jolpica's 2026 round 16 stores raceName "Bahrain Grand Prix in Malaysia" on
 * the Sepang circuit record (country Malaysia). OpenF1 meeting 1308 is the
 * same weekend: meeting_name "Bahrain Grand Prix", country_code BRN, location
 * "Kuala Lumpur". The cars are at Sepang. The circuit country wins, and a race
 * name that also names a different country is replaced with that circuit's
 * Grand Prix. The flag uses the same country.
 */
export function normalizeCalendarRace(input: {
  raceName: string;
  circuitId?: string;
  circuitName: string;
  country: string;
}): CalendarRaceIdentity {
  const circuit = lookupF1Circuit(input.circuitId, input.circuitName);
  const feedIso = countryToIso2(input.country);
  const iso2 = circuit?.iso2 ?? feedIso;
  const countryDisagrees = Boolean(circuit && feedIso && feedIso !== circuit.iso2);
  const country = countryDisagrees ? circuit!.country : input.country.trim() || circuit?.country || input.country;
  const name =
    circuit && iso2 && !raceNameAgreesWithCountry(input.raceName, circuit.iso2)
      ? circuit.gpName
      : input.raceName;

  return {
    name,
    circuit: input.circuitName.trim() || circuit?.circuit || input.circuitName,
    circuitId: circuit?.id ?? (input.circuitId?.trim() || undefined),
    country,
    countryCode: iso2,
  };
}

export function applyGrandPrixIdentity(gp: F1GrandPrix): F1GrandPrix {
  const identity = normalizeCalendarRace({
    raceName: gp.name,
    circuitId: gp.circuitId,
    circuitName: gp.circuit,
    country: gp.country,
  });
  return { ...gp, ...identity };
}

export function applySessionIdentity(session: F1SessionInfo): F1SessionInfo {
  const identity = normalizeCalendarRace({
    raceName: session.gpName,
    circuitId: session.circuitId,
    circuitName: session.circuit,
    country: session.country,
  });
  return {
    ...session,
    gpName: identity.name,
    circuit: identity.circuit,
    circuitId: identity.circuitId,
    country: identity.country,
    countryCode: identity.countryCode,
  };
}

/**
 * OpenF1 sessions for one round. The window is the race weekend only.
 * A ±5 day match also pulled in the next event (Singapore practice falls
 * inside five days of the Sepang race).
 */
export function isSessionInGrandPrixWeekend(sessionStartIso: string, raceUtcIso: string): boolean {
  const raceMs = Date.parse(raceUtcIso);
  const sessionMs = Date.parse(sessionStartIso);
  if (Number.isNaN(raceMs) || Number.isNaN(sessionMs)) return false;
  return sessionMs >= raceMs - WEEKEND_BEFORE_MS && sessionMs <= raceMs + WEEKEND_AFTER_MS;
}
