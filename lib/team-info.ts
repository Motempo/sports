import teamIsoMap from "@/data/team-iso-map.json";
import teamSeed from "@/data/team-seed.json";
import type { TeamInfo } from "@/lib/types";

const isoMap = teamIsoMap as Record<string, string>;
const seedTeams = teamSeed as Array<{
  code: string;
  name: string;
  capital: string;
  confederation: string;
  fifaRank: number;
}>;

export function getIso2(code: string): string {
  return isoMap[code] ?? code.toLowerCase().slice(0, 2);
}

export function buildTeamInfo(code: string, name: string, crest?: string): TeamInfo {
  const seed = seedTeams.find((t) => t.code === code);
  return {
    code,
    name: name || seed?.name || code,
    crest,
    iso2: getIso2(code),
    capital: seed?.capital,
    confederation: seed?.confederation,
    fifaRank: seed?.fifaRank,
  };
}
