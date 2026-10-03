import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  MAX_VENUE_DETAIL_FETCHES,
  VENUE_DETAIL_MISS_TTL_MS,
  claimVenueDetailSlot,
  createVenueDetailWindow,
  isMissingVenue,
  noteVenueDetailMiss,
  pauseVenueDetailWindow,
  selectVenueDetailMatches,
  venueDetailMissIsActive,
  type VenueDetailCandidate,
} from "./venue-detail-budget.ts";
import { canonicalTeamCode } from "./wc-team-codes.ts";

const NOW = new Date("2026-06-15T18:00:00.000Z");

function match(
  id: number,
  hoursFromNow: number,
  extras?: Partial<VenueDetailCandidate>
): VenueDetailCandidate {
  return {
    id,
    utcDate: new Date(NOW.getTime() + hoursFromNow * 3_600_000).toISOString(),
    venue: "",
    status: "SCHEDULED",
    ...extras,
  };
}

describe("selectVenueDetailMatches", () => {
  it("returns at most four matches when dozens are missing a venue", () => {
    const matches = Array.from({ length: 48 }, (_, index) => match(index + 1, index + 1));
    const picked = selectVenueDetailMatches(matches, { now: NOW });

    assert.equal(picked.length, MAX_VENUE_DETAIL_FETCHES);
    assert.deepEqual(
      picked.map((item) => item.id),
      [1, 2, 3, 4]
    );
  });

  it("skips fixtures that already have a stadium, including unrecognized names", () => {
    const matches = [
      match(1, 1, { venue: "New York New Jersey Stadium" }),
      match(2, 2, { venue: "TBD" }),
      match(3, 3, { venue: "   " }),
      match(4, 4, { venue: null }),
      match(5, 5, { venue: "Some Ground Not In The Catalog" }),
      match(6, 6),
    ];
    const picked = selectVenueDetailMatches(matches, { now: NOW });

    assert.deepEqual(
      picked.map((item) => item.id),
      [2, 3, 4, 6]
    );
  });

  it("prefers a live match, then the next kickoff, over older results", () => {
    const matches = [
      match(10, -48, { status: "FINISHED" }),
      match(11, -2, { status: "FINISHED" }),
      match(12, 8, { status: "SCHEDULED" }),
      match(13, 1, { status: "SCHEDULED" }),
      match(14, -1, { status: "LIVE" }),
    ];
    const picked = selectVenueDetailMatches(matches, { now: NOW });

    assert.deepEqual(
      picked.map((item) => item.id),
      [14, 13, 12, 11]
    );
  });

  it("after the tournament, keeps the four most recently finished blanks", () => {
    const later = new Date("2026-10-03T12:00:00.000Z");
    const matches = [1, 2, 3, 4, 5].map((id) =>
      match(id, 0, {
        status: "FINISHED",
        utcDate: new Date(Date.parse("2026-07-10T00:00:00.000Z") + id * 86_400_000).toISOString(),
      })
    );
    const picked = selectVenueDetailMatches(matches, { now: later });

    assert.deepEqual(
      picked.map((item) => item.id),
      [5, 4, 3, 2]
    );
  });

  it("does not repeat a match id", () => {
    const matches = [match(7, 1), match(7, 2), match(8, 3)];
    const picked = selectVenueDetailMatches(matches, { now: NOW });
    assert.deepEqual(
      picked.map((item) => item.id),
      [7, 8]
    );
  });
});

