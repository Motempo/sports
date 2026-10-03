import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { buildEspnLeagueMatches, explicitEspnRound } from "./espn-league-data.ts";
import { computeLeagueStandings } from "./league-standings.ts";
import {
  assignLeagueMatchdays,
  highestFinishedMatchday,
  type LeagueRoundFixture,
} from "./league-matchdays.ts";
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

const CLUBS = Array.from({ length: 20 }, (_, index) => `T${String(index).padStart(2, "0")}`);

function kickoff(day: string, time = "15:00:00"): string {
  return `${day}T${time}Z`;
}

/** Pair distinct clubs so each club appears once. `offset` rotates the away half. */
function slate(
  day: string,
  count: number,
  idPrefix: string,
  offset = 0,
  time = "15:00:00"
): LeagueRoundFixture[] {
  const fixtures: LeagueRoundFixture[] = [];
  for (let index = 0; index < count; index++) {
    const home = CLUBS[index]!;
    const away = CLUBS[10 + ((index + offset) % 10)]!;
    fixtures.push({
      id: `${idPrefix}-${index}`,
      kickoff: kickoff(day, time),
      homeKey: home,
      awayKey: away,
    });
  }
  return fixtures;
}

function roundsOf(fixtures: LeagueRoundFixture[]): number[] {
  return assignLeagueMatchdays(fixtures);
}

function roundById(fixtures: LeagueRoundFixture[]): Map<string, number> {
  const numbers = roundsOf(fixtures);
  return new Map(fixtures.map((fixture, index) => [fixture.id, numbers[index]!]));
}

function assertOneAppearance(fixtures: LeagueRoundFixture[], numbers: number[]) {
  const byRound = new Map<number, string[]>();
  fixtures.forEach((fixture, index) => {
    const round = numbers[index]!;
    const clubs = byRound.get(round) ?? [];
    clubs.push(fixture.homeKey, fixture.awayKey);
    byRound.set(round, clubs);
  });
  for (const [round, clubs] of byRound) {
    assert.equal(new Set(clubs).size, clubs.length, `club played twice in round ${round}`);
  }
}

function team(code: string): TeamInfo {
  return { code, name: code, shortName: code, iso2: "gb" };
}

function finishedMatch(
  id: number,
  group: string | undefined,
  home: string,
  away: string,
  status: MatchInfo["status"] = "FINISHED"
): MatchInfo {
  const done = status === "FINISHED";
  return {
    id,
    round: "R32",
    stage: "LEAGUE",
    group,
    homeTeam: team(home),
    awayTeam: team(away),
    homeScore: done ? 1 : null,
    awayScore: done ? 0 : null,
    status,
    utcDate: "2026-09-01T15:00:00Z",
    venue: "",
  };
}

