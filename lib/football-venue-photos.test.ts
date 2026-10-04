import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  listFootballVenuePhotos,
  lookupFootballVenuePhoto,
  normalizeVenueName,
} from "./football-venue-photos.ts";

const laLigaVenues = JSON.parse(
  readFileSync(new URL("../data/la-liga-home-venues.json", import.meta.url), "utf8")
) as Array<{ code: string; venue: string }>;
const plVenues = JSON.parse(
  readFileSync(new URL("../data/pl-home-venues.json", import.meta.url), "utf8")
) as Array<{ code: string; venue: string }>;

describe("football venue photos", () => {
  const photos = listFootballVenuePhotos();

  it("maps every La Liga and Premier League home ground to a same-origin aerial path", () => {
    assert.equal(photos.length, laLigaVenues.length + plVenues.length);
    for (const venue of [...laLigaVenues, ...plVenues]) {
      const image = lookupFootballVenuePhoto(venue.venue);
      const photo = photos.find((entry) => entry.code === venue.code);
      assert.ok(photo, venue.code);
      assert.equal(image?.url, `/venues/football/${photo.slug}.webp`);
      assert.equal(photo.file, image?.url);
      assert.equal(photo.aliases.includes(venue.venue), true);
    }
  });

  it("matches a ground after accent folding and a trailing city", () => {
    const image = lookupFootballVenuePhoto("Estadio Ramon Sanchez-Pizjuan, Sevilla");
    assert.equal(image?.url, "/venues/football/sanchez-pizjuan.webp");
    assert.equal(normalizeVenueName("St. James' Park"), "st james park");
    assert.equal(lookupFootballVenuePhoto("St James Park")?.url, "/venues/football/st-james-park.webp");
  });

  it("does not claim a different ground or a World Cup stadium", () => {
    assert.equal(lookupFootballVenuePhoto("Camp Nou"), null);
    assert.equal(lookupFootballVenuePhoto("Goodison Park"), null);
    assert.equal(lookupFootballVenuePhoto("Los Angeles Memorial Coliseum"), null);
    assert.equal(lookupFootballVenuePhoto("MetLife Stadium"), null);
    assert.equal(lookupFootballVenuePhoto("White Hart Lane"), null);
  });

  it("stores every catalog aerial on disk and leaves no unused file", () => {
    const dir = new URL("../public/venues/football/", import.meta.url);
    const onDisk = readdirSync(dir).filter((name) => name.endsWith(".webp")).sort();
    const expected = photos.map((photo) => `${photo.slug}.webp`).sort();
    assert.deepEqual(onDisk, expected);
    for (const name of expected) {
      assert.equal(existsSync(new URL(name, dir)), true, name);
    }
  });

  it("keeps slugs unique and stores no credit or license fields", () => {
    const slugs = new Set<string>();
    for (const photo of photos) {
      assert.equal(slugs.has(photo.slug), false, photo.slug);
      slugs.add(photo.slug);
      assert.equal(photo.file, `/venues/football/${photo.slug}.webp`);
      assert.equal("license" in photo, false);
      assert.equal("author" in photo, false);
      assert.equal("sourceUrl" in photo, false);
      const image = lookupFootballVenuePhoto(photo.venue);
      assert.equal(image?.width, 1600);
      assert.equal(image?.height, 1067);
      assert.equal("credit" in (image ?? {}), false);
    }
  });
});
