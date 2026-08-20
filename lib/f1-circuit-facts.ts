import "server-only";

import { uncachedFetch } from "@/lib/fetch-options";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/** Commentator-style colour for circuits — character, not betting tips. */
const CIRCUIT_COLOUR: Record<string, string> = {
  albert_park:
    "Albert Park is a temporary street-park layout — walls close, grip builds through the weekend, and Sunday often rewards whoever kept the car tidy on Friday.",
  shanghai:
    "Shanghai's endless Turn 1–2 complex still sets the tone: a long entry, a late apex, and a rear that wants to step out if you rush the throttle.",
  suzuka:
    "Suzuka is the figure-eight classic — flowing, unforgiving, and still the lap that drivers measure themselves against all year.",
  miami:
    "Miami's Hard Rock layout is stop-start stadium racing: long straights, heavy braking zones, and a crowd that turns every overtake into theatre.",
  villeneuve:
    "Gilles Villeneuve is a wall-lined island sprint — the Wall of Champions still looms, and one small mistake puts you in the barriers.",
  monaco:
    "Monaco is the slowest track on the calendar and still the hardest to pass — grid position is half the race before the lights go out.",
  catalunya:
    "Barcelona-Catalunya is an aero proving ground: long corners expose car balance, and race pace often tells a truer story than one hot qualifying lap.",
  red_bull_ring:
    "The Red Bull Ring is short, sharp, and altitude-thin — three big stops into slow corners, then full throttle again within seconds.",
  silverstone:
    "Silverstone is high-speed Britain at its purest — Maggotts–Becketts still sorts the great from the merely quick.",
  spa:
    "Spa-Francorchamps stretches from Eau Rouge to Blanchimont: weather splits the circuit in half, and one dry line can rewrite a strategy board.",
  hungaroring:
    "The Hungaroring is Monaco without the yachts — narrow, twisty, and brutal on tyres once the track rubber goes off.",
  zandvoort:
    "Zandvoort banks you through the dunes — banked corners, sand in the air, and a home crowd that turns every orange helmet into a storyline.",
  monza:
    "Monza is the Temple of Speed: slipstream trains, DRS trains, and a crowd that has been watching horsepower since the 1920s.",
  baku:
    "Baku mixes a tight old-town maze with a flat-out seaside blast — safety cars are never far away, and the castle section punishes greed.",
  marina_bay:
    "Singapore is a night street marathon under floodlights — humidity, barriers, and concentration over eighty-odd laps.",
  americas:
    "Circuit of the Americas climbs into Turn 1 like a stadium staircase, then opens into a flowing middle sector built for rhythm.",
  rodriguez:
    "Mexico City's thin air stretches braking zones and kills downforce — engines gasp, wings work harder, and overtaking windows get weird.",
  interlagos:
    "Interlagos is short, bumpy, and emotional — elevation changes, a passionate home crowd, and weather that can flip a race in one cloud.",
  losail:
    "Losail under lights is a flowing desert bowl — long corners, abrasive asphalt, and a tyre cliff that sneaks up after sunset.",
  yas_marina:
    "Yas Marina closes the book under Abu Dhabi lights — a modern marina circuit where championship maths often arrives before the chequered flag.",
  bahrain:
    "Bahrain's desert floodlights make tyre management the whole plot — soft compounds fade fast once the night cools.",
  jeddah:
    "Jeddah is a high-speed street circuit with walls for company — commitment through the quick stuff separates the weekend.",
  imola:
    "Imola is old-school Emilia-Romagna: elevation, commitment, and little room to recover once you miss an apex.",
  vegas:
    "Las Vegas runs the Strip at night — long straights, cold desert air, and a showpiece venue that still has to race like a proper Grand Prix.",
};

interface WinnerRow {
  season: string;
  driverName: string;
}

const winnersCache = new Map<string, { value: WinnerRow[]; expiresAt: number }>();

function normalizeCircuitKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Map common circuit display names → Jolpica circuitId when seed data lacks an id. */
const CIRCUIT_NAME_TO_ID: Record<string, string> = {
  albert_park_grand_prix_circuit: "albert_park",
  shanghai_international_circuit: "shanghai",
  suzuka_circuit: "suzuka",
  miami_international_autodrome: "miami",
  circuit_gilles_villeneuve: "villeneuve",
  circuit_de_monaco: "monaco",
  circuit_de_barcelona_catalunya: "catalunya",
  red_bull_ring: "red_bull_ring",
  silverstone_circuit: "silverstone",
  circuit_de_spa_francorchamps: "spa",
  hungaroring: "hungaroring",
  circuit_park_zandvoort: "zandvoort",
  circuit_zandvoort: "zandvoort",
  autodromo_nazionale_di_monza: "monza",
  baku_city_circuit: "baku",
  marina_bay_street_circuit: "marina_bay",
  circuit_of_the_americas: "americas",
  autodromo_hermanos_rodriguez: "rodriguez",
  autodromo_jose_carlos_pace: "interlagos",
  losail_international_circuit: "losail",
  yas_marina_circuit: "yas_marina",
  bahrain_international_circuit: "bahrain",
  jeddah_corniche_circuit: "jeddah",
  autodromo_enzo_e_dino_ferrari: "imola",
  las_vegas_strip_circuit: "vegas",
};

export function resolveCircuitId(circuitId: string | undefined, circuitName: string): string | null {
  if (circuitId?.trim()) return circuitId.trim();
  const key = normalizeCircuitKey(circuitName);
  return CIRCUIT_NAME_TO_ID[key] ?? null;
}

async function fetchCircuitWinners(circuitId: string): Promise<WinnerRow[]> {
  const cached = winnersCache.get(circuitId);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  try {
    const res = await fetch(`${JOLPICA_BASE}/circuits/${circuitId}/results/1.json?limit=100`, {
      ...uncachedFetch,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      winnersCache.set(circuitId, { value: [], expiresAt: Date.now() + CACHE_TTL_MS });
      return [];
    }
    const data = (await res.json()) as {
      MRData?: {
        RaceTable?: {
          Races?: Array<{
            season: string;
            Results?: Array<{ Driver: { givenName: string; familyName: string } }>;
          }>;
        };
      };
    };
    const rows: WinnerRow[] = [];
    for (const race of data.MRData?.RaceTable?.Races ?? []) {
      const driver = race.Results?.[0]?.Driver;
      if (!driver) continue;
      rows.push({
        season: race.season,
        driverName: `${driver.givenName} ${driver.familyName}`.trim(),
      });
    }
    winnersCache.set(circuitId, { value: rows, expiresAt: Date.now() + CACHE_TTL_MS });
    return rows;
  } catch {
    winnersCache.set(circuitId, { value: [], expiresAt: Date.now() + 5 * 60 * 1000 });
    return [];
  }
}

function mostWinsLine(winners: WinnerRow[]): string | null {
  if (winners.length === 0) return null;
  const counts = new Map<string, number>();
  for (const row of winners) {
    counts.set(row.driverName, (counts.get(row.driverName) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [name, wins] = ranked[0]!;
  if (wins < 2) {
    const recent = winners[winners.length - 1];
    return recent
      ? `${recent.driverName} took the last win here (${recent.season}).`
      : null;
  }
  return `${name} leads the all-time wins list here with ${wins}.`;
}

function lastWinnerLine(winners: WinnerRow[]): string | null {
  const recent = [...winners].reverse().find((row) => parseInt(row.season, 10) >= 2015);
  if (!recent) return null;
  return `Last time out (${recent.season}), ${recent.driverName} took the chequered flag.`;
}

/**
 * One short commentator-style track note for the featured next-event opener (MOT-50).
 * Prefer live Jolpica win history; always fall back to curated circuit colour.
 */
export async function getCircuitTrackFact(options: {
  circuitId?: string;
  circuitName: string;
}): Promise<string | null> {
  const id = resolveCircuitId(options.circuitId, options.circuitName);
  const colour = id ? CIRCUIT_COLOUR[id] : null;
  const winners = id ? await fetchCircuitWinners(id) : [];
  const wins = mostWinsLine(winners);
  const last = lastWinnerLine(winners);

  const parts = [colour, wins && wins !== last ? wins : null, last].filter(Boolean) as string[];
  if (parts.length === 0) return null;

  // Keep the opener tight — colour + one history beat.
  if (colour && (wins || last)) {
    return `${colour} ${wins && wins !== last ? wins : last}`.replace(/\s+/g, " ").trim();
  }
  return parts[0]!.replace(/\s+/g, " ").trim();
}
