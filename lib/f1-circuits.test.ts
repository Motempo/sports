import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseGrandPrix, parseSessionsFromRace, type JolpicaRace } from "./f1-calendar-parse.ts";
import {
  applyGrandPrixIdentity,
  countryFlagEmoji,
  countryToIso2,
  isSessionInGrandPrixWeekend,
  listF1Circuits,
  normalizeCalendarRace,
  placesNamedInRace,
  raceNameAgreesWithCountry,
} from "./f1-circuits.ts";
import type { F1GrandPrix } from "./f1-types.ts";

const seed = JSON.parse(
  readFileSync(new URL("../data/f1-season-seed.json", import.meta.url), "utf8")
) as { calendar: F1GrandPrix[] };

/** The 2026 Jolpica round whose raceName names Bahrain and whose circuit is Sepang. */
function sepangRace(): JolpicaRace {
  return {
    season: "2026",
    round: "16",
    raceName: "Bahrain Grand Prix in Malaysia",
    date: "2026-10-04",
    time: "07:00:00Z",
    Circuit: {
      circuitId: "sepang",
      circuitName: "Sepang International Circuit",
      Location: { locality: "Kuala Lumpur", country: "Malaysia" },
    },
    FirstPractice: { date: "2026-10-02", time: "04:30:00Z" },
    Qualifying: { date: "2026-10-03", time: "08:00:00Z" },
  };
}

const AGREEING_RACES: Array<{ raceName: string; circuitId: string; circuitName: string; country: string }> = [
  { raceName: "Australian Grand Prix", circuitId: "albert_park", circuitName: "Albert Park Grand Prix Circuit", country: "Australia" },
  { raceName: "Chinese Grand Prix", circuitId: "shanghai", circuitName: "Shanghai International Circuit", country: "China" },
  { raceName: "Japanese Grand Prix", circuitId: "suzuka", circuitName: "Suzuka Circuit", country: "Japan" },
  { raceName: "Miami Grand Prix", circuitId: "miami", circuitName: "Miami International Autodrome", country: "USA" },
  { raceName: "Canadian Grand Prix", circuitId: "villeneuve", circuitName: "Circuit Gilles Villeneuve", country: "Canada" },
  { raceName: "Monaco Grand Prix", circuitId: "monaco", circuitName: "Circuit de Monaco", country: "Monaco" },
  { raceName: "Barcelona Grand Prix", circuitId: "catalunya", circuitName: "Circuit de Barcelona-Catalunya", country: "Spain" },
  { raceName: "Austrian Grand Prix", circuitId: "red_bull_ring", circuitName: "Red Bull Ring", country: "Austria" },
  { raceName: "British Grand Prix", circuitId: "silverstone", circuitName: "Silverstone Circuit", country: "UK" },
  { raceName: "Belgian Grand Prix", circuitId: "spa", circuitName: "Circuit de Spa-Francorchamps", country: "Belgium" },
  { raceName: "Hungarian Grand Prix", circuitId: "hungaroring", circuitName: "Hungaroring", country: "Hungary" },
  { raceName: "Dutch Grand Prix", circuitId: "zandvoort", circuitName: "Circuit Park Zandvoort", country: "Netherlands" },
  { raceName: "Italian Grand Prix", circuitId: "monza", circuitName: "Autodromo Nazionale di Monza", country: "Italy" },
  { raceName: "Spanish Grand Prix", circuitId: "madring", circuitName: "Madring", country: "Spain" },
  { raceName: "Azerbaijan Grand Prix", circuitId: "baku", circuitName: "Baku City Circuit", country: "Azerbaijan" },
  { raceName: "Singapore Grand Prix", circuitId: "marina_bay", circuitName: "Marina Bay Street Circuit", country: "Singapore" },
  { raceName: "United States Grand Prix", circuitId: "americas", circuitName: "Circuit of the Americas", country: "USA" },
  { raceName: "Mexico City Grand Prix", circuitId: "rodriguez", circuitName: "Autódromo Hermanos Rodríguez", country: "Mexico" },
  { raceName: "Brazilian Grand Prix", circuitId: "interlagos", circuitName: "Autódromo José Carlos Pace", country: "Brazil" },
  { raceName: "Las Vegas Grand Prix", circuitId: "vegas", circuitName: "Las Vegas Strip Street Circuit", country: "USA" },
  { raceName: "Qatar Grand Prix", circuitId: "losail", circuitName: "Lusail International Circuit", country: "Qatar" },
  { raceName: "Abu Dhabi Grand Prix", circuitId: "yas_marina", circuitName: "Yas Marina Circuit", country: "UAE" },
];