describe("venue detail minute window", () => {
  it("allows four claims per minute and blocks the rest", () => {
    const window = createVenueDetailWindow();
    const start = Date.parse("2026-10-03T12:00:00.000Z");
    const claims = Array.from({ length: 6 }, () => claimVenueDetailSlot(window, start));

    assert.deepEqual(claims, [true, true, true, true, false, false]);
  });

  it("opens a new window after a minute", () => {
    const window = createVenueDetailWindow();
    const start = Date.parse("2026-10-03T12:00:00.000Z");
    for (let i = 0; i < MAX_VENUE_DETAIL_FETCHES; i++) claimVenueDetailSlot(window, start);

    assert.equal(claimVenueDetailSlot(window, start + 60_000), true);
  });

  it("stops further claims after a 429 until the window elapses", () => {
    const window = createVenueDetailWindow();
    const start = Date.parse("2026-10-03T12:00:00.000Z");
    assert.equal(claimVenueDetailSlot(window, start), true);
    pauseVenueDetailWindow(window, start);

    assert.equal(claimVenueDetailSlot(window, start + 1_000), false);
    assert.equal(claimVenueDetailSlot(window, start + 60_000), true);
  });
});

describe("venue detail misses", () => {
  it("skips a match that just returned no stadium, then allows it after the ttl", () => {
    const misses = new Map<number, number>();
    const now = Date.parse("2026-10-03T12:00:00.000Z");
    noteVenueDetailMiss(misses, 42, now);

    assert.equal(venueDetailMissIsActive(misses, 42, now + 1_000), true);
    assert.equal(venueDetailMissIsActive(misses, 42, now + VENUE_DETAIL_MISS_TTL_MS), false);
    assert.equal(venueDetailMissIsActive(misses, 7, now), false);
  });
});

describe("isMissingVenue", () => {
  it("treats blank and TBD as missing and keeps any other label", () => {
    assert.equal(isMissingVenue(undefined), true);
    assert.equal(isMissingVenue("  TBD "), true);
    assert.equal(isMissingVenue("Boston Stadium"), false);
  });
});

describe("canonicalTeamCode", () => {
  it("maps football-data TLAs onto fixture codes and leaves known codes", () => {
    assert.equal(canonicalTeamCode("ksa"), "SAU");
    assert.equal(canonicalTeamCode("HTI"), "HAI");
    assert.equal(canonicalTeamCode("URY"), "URU");
    assert.equal(canonicalTeamCode("SAU"), "SAU");
    assert.equal(canonicalTeamCode(" usa "), "USA");
  });
});

describe("local stadium names", () => {
  it("includes FIFA host-stadium names that the competition list may return", () => {
    const stadiums = JSON.parse(
      readFileSync(new URL("../data/wc2026-stadiums.json", import.meta.url), "utf8")
    ) as Array<{ venue: string; aliases?: string[] }>;

    const expected: Record<string, string[]> = {
      "MetLife Stadium": ["New York New Jersey Stadium", "New York/New Jersey Stadium"],
      "SoFi Stadium": ["Los Angeles Stadium"],
      "AT&T Stadium": ["Dallas Stadium"],
      "Mercedes-Benz Stadium": ["Atlanta Stadium"],
      "Hard Rock Stadium": ["Miami Stadium"],
      "Lincoln Financial Field": ["Philadelphia Stadium"],
      "Levi's Stadium": ["San Francisco Bay Area Stadium"],
      "Arrowhead Stadium": ["Kansas City Stadium"],
      "NRG Stadium": ["Houston Stadium"],
      "Gillette Stadium": ["Boston Stadium"],
      "Estadio Azteca": ["Mexico City Stadium", "Estadio Ciudad de México"],
      "Estadio BBVA": ["Monterrey Stadium", "Estadio Monterrey"],
      "Estadio Akron": ["Guadalajara Stadium", "Estadio Guadalajara"],
      "BC Place": ["Vancouver Stadium"],
      "BMO Field": ["Toronto Stadium"],
      "Lumen Field": ["Seattle Stadium"],
    };

    for (const [venue, aliases] of Object.entries(expected)) {
      const entry = stadiums.find((stadium) => stadium.venue === venue);
      assert.ok(entry, `missing stadium ${venue}`);
      for (const alias of aliases) {
        assert.ok(entry.aliases?.includes(alias), `${venue} is missing alias ${alias}`);
      }
    }
  });
});
