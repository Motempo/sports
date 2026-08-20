import { F1_CONSTRUCTOR_META, F1_DRIVER_META } from "@/data/f1-profile-meta";
import {
  ageFromDateOfBirth,
  formatBirthDate,
  nationalityToIso2,
} from "@/lib/f1-nationality";
import type { F1GrandPrixStatus, F1SeasonData } from "@/lib/f1-types";

export interface F1DriverProfile {
  id: string;
  code: string;
  displayName: string;
  givenName: string;
  familyName: string;
  permanentNumber?: number;
  nationality?: string;
  nationalityIso2?: string;
  dateOfBirth?: string;
  birthLabel?: string;
  age?: number;
  constructorId: string;
  constructorName: string;
  position: number;
  points: number;
  wins: number;
  starts: number;
}

export interface F1TeamDriverLineup {
  id: string;
  code: string;
  name: string;
  permanentNumber?: number;
  points: number;
}

export interface F1TeamProfile {
  id: string;
  name: string;
  nationality?: string;
  nationalityIso2?: string;
  position: number;
  points: number;
  wins: number;
  gapToLeader: number;
  drivers: F1TeamDriverLineup[];
}

export interface F1TrackProfile {
  id: string;
  circuitName: string;
  gpName: string;
  country: string;
  countryCode?: string;
  round: number;
  date: string;
  status: F1GrandPrixStatus;
  isSprintWeekend: boolean;
  winner?: string;
  blurb: string;
}

function splitName(full: string): { givenName: string; familyName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { givenName: parts[0]!, familyName: parts[0]! };
  return {
    givenName: parts.slice(0, -1).join(" "),
    familyName: parts[parts.length - 1]!,
  };
}

export function buildDriverProfiles(data: F1SeasonData, now = new Date()): F1DriverProfile[] {
  const starts = data.calendar.filter((gp) => gp.status === "completed").length;

  return data.driverStandings.map((row) => {
    const id = row.driverId ?? row.driverCode?.toLowerCase() ?? row.driverName;
    const meta = F1_DRIVER_META[id] ?? {};
    const split = splitName(row.driverName);
    const givenName = row.givenName ?? meta.givenName ?? split.givenName;
    const familyName = row.familyName ?? meta.familyName ?? split.familyName;
    const dateOfBirth = row.dateOfBirth ?? meta.dateOfBirth;
    const nationality = row.nationality ?? meta.nationality;
    const permanentNumber = row.permanentNumber ?? meta.permanentNumber;

    return {
      id,
      code: row.driverCode ?? familyName.slice(0, 3).toUpperCase(),
      displayName: row.driverName,
      givenName,
      familyName,
      permanentNumber,
      nationality,
      nationalityIso2: nationalityToIso2(nationality),
      dateOfBirth,
      birthLabel: dateOfBirth ? formatBirthDate(dateOfBirth) : undefined,
      age: dateOfBirth ? ageFromDateOfBirth(dateOfBirth, now) : undefined,
      constructorId: row.constructorId,
      constructorName: row.constructorName,
      position: row.position,
      points: row.points,
      wins: row.wins,
      starts,
    };
  });
}

export function buildTeamProfiles(data: F1SeasonData): F1TeamProfile[] {
  const leaderPts = data.constructorStandings[0]?.points ?? 0;

  return data.constructorStandings.map((row) => {
    const meta = F1_CONSTRUCTOR_META[row.constructorId] ?? {};
    const nationality = row.nationality ?? meta.nationality;
    const drivers = data.driverStandings
      .filter((d) => d.constructorId === row.constructorId)
      .map((d) => {
        const id = d.driverId ?? d.driverCode?.toLowerCase() ?? d.driverName;
        const driverMeta = F1_DRIVER_META[id] ?? {};
        return {
          id,
          code: d.driverCode ?? "—",
          name: d.driverName,
          permanentNumber: d.permanentNumber ?? driverMeta.permanentNumber,
          points: d.points,
        };
      });

    return {
      id: row.constructorId,
      name: row.constructorName,
      nationality,
      nationalityIso2: nationalityToIso2(nationality),
      position: row.position,
      points: row.points,
      wins: row.wins,
      gapToLeader: Math.round((leaderPts - row.points) * 10) / 10,
      drivers,
    };
  });
}