describe("F1 country flags", () => {
  it("maps every country string on the seed calendar and the circuit catalog", () => {
    const countries = new Set<string>([
      ...seed.calendar.map((gp) => gp.country),
      ...listF1Circuits().map((circuit) => circuit.country),
      "UK",
      "UAE",
      "USA",
      "United Kingdom",
      "United Arab Emirates",
      "Malaysia",
    ]);
    for (const country of countries) {
      const iso = countryToIso2(country);
      assert.ok(iso, country);
      assert.match(iso!, /^[A-Z]{2}$/);
      assert.equal(countryFlagEmoji(iso)?.length, 4, country);
    }
  });

  it("builds a Malaysian flag offline and rejects a code that is not alpha-2", () => {
    assert.equal(countryToIso2("Malaysia"), "MY");
    assert.equal(countryToIso2("UK"), "GB");
    assert.equal(countryToIso2("UAE"), "AE");
    assert.equal(countryToIso2("USA"), "US");
    assert.equal(countryFlagEmoji("MY"), "\u{1F1F2}\u{1F1FE}");
    assert.equal(countryFlagEmoji("gb"), "\u{1F1EC}\u{1F1E7}");
    assert.equal(countryFlagEmoji("MAL"), null);
    assert.equal(countryFlagEmoji(""), null);
  });
});

describe("F1 calendar identity", () => {
  it("replaces a race name that names a different country than the circuit", () => {
    const race = sepangRace();
    const gp = parseGrandPrix(race, 15, new Date("2026-10-04T12:00:00Z"));
    assert.equal(gp.name, "Malaysian Grand Prix");
    assert.equal(gp.circuit, "Sepang International Circuit");
    assert.equal(gp.circuitId, "sepang");
    assert.equal(gp.country, "Malaysia");
    assert.equal(gp.countryCode, "MY");
    assert.equal(gp.date, "2026-10-04");
    assert.equal(gp.utcDate, "2026-10-04T07:00:00Z");
    assert.equal(raceNameAgreesWithCountry(gp.name, gp.countryCode!), true);
    assert.deepEqual([...placesNamedInRace("Bahrain Grand Prix in Malaysia")].sort(), ["BH", "MY"]);

    const sessions = parseSessionsFromRace(race, new Date("2026-10-01T00:00:00Z"));
    assert.equal(sessions.length, 3);
    for (const session of sessions) {
      assert.equal(session.gpName, "Malaysian Grand Prix");
      assert.equal(session.circuit, "Sepang International Circuit");
      assert.equal(session.country, "Malaysia");
      assert.equal(session.countryCode, "MY");
    }
    assert.equal(sessions.find((session) => session.sessionLabel === "Race")?.utcDate, "2026-10-04T07:00:00Z");
  });

  it("follows Sepang when the feed country is still Bahrain", () => {
    const identity = normalizeCalendarRace({
      raceName: "Bahrain Grand Prix",
      circuitName: "Kuala Lumpur",
      country: "Bahrain",
    });
    assert.equal(identity.name, "Malaysian Grand Prix");
    assert.equal(identity.circuit, "Kuala Lumpur");
    assert.equal(identity.circuitId, "sepang");
    assert.equal(identity.country, "Malaysia");
    assert.equal(identity.countryCode, "MY");
  });

  it("keeps every other 2026 race name with its own circuit, country, and flag", () => {
    for (const race of AGREEING_RACES) {
      const identity = normalizeCalendarRace(race);
      assert.equal(identity.name, race.raceName, race.raceName);
      assert.equal(identity.circuit, race.circuitName);
      assert.equal(identity.circuitId, race.circuitId);
      assert.equal(identity.country, race.country);
      const iso = countryToIso2(race.country);
      assert.equal(identity.countryCode, iso);
      assert.equal(raceNameAgreesWithCountry(identity.name, identity.countryCode!), true);
      assert.ok(countryFlagEmoji(identity.countryCode));
    }
  });

  it("gives every seed round a flag and a name that matches its circuit country", () => {
    assert.equal(seed.calendar.length, listF1Circuits().length);
    for (const gp of seed.calendar) {
      const identity = applyGrandPrixIdentity(gp);
      assert.equal(identity.name, gp.name, gp.name);
      assert.ok(identity.countryCode, gp.country);
      assert.ok(countryFlagEmoji(identity.countryCode));
      assert.equal(raceNameAgreesWithCountry(identity.name, identity.countryCode!), true, gp.name);
      assert.equal(identity.date, gp.date);
    }
    const sepang = applyGrandPrixIdentity(seed.calendar.find((gp) => gp.round === 16)!);
    assert.equal(sepang.name, "Malaysian Grand Prix");
    assert.equal(sepang.countryCode, "MY");
  });
});

describe("OpenF1 weekend join", () => {
  const raceUtc = "2026-10-04T07:00:00Z";

  it("keeps Sepang practice and drops the next meeting's Friday", () => {
    assert.equal(isSessionInGrandPrixWeekend("2026-10-02T04:30:00Z", raceUtc), true);
    assert.equal(isSessionInGrandPrixWeekend("2026-10-04T07:00:00Z", raceUtc), true);
    assert.equal(isSessionInGrandPrixWeekend("2026-10-09T08:30:00+00:00", raceUtc), false);
    assert.equal(isSessionInGrandPrixWeekend("2026-10-11T12:00:00Z", raceUtc), false);
  });
});