describe("assignLeagueMatchdays", () => {
  test("numbers weekend slates separated by a gap as consecutive rounds", () => {
    const fixtures = [
      ...slate("2026-08-15", 10, "r1"),
      ...slate("2026-08-22", 10, "r2", 1),
      ...slate("2026-08-29", 10, "r3", 2),
    ];
    const numbers = roundsOf(fixtures);
    assert.deepEqual(
      fixtures.map((fixture, index) => [fixture.id.slice(0, 2), numbers[index]]),
      fixtures.map((fixture) => [fixture.id.slice(0, 2), Number(fixture.id[1])])
    );
    assertOneAppearance(fixtures, numbers);
  });

  test("a short midweek round does not pull the next weekend back a week", () => {
    // 10 + 6 + 10 + 10 + 2. Index/10 labels the last two games matchday 4
    // (ceil(38/10)); they are matchweek 5.
    const fixtures = [
      ...slate("2026-08-15", 10, "r1"),
      ...slate("2026-08-19", 6, "r2", 3, "19:45:00"),
      ...slate("2026-08-23", 10, "r3", 1),
      ...slate("2026-08-30", 10, "r4", 2),
      ...slate("2026-09-06", 2, "r5", 4),
    ];
    const byId = roundById(fixtures);
    for (const fixture of fixtures) {
      assert.equal(byId.get(fixture.id), Number(fixture.id[1]), fixture.id);
    }
    assertOneAppearance(fixtures, roundsOf(fixtures));

    const labeled = fixtures.map((fixture, index) =>
      finishedMatch(index + 1, `Matchday ${byId.get(fixture.id)}`, "AAA", "BBB")
    );
    assert.equal(highestFinishedMatchday(labeled), 5);
  });

  test("a postponed match between later weeks keeps those week numbers", () => {
    const round1 = slate("2026-08-15", 10, "r1");
    const postponed = round1.pop()!;
    postponed.kickoff = kickoff("2026-09-08", "19:45:00");
    postponed.id = "postponed";
    const fixtures = [
      ...round1,
      ...slate("2026-08-22", 10, "r2", 1),
      ...slate("2026-08-29", 10, "r3", 2),
      ...slate("2026-09-05", 10, "r4", 3),
      postponed,
      ...slate("2026-09-12", 10, "r5", 4),
    ];
    const byId = roundById(fixtures);
    assert.equal(byId.get("postponed"), 1);
    for (let week = 2; week <= 5; week++) {
      for (let index = 0; index < 10; index++) {
        assert.equal(byId.get(`r${week}-${index}`), week);
      }
    }
    assertOneAppearance(fixtures, roundsOf(fixtures));
  });

  test("a postponement two days before the next week is not glued onto that week", () => {
    const round1 = slate("2026-08-15", 10, "r1");
    const postponed = round1.pop()!;
    postponed.id = "postponed";
    // 2 days and a few hours before the next slate — close enough to be
    // grouped with it, far enough to be an edge postponement.
    postponed.kickoff = kickoff("2026-08-20", "12:00:00");
    const round2 = CLUBS.slice(0, 9).map((home, index) => ({
      id: `r2-${index}`,
      kickoff: kickoff("2026-08-22"),
      homeKey: home,
      awayKey: CLUBS[index + 10]!,
    }));
    const fixtures = [
      ...round1,
      postponed,
      ...round2,
      ...slate("2026-08-29", 10, "r3", 2),
    ];
    const byId = roundById(fixtures);
    assert.equal(byId.get("postponed"), 1);
    for (const fixture of round2) assert.equal(byId.get(fixture.id), 2);
    for (let index = 0; index < 10; index++) assert.equal(byId.get(`r3-${index}`), 3);
    assertOneAppearance(fixtures, roundsOf(fixtures));
  });

  test("two halves of one matchweek a few days apart stay one round", () => {
    const first = slate("2026-08-15", 5, "half-a");
    const second = CLUBS.slice(5, 10).map((home, index) => ({
      id: `half-b-${index}`,
      kickoff: kickoff("2026-08-21", "20:00:00"),
      homeKey: home,
      awayKey: CLUBS[index + 15]!,
    }));
    const fixtures = [...first, ...second, ...slate("2026-08-29", 10, "next", 1)];
    const byId = roundById(fixtures);
    for (const fixture of [...first, ...second]) assert.equal(byId.get(fixture.id), 1);
    for (let index = 0; index < 10; index++) assert.equal(byId.get(`next-${index}`), 2);
    assertOneAppearance(fixtures, roundsOf(fixtures));
  });

  test("an ESPN week number wins over the kickoff date", () => {
    const fixtures = slate("2026-09-12", 10, "late", 1).map((fixture, index) => ({
      ...fixture,
      explicitRound: index === 0 ? 2 : 6,
      kickoff: kickoff(index === 0 ? "2026-10-01" : "2026-09-12"),
    }));
    const numbers = roundsOf(fixtures);
    assert.equal(numbers[0], 2);
    for (let index = 1; index < numbers.length; index++) assert.equal(numbers[index], 6);
  });
});

describe("highestFinishedMatchday", () => {
  test("is the highest finished round, not a later scheduled week or an earlier postponement", () => {
    const matches = [
      finishedMatch(1, "Matchday 2", "AAA", "BBB"),
      finishedMatch(2, "Matchday 5", "CCC", "DDD"),
      finishedMatch(3, "Matchday 6", "EEE", "FFF", "SCHEDULED"),
      finishedMatch(4, "Matchday 1", "GGG", "HHH", "POSTPONED"),
    ];
    assert.equal(highestFinishedMatchday(matches), 5);
    assert.equal(highestFinishedMatchday([]), 0);
    assert.equal(
      highestFinishedMatchday([finishedMatch(1, "Matchday 40", "AAA", "BBB")]),
      38
    );
  });

  test("falls back to the most games any club has finished when rounds are unlabeled", () => {
    const matches = [
      finishedMatch(1, undefined, "AAA", "BBB"),
      finishedMatch(2, undefined, "AAA", "CCC"),
      finishedMatch(3, undefined, "BBB", "CCC"),
    ];
    assert.equal(highestFinishedMatchday(matches), 2);
  });

  test("computeLeagueStandings reports that round while points follow the results", () => {
    const matches = [
      finishedMatch(1, "Matchday 2", "AAA", "BBB"),
      finishedMatch(2, "Matchday 5", "CCC", "DDD"),
      finishedMatch(3, "Matchday 6", "EEE", "FFF", "SCHEDULED"),
    ];
    const standings = computeLeagueStandings(matches, "2026/27", [
      team("AAA"),
      team("BBB"),
      team("CCC"),
      team("DDD"),
      team("EEE"),
      team("FFF"),
    ]);
    assert.equal(standings.matchday, 5);
    assert.equal(standings.totalMatchdays, 38);
    const aaa = standings.rows.find((row) => row.team.code === "AAA");
    const bbb = standings.rows.find((row) => row.team.code === "BBB");
    assert.equal(aaa?.points, 3);
    assert.equal(aaa?.played, 1);
    assert.equal(bbb?.points, 0);
    assert.equal(bbb?.played, 1);
    assert.equal(standings.rows.find((row) => row.team.code === "EEE")?.played, 0);
  });
});

