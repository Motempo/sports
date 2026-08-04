import laLigaClubsSeed from "@/data/la-liga-clubs-seed.json";
import type { ClubSeed } from "@/lib/la-liga-types";
import type { TeamInfo } from "@/lib/types";

const clubs = laLigaClubsSeed as ClubSeed[];

const nameAliases: Record<string, string> = {
  "real madrid": "RMA",
  "real madrid cf": "RMA",
  "fc barcelona": "FCB",
  barcelona: "FCB",
  barca: "FCB",
  "club atletico de madrid": "ATL",
  "atletico de madrid": "ATL",
  "atletico madrid": "ATL",
  atletico: "ATL",
  "athletic club": "ATH",
  "athletic bilbao": "ATH",
  athletic: "ATH",
  "villarreal cf": "VIL",
  villarreal: "VIL",
  "real sociedad de futbol": "RSO",
  "real sociedad": "RSO",
  "real betis balompie": "BET",
  "real betis": "BET",
  betis: "BET",
  "sevilla fc": "SEV",
  sevilla: "SEV",
  "valencia cf": "VAL",
  valencia: "VAL",
  "ca osasuna": "OSA",
  osasuna: "OSA",
  "rc celta de vigo": "CEL",
  "celta de vigo": "CEL",
  celta: "CEL",
  "rcd mallorca": "MLL",
  mallorca: "MLL",
  "girona fc": "GIR",
  girona: "GIR",
  "rayo vallecano de madrid": "RAY",
  "rayo vallecano": "RAY",
  rayo: "RAY",
  "getafe cf": "GET",
  getafe: "GET",
  "rcd espanyol de barcelona": "ESP",
  "rcd espanyol": "ESP",
  espanyol: "ESP",
  "deportivo alaves": "ALA",
  alaves: "ALA",
  "ud las palmas": "LPA",
  "las palmas": "LPA",
  "cd leganes": "LEG",
  leganes: "LEG",
  "real valladolid cf": "VLL",
  "real valladolid": "VLL",
  valladolid: "VLL",
};

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function buildLaLigaClubTeamInfo(
  code: string,
  name?: string,
  crest?: string,
  shortName?: string
): TeamInfo {
  const seed = clubs.find((c) => c.code === code);
  return {
    code,
    name: name || seed?.name || code,
    shortName: shortName || seed?.shortName,
    crest: crest || seed?.crest,
    iso2: "es",
  };
}

export function resolveLaLigaClubCode(teamName: string, tla?: string | null): string {
  if (tla?.trim()) {
    const upper = tla.trim().toUpperCase();
    if (clubs.some((c) => c.code === upper)) return upper;
  }
  const byAlias = nameAliases[normalizeName(teamName)];
  if (byAlias) return byAlias;
  const seed = clubs.find(
    (c) =>
      normalizeName(c.name) === normalizeName(teamName) ||
      normalizeName(c.shortName) === normalizeName(teamName)
  );
  return seed?.code ?? teamName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

export function laLigaSeedTeams(): TeamInfo[] {
  return clubs.map((c) => buildLaLigaClubTeamInfo(c.code, c.name, c.crest, c.shortName));
}
