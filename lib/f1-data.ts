import type {
  F1ConstructorStandingRow,
  F1GrandPrix,
  F1RaceResult,
  F1SeasonData,
  F1SessionInfo,
  F1SessionStatus,
  F1SessionType,
  F1StandingRow,
  F1TitleFightInsight,
} from "@/lib/f1-types";
import { countRacesRemaining } from "@/lib/f1-phase";
import seedData from "@/data/f1-season-seed.json";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const OPENF1_BASE = "https://api.openf1.org/v1";

const COUNTRY_CODES: Record<string, string> = {
  Australia: "AU",
  China: "CN",
  Japan: "JP",
  USA: "US",
  Canada: "CA",
  Monaco: "MC",
  Spain: "ES",
  Austria: "AT",
  "United Kingdom": "GB",
  Belgium: "BE",
  Hungary: "HU",
  Netherlands: "NL",
  Italy: "IT",
  Azerbaijan: "AZ",
  Singapore: "SG",
  Mexico: "MX",
  Brazil: "BR",
  Qatar: "QA",
  "United Arab Emirates": "AE",
  Bahrain: "BH",
  "Saudi Arabia": "SA",
  Miami: "US",
};

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string };
  };
  FirstPractice?: { date: string; time: string };
  SecondPractice?: { date: string; time: string };
  ThirdPractice?: { date: string; time: string };
  Qualifying?: { date: string; time: string };
  Sprint?: { date: string; time: string };
  SprintQualifying?: { date: string; time: string };
  Results?: Array<{
    position: string;
    Driver: { code: string; givenName: string; familyName: string };
    Constructor: { name: string };
    status: string;
  }>;
}

function getSeasonYear(): number {
  const env = process.env.F1_SEASON;
  if (env && /^\d{4}$/.test(env)) return parseInt(env, 10);
  return new Date().getFullYear();
}

function countryCode(country: string): string | undefined {
  return COUNTRY_CODES[country];
}

function toUtcIso(date: string, time?: string): string {
  if (time) return `${date}T${time}`;
  return `${date}T12:00:00Z`;
}

function inferSessionStatus(utcDate: string, now = new Date()): F1SessionStatus {
  const start = new Date(utcDate).getTime();
  const end = start + 2 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  if (nowMs >= start && nowMs <= end) return "live";
  if (nowMs > end) return "finished";
  return "scheduled";
}

function parseGrandPrix(race: JolpicaRace, standingsRound: number, now = new Date()): F1GrandPrix {
  const round = parseInt(race.round, 10);
  const country = race.Circuit.Location.country;
  let status: F1GrandPrix["status"] = "upcoming";

  if (round < standingsRound) {
    status = "completed";
  } else if (round === standingsRound) {
    const raceTime = new Date(toUtcIso(race.date, race.time)).getTime();
    status = now.getTime() > raceTime + 3 * 60 * 60 * 1000 ? "completed" : "current";
  }

  const winner = race.Results?.[0];
  return {
    round,
    name: race.raceName,
    circuit: race.Circuit.circuitName,
    country,
    countryCode: countryCode(country),
    date: race.date,
    utcDate: toUtcIso(race.date, race.time),
    status,
    isSprintWeekend: Boolean(race.Sprint),
    winner: winner ? `${winner.Driver.givenName} ${winner.Driver.familyName}` : undefined,
    winnerCode: winner?.Driver.code,
  };
}

const SESSION_DEFS: Array<{
  key: keyof JolpicaRace;
  sessionType: F1SessionType;
  label: string;
}> = [
  { key: "FirstPractice", sessionType: "practice", label: "Practice 1" },
  { key: "SecondPractice", sessionType: "practice", label: "Practice 2" },
  { key: "ThirdPractice", sessionType: "practice", label: "Practice 3" },
  { key: "SprintQualifying", sessionType: "sprint_qualifying", label: "Sprint Qualifying" },
  { key: "Qualifying", sessionType: "qualifying", label: "Qualifying" },
  { key: "Sprint", sessionType: "sprint", label: "Sprint" },
];

function parseSessionsFromRace(race: JolpicaRace, now = new Date()): F1SessionInfo[] {
  const round = parseInt(race.round, 10);
  const country = race.Circuit.Location.country;
  const isSprintWeekend = Boolean(race.Sprint);
  const sessions: F1SessionInfo[] = [];

  for (const def of SESSION_DEFS) {
    const block = race[def.key] as { date: string; time: string } | undefined;
    if (!block) continue;
    const utcDate = toUtcIso(block.date, block.time);
    sessions.push({
      id: `${round}-${String(def.key)}`,
      round,
      gpName: race.raceName,
      circuit: race.Circuit.circuitName,
      country,
      countryCode: countryCode(country),
      sessionType: def.sessionType,
      sessionLabel: def.label,
      utcDate,
      status: inferSessionStatus(utcDate, now),
      isSprintWeekend,
    });
  }

  const raceUtc = toUtcIso(race.date, race.time);
  sessions.push({
    id: `${round}-Race`,
    round,
    gpName: race.raceName,
    circuit: race.Circuit.circuitName,
    country,
    countryCode: countryCode(country),
    sessionType: "race",
    sessionLabel: "Race",
    utcDate: raceUtc,
    status: inferSessionStatus(raceUtc, now),
    isSprintWeekend,
  });

  return sessions;
}