describe("ESPN matchday labels", () => {
  const options = {
    resolveCode: (name: string) => name.slice(0, 3).toUpperCase(),
    buildTeam: (code: string, name?: string) => team(name ?? code),
  };

  function event(
    id: string,
    day: string,
    home: string,
    away: string,
    extra: Record<string, unknown> = {}
  ) {
    return {
      id,
      date: kickoff(day),
      ...extra,
      competitions: [
        {
          competitors: [
            { homeAway: "home" as const, team: { displayName: home, abbreviation: home.slice(0, 3) }, score: "1" },
            { homeAway: "away" as const, team: { displayName: away, abbreviation: away.slice(0, 3) }, score: "0" },
          ],
          status: { type: { state: "post", completed: true, description: "Full Time" } },
          venue: { fullName: "Test Ground" },
          ...(extra.competition as object | undefined),
        },
      ],
    };
  }

  test("reads week.number and Matchweek notes", () => {
    assert.equal(
      explicitEspnRound(event("1", "2026-08-15", "Arsenal", "Chelsea", { week: { number: 4 } })),
      4
    );
    assert.equal(
      explicitEspnRound(event("2", "2026-08-15", "Arsenal", "Chelsea", { week: 9 })),
      9
    );
    assert.equal(
      explicitEspnRound(
        event("3", "2026-08-15", "Arsenal", "Chelsea", {
          competition: { notes: [{ headline: "Matchweek 12" }] },
        })
      ),
      12
    );
    assert.equal(explicitEspnRound(event("4", "2026-08-15", "Arsenal", "Chelsea")), null);
  });

  test("labels a scoreboard from week numbers even when a kickoff has moved", () => {
    const events = CLUBS.slice(0, 10).map((home, index) => {
      const away = CLUBS[index + 10]!;
      const postponed = index === 0;
      return event(String(index), postponed ? "2026-10-20" : "2026-09-12", home, away, {
        week: postponed ? 2 : 6,
      });
    });
    const matches = buildEspnLeagueMatches(events, "eng.1", options);
    const postponed = matches.find((match) => match.utcDate.startsWith("2026-10-20"));
    assert.equal(postponed?.group, "Matchday 2");
    assert.ok(matches.filter((match) => match.group === "Matchday 6").length === 9);
  });

  test("infers rounds when the scoreboard has no week field", () => {
    const events = [
      ...slate("2026-08-15", 10, "r1").map((fixture) =>
        event(fixture.id, "2026-08-15", fixture.homeKey, fixture.awayKey)
      ),
      ...slate("2026-08-19", 6, "r2", 3).map((fixture) =>
        event(fixture.id, "2026-08-19", fixture.homeKey, fixture.awayKey)
      ),
      ...slate("2026-08-23", 10, "r3", 1).map((fixture) =>
        event(fixture.id, "2026-08-23", fixture.homeKey, fixture.awayKey)
      ),
    ];
    const matches = buildEspnLeagueMatches(events, "esp.1", options);
    const groups = new Map(matches.map((match) => [match.id, match.group]));
    // Ids are hashed, so check by venue date + team codes via utcDate buckets.
    const byDay = new Map<string, Set<string>>();
    for (const match of matches) {
      const day = match.utcDate.slice(0, 10);
      const set = byDay.get(day) ?? new Set<string>();
      if (match.group) set.add(match.group);
      byDay.set(day, set);
    }
    assert.deepEqual(byDay.get("2026-08-15"), new Set(["Matchday 1"]));
    assert.deepEqual(byDay.get("2026-08-19"), new Set(["Matchday 2"]));
    assert.deepEqual(byDay.get("2026-08-23"), new Set(["Matchday 3"]));
    assert.equal(groups.size, 26);
  });
});
