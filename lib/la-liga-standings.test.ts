import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, test } from "node:test";
import type { MatchInfo, MatchStatus, TeamInfo } from "./types.ts";
import { computeLeagueStandings as laLigaStandings } from "./la-liga-standings.ts";

// `league-standings.ts` imports seed JSON without an import attribute (Next
// bundles that). Register the loader before the dynamic import below.
register("../scripts/node-test-json-hook.mjs", import.meta.url);
const { computeLeagueStandings: premierLeagueStandings } = await import("./league-standings.ts");

function team(code: string, name = code): TeamInfo {
  return { code, name, iso2: "es" };
}

let nextId = 1;

function match(
  home: TeamInfo,
  away: TeamInfo,
  homeScore: number,
  awayScore: number,
  status: MatchStatus = "FINISHED"
): MatchInfo {
  const finished = status === "FINISHED";
  return {
    id: nextId++,
    round: "R32",
    stage: "LEAGUE",
    group: "1",
    homeTeam: home,
    awayTeam: away,
    homeScore: finished ? homeScore : null,
    awayScore: finished ? awayScore : null,
    status,
    utcDate: "2026-10-01T15:00:00Z",
    venue: "Estadio",
  };
}

function tiedOrder(
  standings: { rows: Array<{ team: { code: string } }> },
  codes: string[]
): string[] {
  return standings.rows.map((row) => row.team.code).filter((code) => codes.includes(code));
}

function pointsOf(standings: { rows: Array<{ team: { code: string }; points: number }> }, code: string) {
  const row = standings.rows.find((item) => item.team.code === code);
  assert.ok(row, `missing ${code}`);
  return row.points;
}

