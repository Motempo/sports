import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { isEspnEventInSeason } from "./espn-league-data.ts";
import { pickFreshestLeagueCandidate } from "./league-data-cascade.ts";
import type { LeagueCascadeCandidate } from "./league-data-cascade.ts";
import type { MatchInfo, TeamInfo } from "./types.ts";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = (() => {
    throw new Error("unit tests must not hit the network");
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function team(code: string): TeamInfo {
  return { code, name: code, shortName: code, iso2: "xx" };
}

function match(id: number, status: MatchInfo["status"]): MatchInfo {
  const finished = status === "FINISHED";
  return {
    id,
    round: "R32",
    stage: "LEAGUE",
    group: "Matchday 1",
    homeTeam: team("HOM"),
    awayTeam: team("AWY"),
    homeScore: finished ? 1 : null,
    awayScore: finished ? 0 : null,
    status,
    utcDate: "2026-08-15T15:00:00Z",
    venue: "Test Stadium",
  };
}

function board(
  source: LeagueCascadeCandidate["source"],
  finished: number,
  scheduled = 0
): LeagueCascadeCandidate {
  const matches = [
    ...Array.from({ length: finished }, (_, index) => match(index + 1, "FINISHED")),
    ...Array.from({ length: scheduled }, (_, index) =>
      match(finished + index + 1, "SCHEDULED")
    ),
  ];
  return { source, matches };
}

describe("pickFreshestLeagueCandidate", () => {
  test("returns null when every candidate is missing or shorter than 10 matches", () => {
    assert.equal(pickFreshestLeagueCandidate([null, undefined]), null);
    assert.equal(
      pickFreshestLeagueCandidate([board("api", 9), board("espn", 0, 9)]),
      null
    );
  });

  test("accepts a board of exactly 10 matches", () => {
    const chosen = pickFreshestLeagueCandidate([board("openfootball", 0, 10)]);
    assert.equal(chosen?.source, "openfootball");
    assert.equal(chosen?.matches.length, 10);
  });

  test("prefers more finished matches over a higher-ranked source", () => {
    const chosen = pickFreshestLeagueCandidate([
      board("api", 10),
      board("openfootball", 11),
      board("espn", 12, 20),
    ]);
    assert.equal(chosen?.source, "espn");
    assert.equal(chosen?.matches.filter((match) => match.status === "FINISHED").length, 12);
  });

  test("breaks a finished-count tie by source: api, then espn, then openfootball", () => {
    const tied = [board("openfootball", 12), board("espn", 12), board("api", 12, 5)];
    assert.equal(pickFreshestLeagueCandidate(tied)?.source, "api");
    assert.equal(
      pickFreshestLeagueCandidate([board("openfootball", 12), board("espn", 12)])?.source,
      "espn"
    );
    assert.equal(
      pickFreshestLeagueCandidate([board("espn", 8, 4), board("api", 8, 2)])?.source,
      "api"
    );
  });

  test("does not count in-play matches as finished, and still returns a live-only board", () => {
    const liveOnly: LeagueCascadeCandidate = {
      source: "espn",
      matches: Array.from({ length: 10 }, (_, index) => match(index + 1, "IN_PLAY")),
    };
    assert.equal(pickFreshestLeagueCandidate([liveOnly])?.source, "espn");
    assert.equal(
      pickFreshestLeagueCandidate([liveOnly, board("openfootball", 1, 9)])?.source,
      "openfootball"
    );
  });

  test("skips null entries around a viable board", () => {
    const chosen = pickFreshestLeagueCandidate([null, board("api", 10), undefined]);
    assert.equal(chosen?.source, "api");
  });
});

describe("isEspnEventInSeason", () => {
  test("keeps the European season window from July 1 through the following June", () => {
    assert.equal(isEspnEventInSeason("2026-08-15T12:00:00Z", 2026), true);
    assert.equal(isEspnEventInSeason("2027-05-15T12:00:00Z", 2026), true);
    assert.equal(isEspnEventInSeason("2026-01-15T12:00:00Z", 2026), false);
    assert.equal(isEspnEventInSeason("2027-06-30", 2026), true);
  });

  test("includes the season start day and excludes the next July 1", () => {
    assert.equal(isEspnEventInSeason("2026-07-01T00:00:00Z", 2026), true);
    assert.equal(isEspnEventInSeason("2026-06-30T23:00:00Z", 2026), false);
    assert.equal(isEspnEventInSeason("2027-07-01", 2026), false);
  });

  test("rejects values that are not a YYYY-MM-DD day", () => {
    assert.equal(isEspnEventInSeason("", 2026), false);
    assert.equal(isEspnEventInSeason("not-a-date", 2026), false);
    assert.equal(isEspnEventInSeason("2026-8-15", 2026), false);
    assert.equal(isEspnEventInSeason("15-08-2026", 2026), false);
  });
});
