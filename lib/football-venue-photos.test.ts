import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  listFootballVenuePhotos,
  lookupFootballVenuePhoto,
  normalizeVenueName,
} from "./football-venue-photos.ts";

const laLigaVenues = JSON.parse(
  readFileSync(new URL("../data/la-liga-home-venues.json", import.meta.url), "utf8")
) as Array<{ venue: string }>;
const plVenues = JSON.parse(
  readFileSync(new URL("../data/pl-home-venues.json", import.meta.url), "utf8")
) as Array<{ venue: string }>;
const wcStadiums = JSON.parse(
  readFileSync(new URL("../data/wc2026-stadiums.json", import.meta.url), "utf8")
) as Array<{ venue: string }>;

const ALLOWED_LICENSE = /^(CC0|CC BY \d|CC BY-SA \d|Public domain)/;

describe("football venue photos", () => {
  const photos = listFootballVenuePhotos();

  it("covers every La Liga, Premier League, and World Cup ground the pages can show", () => {
    for (const venue of laLigaVenues as Array<{ venue: string }>) {
      assert.ok(lookupFootballVenuePhoto(venue.venue), venue.venue);
    }
    for (const venue of plVenues as Array<{ venue: string }>) {
      assert.ok(lookupFootballVenuePhoto(venue.venue), venue.venue);
    }
    for (const stadium of wcStadiums as Array<{ venue: string }>) {
      assert.ok(lookupFootballVenuePhoto(stadium.venue), stadium.venue);
    }
    assert.equal(photos.length, laLigaVenues.length + plVenues.length + wcStadiums.length);
  });

  it("matches the home ground after accent folding and a trailing city", () => {
    const image = lookupFootballVenuePhoto("Estadio Ramon Sanchez-Pizjuan, Sevilla");
    assert.equal(image?.url, "/venues/football/sanchez-pizjuan.webp");
    assert.equal(normalizeVenueName("St. James' Park"), "st james park");
    assert.match(lookupFootballVenuePhoto("St James Park")?.alt ?? "", /St\. James/);
  });

  it("does not treat a different ground as the catalog venue", () => {
    assert.equal(lookupFootballVenuePhoto("Camp Nou"), null);
    assert.equal(lookupFootballVenuePhoto("Goodison Park"), null);
    assert.equal(lookupFootballVenuePhoto("Los Angeles Memorial Coliseum"), null);
    assert.equal(lookupFootballVenuePhoto("White Hart Lane"), null);
  });

  it("stores a same-origin file with an allowed license and a Commons credit", () => {
    for (const photo of photos) {
      assert.equal(photo.file.startsWith("/venues/football/"), true, photo.id);
      assert.equal(
        existsSync(fileURLToPath(new URL(`../public${photo.file}`, import.meta.url))),
        true,
        photo.file
      );
      assert.match(photo.license, ALLOWED_LICENSE, `${photo.id} ${photo.license}`);
      assert.doesNotMatch(photo.license, /NC|ND|rights reserved/i, photo.id);
      assert.equal(photo.sourceUrl.startsWith("https://commons.wikimedia.org/wiki/File:"), true, photo.id);
      assert.ok(photo.author.trim(), photo.id);
      assert.ok(photo.width >= 700 && photo.height >= 400, photo.id);
      const image = lookupFootballVenuePhoto(photo.venue);
      assert.equal(image?.url, photo.file);
      assert.equal(image?.credit?.author, photo.author);
      assert.equal(image?.credit?.license, photo.license);
      assert.equal(image?.credit?.sourceUrl, photo.sourceUrl);
      assert.equal(image?.width, photo.width);
      assert.equal(image?.height, photo.height);
    }
  });
});