describe("La Liga head-to-head tie-break", () => {
  test("two clubs level on points are split by head-to-head goal difference", () => {
    const bar = team("BAR", "Barcelona");
    const rma = team("RMA", "Real Madrid");
    const ath = team("ATH", "Athletic");
    const sev = team("SEV", "Sevilla");
    const matches = [
      match(bar, rma, 3, 0),
      match(rma, bar, 1, 0),
      match(rma, ath, 6, 0),
      match(bar, sev, 1, 0),
    ];
    const clubs = [bar, rma, ath, sev];
    const laLiga = laLigaStandings(matches, "2026/27", clubs);
    const premier = premierLeagueStandings(matches, "2026/27", clubs);

    assert.equal(pointsOf(laLiga, "BAR"), pointsOf(laLiga, "RMA"));
    assert.deepEqual(tiedOrder(laLiga, ["BAR", "RMA"]), ["BAR", "RMA"]);
    assert.deepEqual(tiedOrder(premier, ["BAR", "RMA"]), ["RMA", "BAR"]);
  });

  test("a single meeting does not count until the return is played", () => {
    const bar = team("BAR", "Barcelona");
    const rma = team("RMA", "Real Madrid");
    const ath = team("ATH", "Athletic");
    const matches = [
      match(bar, rma, 1, 0),
      match(rma, bar, 0, 0, "SCHEDULED"),
      match(rma, ath, 4, 0),
    ];
    const clubs = [bar, rma, ath];
    const laLiga = laLigaStandings(matches, "2026/27", clubs);
    const premier = premierLeagueStandings(matches, "2026/27", clubs);

    assert.equal(pointsOf(laLiga, "BAR"), 3);
    assert.equal(pointsOf(laLiga, "RMA"), 3);
    assert.deepEqual(tiedOrder(laLiga, ["BAR", "RMA"]), ["RMA", "BAR"]);
    assert.deepEqual(tiedOrder(premier, ["BAR", "RMA"]), ["RMA", "BAR"]);
  });

  test("three clubs with different mini-table points ignore overall goal difference", () => {
    const ala = team("ALA", "Alaves");
    const bet = team("BET", "Betis");
    const cel = team("CEL", "Celta");
    const dep = team("DEP", "Deportivo");
    const esp = team("ESP", "Espanyol");
    const matches = [
      match(ala, bet, 1, 0),
      match(ala, bet, 1, 0),
      match(bet, cel, 1, 0),
      match(bet, cel, 1, 0),
      match(ala, cel, 0, 0),
      match(cel, ala, 0, 0),
      match(bet, dep, 0, 0),
      match(bet, esp, 0, 0),
      match(cel, dep, 5, 0),
      match(cel, esp, 5, 0),
    ];
    const clubs = [ala, bet, cel, dep, esp];
    const focus = ["ALA", "BET", "CEL"];
    const laLiga = laLigaStandings(matches, "2026/27", clubs);
    const premier = premierLeagueStandings(matches, "2026/27", clubs);

    assert.equal(pointsOf(laLiga, "ALA"), 8);
    assert.equal(pointsOf(laLiga, "BET"), 8);
    assert.equal(pointsOf(laLiga, "CEL"), 8);
    assert.deepEqual(tiedOrder(laLiga, focus), ["ALA", "BET", "CEL"]);
    assert.deepEqual(tiedOrder(premier, focus), ["CEL", "ALA", "BET"]);
  });

  test("three clubs level on mini-table points are split by head-to-head goal difference", () => {
    const ala = team("ALA", "Alaves");
    const bet = team("BET", "Betis");
    const cel = team("CEL", "Celta");
    const dep = team("DEP", "Deportivo");
    const esp = team("ESP", "Espanyol");
    const osa = team("OSA", "Osasuna");
    const matches = [
      match(ala, bet, 3, 0),
      match(bet, ala, 1, 0),
      match(ala, cel, 3, 0),
      match(cel, ala, 1, 0),
      match(bet, cel, 2, 0),
      match(cel, bet, 1, 0),
      match(cel, dep, 10, 0),
      match(ala, esp, 1, 0),
      match(bet, osa, 1, 0),
    ];
    const clubs = [ala, bet, cel, dep, esp, osa];
    const focus = ["ALA", "BET", "CEL"];
    const laLiga = laLigaStandings(matches, "2026/27", clubs);
    const premier = premierLeagueStandings(matches, "2026/27", clubs);

    for (const code of focus) assert.equal(pointsOf(laLiga, code), 9);
    assert.deepEqual(tiedOrder(laLiga, focus), ["ALA", "BET", "CEL"]);
    assert.deepEqual(tiedOrder(premier, focus), ["CEL", "ALA", "BET"]);
  });

  test("a pair still level in the mini-table uses goal difference between that pair", () => {
    const ala = team("ALA", "Alaves");
    const bet = team("BET", "Betis");
    const cel = team("CEL", "Celta");
    const dep = team("DEP", "Deportivo");
    const esp = team("ESP", "Espanyol");
    const osa = team("OSA", "Osasuna");
    const ray = team("RAY", "Rayo");
    const val = team("VAL", "Valencia");
    const matches = [
      match(ala, bet, 1, 0),
      match(bet, ala, 0, 0),
      match(bet, cel, 1, 0),
      match(bet, cel, 1, 0),
      match(ala, cel, 1, 0),
      match(cel, ala, 1, 0),
      match(ala, dep, 1, 0),
      match(bet, esp, 5, 0),
      match(cel, osa, 1, 0),
      match(cel, ray, 1, 0),
      match(cel, val, 0, 0),
    ];
    const clubs = [ala, bet, cel, dep, esp, osa, ray, val];
    const focus = ["ALA", "BET", "CEL"];
    const laLiga = laLigaStandings(matches, "2026/27", clubs);

    for (const code of focus) assert.equal(pointsOf(laLiga, code), 10);
    assert.deepEqual(tiedOrder(laLiga, focus), ["ALA", "BET", "CEL"]);
  });

  test("an unfinished mini-table falls back to overall goal difference", () => {
    const ala = team("ALA", "Alaves");
    const bet = team("BET", "Betis");
    const cel = team("CEL", "Celta");
    const dep = team("DEP", "Deportivo");
    const esp = team("ESP", "Espanyol");
    const osa = team("OSA", "Osasuna");
    const ray = team("RAY", "Rayo");
    const matches = [
      match(ala, bet, 1, 0),
      match(ala, cel, 1, 0),
      match(bet, dep, 4, 0),
      match(bet, esp, 4, 0),
      match(cel, osa, 1, 0),
      match(cel, ray, 1, 0),
    ];
    const clubs = [ala, bet, cel, dep, esp, osa, ray];
    const focus = ["ALA", "BET", "CEL"];
    const laLiga = laLigaStandings(matches, "2026/27", clubs);
    const premier = premierLeagueStandings(matches, "2026/27", clubs);

    for (const code of focus) assert.equal(pointsOf(laLiga, code), 6);
    assert.deepEqual(tiedOrder(laLiga, focus), ["BET", "ALA", "CEL"]);
    assert.deepEqual(tiedOrder(premier, focus), ["BET", "ALA", "CEL"]);
  });

  test("goals scored split clubs when head-to-head and goal difference are level", () => {
    const gir = team("GIR", "Girona");
    const mll = team("MLL", "Mallorca");
    const osa = team("OSA", "Osasuna");
    const ray = team("RAY", "Rayo");
    const matches = [
      match(gir, mll, 1, 1),
      match(mll, gir, 0, 0),
      match(gir, osa, 2, 1),
      match(mll, ray, 3, 2),
    ];
    const clubs = [gir, mll, osa, ray];
    const laLiga = laLigaStandings(matches, "2026/27", clubs);
    const premier = premierLeagueStandings(matches, "2026/27", clubs);

    assert.equal(pointsOf(laLiga, "GIR"), pointsOf(laLiga, "MLL"));
    assert.deepEqual(tiedOrder(laLiga, ["GIR", "MLL"]), ["MLL", "GIR"]);
    assert.deepEqual(tiedOrder(premier, ["GIR", "MLL"]), ["MLL", "GIR"]);
  });

  test("club name orders a tie that the sporting criteria do not break", () => {
    const cad = team("CAD", "Cadiz");
    const sev = team("SEV", "Sevilla");
    const matches = [match(cad, sev, 0, 0), match(sev, cad, 0, 0)];
    const laLiga = laLigaStandings(matches, "2026/27", [cad, sev]);
    const premier = premierLeagueStandings(matches, "2026/27", [cad, sev]);

    assert.deepEqual(tiedOrder(laLiga, ["CAD", "SEV"]), ["CAD", "SEV"]);
    assert.deepEqual(tiedOrder(premier, ["CAD", "SEV"]), ["CAD", "SEV"]);
  });

  test("more points still ranks above any head-to-head result", () => {
    const bar = team("BAR", "Barcelona");
    const rma = team("RMA", "Real Madrid");
    const matches = [match(bar, rma, 1, 0)];
    const laLiga = laLigaStandings(matches, "2026/27", [bar, rma]);
    const premier = premierLeagueStandings(matches, "2026/27", [bar, rma]);

    assert.deepEqual(tiedOrder(laLiga, ["BAR", "RMA"]), ["BAR", "RMA"]);
    assert.deepEqual(tiedOrder(premier, ["BAR", "RMA"]), ["BAR", "RMA"]);
  });
});