function parseDriverStandings(data: unknown): F1StandingRow[] {
  const table = (data as { MRData?: { StandingsTable?: { StandingsLists?: Array<{ DriverStandings?: unknown[] }> } } })
    .MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
  if (!Array.isArray(table)) return [];

  return table.map((row) => {
    const r = row as {
      position: string;
      points: string;
      wins: string;
      Driver: { driverId: string; code: string; givenName: string; familyName: string };
      Constructors: Array<{ constructorId: string; name: string }>;
    };
    const c = r.Constructors[0]!;
    return {
      position: parseInt(r.position, 10),
      driverId: r.Driver.driverId,
      driverCode: r.Driver.code,
      driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
      constructorId: c.constructorId,
      constructorName: c.name,
      points: parseFloat(r.points),
      wins: parseInt(r.wins, 10),
    };
  });
}

function parseConstructorStandings(data: unknown): F1ConstructorStandingRow[] {
  const table = (data as { MRData?: { StandingsTable?: { StandingsLists?: Array<{ ConstructorStandings?: unknown[] }> } } })
    .MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings;
  if (!Array.isArray(table)) return [];

  return table.map((row) => {
    const r = row as {
      position: string;
      points: string;
      wins: string;
      Constructor: { constructorId: string; name: string };
    };
    return {
      position: parseInt(r.position, 10),
      constructorId: r.Constructor.constructorId,
      constructorName: r.Constructor.name,
      points: parseFloat(r.points),
      wins: parseInt(r.wins, 10),
    };
  });
}

function parseRaceResults(data: unknown): F1RaceResult[] {
  const races = (data as { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } }).MRData?.RaceTable?.Races;
  if (!races?.[0]?.Results) return [];

  const race = races[0];
  return race.Results!.slice(0, 10).map((result) => ({
    round: parseInt(race.round, 10),
    gpName: race.raceName,
    position: parseInt(result.position, 10),
    driverCode: result.Driver.code,
    driverName: `${result.Driver.givenName} ${result.Driver.familyName}`,
    constructorName: result.Constructor.name,
    status: result.status,
  }));
}

interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  country_name: string;
  circuit_short_name: string;
  year: number;
  is_cancelled?: boolean;
}

function openF1SessionType(name: string, type: string): F1SessionType {
  const n = name.toLowerCase();
  if (n.includes("sprint qualifying")) return "sprint_qualifying";
  if (n.includes("sprint")) return "sprint";
  if (type === "Qualifying" || n.includes("qualifying")) return "qualifying";
  if (type === "Race" || n === "race") return "race";
  return "practice";
}

function openF1SessionLabel(name: string): string {
  if (name === "Practice 1") return "Practice 1";
  if (name === "Practice 2") return "Practice 2";
  if (name === "Practice 3") return "Practice 3";
  return name;
}

function inferOpenF1Status(dateStart: string, dateEnd: string, now = new Date()): F1SessionStatus {
  const start = new Date(dateStart).getTime();
  const end = new Date(dateEnd).getTime();
  const nowMs = now.getTime();
  if (nowMs >= start && nowMs <= end) return "live";
  if (nowMs > end) return "finished";
  return "scheduled";
}

