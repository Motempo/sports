import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildLaLigaClubTeamInfo } from "./la-liga-clubs.ts";
import { buildClubTeamInfo } from "./league-standings.ts";
import {
  clubDisplayName,
  listClubDisplayNames,
  presentTeamName,
  stripClubLegalForm,
  withDisplayedClubs,
} from "./club-display-name.ts";
import type { MatchInfo, TeamInfo } from "./types.ts";

function team(code: string, name: string): TeamInfo {
  return { code, name, iso2: "es" };
}

function match(stage: MatchInfo["stage"], home: TeamInfo, away: TeamInfo): MatchInfo {
  return {
    id: 1,
    round: "R32",
    stage,
    homeTeam: home,
    awayTeam: away,
    homeScore: null,
    awayScore: null,
    status: "SCHEDULED",
    utcDate: "2026-10-09T10:00:00Z",
    venue: "Estadio La Rosaleda",
  };
}

describe("clubDisplayName", () => {
  test("maps long La Liga official names to one accented display name", () => {
    const cases: Array<[string, string]> = [
      ["RCD Espanyol de Barcelona", "Espanyol"],
      ["Málaga CF", "Málaga"],
      ["Real Madrid CF", "Real Madrid"],
      ["Club Atlético de Madrid", "Atlético Madrid"],
      ["Atlético", "Atlético Madrid"],
      ["Athletic Bilbao", "Athletic Club"],
      ["Athletic", "Athletic Club"],
      ["Real Sociedad de Fútbol", "Real Sociedad"],
      ["FC Barcelona", "Barcelona"],
      ["Deportivo Alavés", "Alavés"],
      ["CD Leganés", "Leganés"],
    ];
    for (const [official, display] of cases) {
      assert.equal(clubDisplayName({ name: official }), display, official);
      assert.equal(clubDisplayName({ shortName: official }), display, official);
    }
  });

  test("uses the club code even when the feed name is long or missing", () => {
    assert.equal(
      clubDisplayName({ code: "ESP", name: "RCD Espanyol de Barcelona", shortName: "RCD Espanyol" }),
      "Espanyol"
    );
    assert.equal(clubDisplayName({ code: "MAL" }), "Málaga");
    assert.equal(clubDisplayName({ code: "ATL", name: "Club Atlético de Madrid" }), "Atlético Madrid");
    assert.equal(clubDisplayName({ code: "ATH" }), "Athletic Club");
  });

  test("maps Premier League official names to one short style", () => {
    assert.equal(clubDisplayName({ name: "Manchester United FC" }), "Man United");
    assert.equal(clubDisplayName({ code: "MUN", shortName: "Man Utd" }), "Man United");
    assert.equal(clubDisplayName({ name: "Manchester City FC" }), "Man City");
    assert.equal(clubDisplayName({ name: "Tottenham Hotspur FC" }), "Spurs");
    assert.equal(clubDisplayName({ name: "AFC Bournemouth" }), "Bournemouth");
    assert.equal(clubDisplayName({ name: "Brighton & Hove Albion FC" }), "Brighton");
    assert.equal(clubDisplayName({ name: "Nottingham Forest FC" }), "Nott'm Forest");
    assert.equal(clubDisplayName({ name: "Wolverhampton Wanderers FC" }), "Wolves");
    assert.equal(clubDisplayName({ name: "West Ham United FC" }), "West Ham");
  });

  test("returns the same display name for every alias of a club", () => {
    const espanyol = [
      clubDisplayName({ code: "ESP" }),
      clubDisplayName({ name: "RCD Espanyol de Barcelona" }),
      clubDisplayName({ name: "Espanyol" }),
      clubDisplayName({ shortName: "RCD Espanyol" }),
    ];
    assert.deepEqual(espanyol, ["Espanyol", "Espanyol", "Espanyol", "Espanyol"]);

    const united = [
      clubDisplayName({ code: "MUN", name: "Manchester United FC" }),
      clubDisplayName({ name: "Manchester United" }),
      clubDisplayName({ shortName: "Man United" }),
    ];
    assert.deepEqual(united, ["Man United", "Man United", "Man United"]);
  });

  test("keeps accents and never returns a blank name", () => {
    assert.equal(clubDisplayName({ name: "Málaga CF" }), "Málaga");
    assert.equal(clubDisplayName({}), "Club");
    assert.equal(clubDisplayName({ name: "   ", shortName: "…" }), "Club");
    assert.equal(clubDisplayName({ code: "ZZZ", name: "" }), "ZZZ");
  });

  test("strips legal tokens from an unknown club instead of dropping the name", () => {
    assert.equal(stripClubLegalForm("UD Almería CF"), "Almería");
    assert.equal(clubDisplayName({ name: "UD Almería CF" }), "Almería");
    assert.equal(clubDisplayName({ code: "NEWCLUB", shortName: "Foo Bar" }), "Foo Bar");
  });

  test("every mapped code round-trips to its display name", () => {
    const seen = new Set<string>();
    for (const club of listClubDisplayNames()) {
      assert.equal(seen.has(club.code), false, club.code);
      seen.add(club.code);
      assert.equal(clubDisplayName({ code: club.code }), club.display);
      assert.equal(clubDisplayName({ name: club.display }), club.display);
      assert.ok(club.display.trim().length > 0);
    }
  });
});

describe("league team builders", () => {
  test("stores the display name on both name and shortName", () => {
    const espanyol = buildLaLigaClubTeamInfo("ESP", "RCD Espanyol de Barcelona", undefined, "RCD Espanyol");
    assert.equal(espanyol.name, "Espanyol");
    assert.equal(espanyol.shortName, "Espanyol");

    const malaga = buildLaLigaClubTeamInfo("MAL", "Málaga CF");
    assert.equal(malaga.name, "Málaga");
    assert.equal(malaga.shortName, "Málaga");

    const united = buildClubTeamInfo("MUN", "Manchester United FC", undefined, "Man Utd");
    assert.equal(united.name, "Man United");
    assert.equal(united.shortName, "Man United");

    const city = buildClubTeamInfo("MCI", "Manchester City FC");
    assert.equal(city.name, "Man City");
  });
});

describe("withDisplayedClubs", () => {
  test("rewrites league fixtures and leaves national teams alone", () => {
    const league = withDisplayedClubs(
      match(
        "LEAGUE",
        team("MAL", "Málaga CF"),
        team("ESP", "RCD Espanyol de Barcelona")
      )
    );
    assert.equal(league.homeTeam.name, "Málaga");
    assert.equal(league.awayTeam.name, "Espanyol");
    assert.equal(league.homeTeam.shortName, "Málaga");

    const spain = team("ESP", "Spain");
    const group = withDisplayedClubs(match("GROUP", spain, team("FRA", "France")));
    assert.equal(group.homeTeam.name, "Spain");
    assert.equal(group.awayTeam.name, "France");
    assert.equal(presentTeamName({ name: "", code: "FRA" }), "FRA");
  });
});