async function fetchOpenF1Sessions(
  season: number,
  targetRound: number,
  calendar: F1GrandPrix[],
  now = new Date()
): Promise<F1SessionInfo[]> {
  try {
    const gp = calendar.find((g) => g.round === targetRound);
    if (!gp) return [];

    const res = await fetch(`${OPENF1_BASE}/sessions?year=${season}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as OpenF1Session[];
    const gpTime = new Date(`${gp.date}T12:00:00Z`).getTime();
    const windowMs = 5 * 24 * 60 * 60 * 1000;

    const roundSessions = data.filter((s) => {
      if (s.is_cancelled) return false;
      const sessionTime = new Date(s.date_start).getTime();
      return Math.abs(sessionTime - gpTime) <= windowMs;
    });

    return roundSessions.map((s) => ({
      id: `openf1-${s.session_key}`,
      round: targetRound,
      gpName: gp.name,
      circuit: gp.circuit,
      country: gp.country,
      countryCode: gp.countryCode,
      sessionType: openF1SessionType(s.session_name, s.session_type),
      sessionLabel: openF1SessionLabel(s.session_name),
      utcDate: s.date_start,
      status: inferOpenF1Status(s.date_start, s.date_end, now),
      isSprintWeekend: gp.isSprintWeekend,
    }));
  } catch {
    return [];
  }
}

function mergeOpenF1Sessions(
  jolpicaSessions: F1SessionInfo[],
  openF1Sessions: F1SessionInfo[]
): F1SessionInfo[] {
  if (openF1Sessions.length === 0) return jolpicaSessions;

  return jolpicaSessions.map((session) => {
    const match = openF1Sessions.find(
      (o) =>
        o.sessionType === session.sessionType ||
        o.sessionLabel.toLowerCase() === session.sessionLabel.toLowerCase()
    );
    if (!match) return session;
    return {
      ...session,
      utcDate: match.utcDate,
      status: match.status,
    };
  });
}

function loadSeed(): F1SeasonData {
  const seed = seedData as Omit<F1SeasonData, "source">;
  return { ...seed, source: "seed" };
}

export function computeTitleFightInsight(
  standings: F1StandingRow[],
  calendar: F1GrandPrix[]
): F1TitleFightInsight | null {
  if (standings.length < 2) return null;

  const leader = standings[0]!;
  const challenger = standings[1]!;
  const gap = leader.points - challenger.points;
  const racesRemaining = countRacesRemaining(calendar);

  const withinWin = standings.filter((d) => leader.points - d.points <= 25).length;
  if (withinWin > 3 || gap > 50) return null;

  const winsNeeded = Math.ceil(gap / 25);
  const message =
    gap === 0
      ? `${leader.driverName.split(" ").pop()} and ${challenger.driverName.split(" ").pop()} are tied on points.`
      : `${challenger.driverName.split(" ").pop()} trails by ${gap} pts${racesRemaining > 0 ? ` — needs about ${winsNeeded} win${winsNeeded > 1 ? "s" : ""} to catch up` : ""}.`;

  return {
    leaderName: leader.driverName,
    leaderPoints: leader.points,
    challengerName: challenger.driverName,
    challengerPoints: challenger.points,
    gap,
    racesRemaining,
    winsNeededEstimate: winsNeeded,
    message,
  };
}

export async function fetchF1SeasonData(now = new Date()): Promise<F1SeasonData> {
  const season = getSeasonYear();

  try {
    const [calRes, dsRes, csRes] = await Promise.all([
      fetch(`${JOLPICA_BASE}/${season}.json`, { next: { revalidate: 120 } }),
      fetch(`${JOLPICA_BASE}/${season}/driverStandings.json`, { next: { revalidate: 120 } }),
      fetch(`${JOLPICA_BASE}/${season}/constructorStandings.json`, { next: { revalidate: 120 } }),
    ]);

    if (!calRes.ok) throw new Error("calendar fetch failed");

    const calData = await calRes.json();
    const races = (calData as { MRData: { RaceTable: { Races: JolpicaRace[] } } }).MRData.RaceTable
      .Races;

    const dsData = dsRes.ok ? await dsRes.json() : null;
    const csData = csRes.ok ? await csRes.json() : null;

    let standingsRound = 0;
    if (dsData) {
      standingsRound = parseInt(
        (dsData as { MRData: { StandingsTable: { round: string } } }).MRData.StandingsTable.round,
        10
      );
    }

    const calendar = races.map((r) => parseGrandPrix(r, standingsRound, now));
    const driverStandings = dsData ? parseDriverStandings(dsData) : [];
    const constructorStandings = csData ? parseConstructorStandings(csData) : [];

    let lastRaceResults: F1RaceResult[] = [];
    if (standingsRound > 0) {
      const lastRes = await fetch(`${JOLPICA_BASE}/${season}/${standingsRound}/results.json`, {
        next: { revalidate: 120 },
      });
      if (lastRes.ok) {
        lastRaceResults = parseRaceResults(await lastRes.json());
      }
    }

    const targetRound =
      calendar.find((g) => g.status === "current")?.round ??
      calendar.find((g) => g.status === "upcoming")?.round ??
      standingsRound;

    const targetRace = races.find((r) => parseInt(r.round, 10) === targetRound);
    let sessions = targetRace ? parseSessionsFromRace(targetRace, now) : [];

    const openF1Sessions = await fetchOpenF1Sessions(season, targetRound, calendar, now);
    sessions = mergeOpenF1Sessions(sessions, openF1Sessions);

    if (calendar.length > 0) {
      return {
        season,
        calendar,
        driverStandings,
        constructorStandings,
        sessions,
        lastRaceResults,
        source: "api",
      };
    }
  } catch {
    // fall through to seed
  }

  return loadSeed();
}

export function getWeekendSessionsForRound(
  data: F1SeasonData,
  round: number,
  now = new Date()
): F1SessionInfo[] {
  const race = data.calendar.find((g) => g.round === round);
  if (!race) return data.sessions;

  return data.sessions.filter((s) => s.round === round).map((s) => ({
    ...s,
    status: inferSessionStatus(s.utcDate, now),
  }));
}
