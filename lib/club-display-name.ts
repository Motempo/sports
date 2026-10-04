import type { MatchInfo, TeamInfo } from "@/lib/types";

/**
 * One short display name per club, shared by every football league page.
 *
 * Code wins when it is a known club, then official-name aliases, then a
 * cleaned fallback so a missing short name still shows something. Accents
 * are kept on the way out. National teams must not be passed through here:
 * a World Cup code can collide with a club code (ESP is Spain and Espanyol).
 */

interface ClubDisplayEntry {
  code: string;
  display: string;
  aliases: string[];
}

const CLUBS: ClubDisplayEntry[] = [
  {
    code: "RMA",
    display: "Real Madrid",
    aliases: ["Real Madrid", "Real Madrid CF", "Real Madrid C.F."],
  },
  {
    code: "FCB",
    display: "Barcelona",
    aliases: ["FC Barcelona", "Barcelona", "Fútbol Club Barcelona", "Barça", "Barca"],
  },
  {
    code: "ATL",
    display: "Atlético Madrid",
    aliases: [
      "Club Atlético de Madrid",
      "Atlético de Madrid",
      "Atlético Madrid",
      "Atletico Madrid",
      "Atlético",
      "Atletico",
    ],
  },
  {
    code: "ATH",
    display: "Athletic Club",
    aliases: ["Athletic Club", "Athletic Bilbao", "Athletic"],
  },
  {
    code: "VIL",
    display: "Villarreal",
    aliases: ["Villarreal CF", "Villarreal"],
  },
  {
    code: "RSO",
    display: "Real Sociedad",
    aliases: ["Real Sociedad de Fútbol", "Real Sociedad"],
  },
  {
    code: "BET",
    display: "Betis",
    aliases: ["Real Betis Balompié", "Real Betis", "Betis"],
  },
  {
    code: "SEV",
    display: "Sevilla",
    aliases: ["Sevilla FC", "Sevilla"],
  },
  {
    code: "VAL",
    display: "Valencia",
    aliases: ["Valencia CF", "Valencia"],
  },
  {
    code: "OSA",
    display: "Osasuna",
    aliases: ["CA Osasuna", "Osasuna"],
  },
  {
    code: "CEL",
    display: "Celta",
    aliases: ["RC Celta de Vigo", "Celta de Vigo", "Celta Vigo", "Celta"],
  },
  {
    code: "RAY",
    display: "Rayo",
    aliases: ["Rayo Vallecano de Madrid", "Rayo Vallecano", "Rayo"],
  },
  {
    code: "GET",
    display: "Getafe",
    aliases: ["Getafe CF", "Getafe"],
  },
  {
    code: "ESP",
    display: "Espanyol",
    aliases: ["RCD Espanyol de Barcelona", "RCD Espanyol", "Espanyol de Barcelona", "Espanyol"],
  },
  {
    code: "ALA",
    display: "Alavés",
    aliases: ["Deportivo Alavés", "Deportivo Alaves", "Alavés", "Alaves"],
  },
  {
    code: "ELC",
    display: "Elche",
    aliases: ["Elche CF", "Elche"],
  },
  {
    code: "LEV",
    display: "Levante",
    aliases: ["Levante UD", "Levante"],
  },
  {
    code: "MAL",
    display: "Málaga",
    aliases: ["Málaga CF", "Malaga CF", "Málaga", "Malaga"],
  },
  {
    code: "RAC",
    display: "Racing",
    aliases: [
      "Real Racing Club de Santander",
      "Racing Club de Santander",
      "Racing Santander",
      "Racing",
    ],
  },
  {
    code: "DEP",
    display: "Deportivo",
    aliases: ["RC Deportivo La Coruña", "RC Deportivo", "Deportivo La Coruña", "Deportivo"],
  },
  {
    code: "MLL",
    display: "Mallorca",
    aliases: ["RCD Mallorca", "Mallorca"],
  },
  {
    code: "GIR",
    display: "Girona",
    aliases: ["Girona FC", "Girona"],
  },
  {
    code: "OVI",
    display: "Oviedo",
    aliases: ["Real Oviedo", "Oviedo"],
  },
  {
    code: "LPA",
    display: "Las Palmas",
    aliases: ["UD Las Palmas", "Las Palmas"],
  },
  {
    code: "LEG",
    display: "Leganés",
    aliases: ["CD Leganés", "CD Leganes", "Leganés", "Leganes"],
  },
  {
    code: "VLL",
    display: "Valladolid",
    aliases: ["Real Valladolid CF", "Real Valladolid", "Valladolid"],
  },
  {
    code: "ARS",
    display: "Arsenal",
    aliases: ["Arsenal FC", "Arsenal"],
  },
  {
    code: "AVL",
    display: "Aston Villa",
    aliases: ["Aston Villa FC", "Aston Villa"],
  },
  {
    code: "BOU",
    display: "Bournemouth",
    aliases: ["AFC Bournemouth", "Bournemouth"],
  },
  {
    code: "BRE",
    display: "Brentford",
    aliases: ["Brentford FC", "Brentford"],
  },
  {
    code: "BHA",
    display: "Brighton",
    aliases: ["Brighton & Hove Albion FC", "Brighton & Hove Albion", "Brighton and Hove Albion", "Brighton"],
  },
  {
    code: "CHE",
    display: "Chelsea",
    aliases: ["Chelsea FC", "Chelsea"],
  },
  {
    code: "COV",
    display: "Coventry",
    aliases: ["Coventry City FC", "Coventry City", "Coventry"],
  },
  {
    code: "CRY",
    display: "Crystal Palace",
    aliases: ["Crystal Palace FC", "Crystal Palace"],
  },
  {
    code: "EVE",
    display: "Everton",
    aliases: ["Everton FC", "Everton"],
  },
  {
    code: "FUL",
    display: "Fulham",
    aliases: ["Fulham FC", "Fulham"],
  },
  {
    code: "HUL",
    display: "Hull",
    aliases: ["Hull City AFC", "Hull City", "Hull"],
  },
  {
    code: "IPS",
    display: "Ipswich",
    aliases: ["Ipswich Town FC", "Ipswich Town", "Ipswich"],
  },
  {
    code: "LEE",
    display: "Leeds",
    aliases: ["Leeds United FC", "Leeds United", "Leeds"],
  },
  {
    code: "LIV",
    display: "Liverpool",
    aliases: ["Liverpool FC", "Liverpool"],
  },
  {
    code: "MCI",
    display: "Man City",
    aliases: ["Manchester City FC", "Manchester City", "Man City"],
  },
  {
    code: "MUN",
    display: "Man United",
    aliases: ["Manchester United FC", "Manchester United", "Man United", "Man Utd"],
  },
  {
    code: "NEW",
    display: "Newcastle",
    aliases: ["Newcastle United FC", "Newcastle United", "Newcastle"],
  },
  {
    code: "NFO",
    display: "Nott'm Forest",
    aliases: ["Nottingham Forest FC", "Nottingham Forest", "Nott'm Forest", "Nottm Forest"],
  },
  {
    code: "SUN",
    display: "Sunderland",
    aliases: ["Sunderland AFC", "Sunderland"],
  },
  {
    code: "TOT",
    display: "Spurs",
    aliases: ["Tottenham Hotspur FC", "Tottenham Hotspur", "Tottenham", "Spurs"],
  },
  {
    code: "BUR",
    display: "Burnley",
    aliases: ["Burnley FC", "Burnley"],
  },
  {
    code: "WHU",
    display: "West Ham",
    aliases: ["West Ham United FC", "West Ham United", "West Ham"],
  },
  {
    code: "WOL",
    display: "Wolves",
    aliases: ["Wolverhampton Wanderers FC", "Wolverhampton Wanderers", "Wolves"],
  },
  {
    code: "LEI",
    display: "Leicester",
    aliases: ["Leicester City FC", "Leicester City", "Leicester"],
  },
];

const LEADING_LEGAL = /^(?:afc|rcd|rc|ca|cd|ud|cf|fc|sd|ad)\b[\s.]+/i;
const TRAILING_LEGAL = /(?:\s+|-)(?:cf|fc|ud|sad|sd|afc|de\s+futbol|balompie)\b\.?$/i;

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BY_CODE = new Map<string, string>();
const BY_ALIAS = new Map<string, string>();

for (const club of CLUBS) {
  BY_CODE.set(club.code, club.display);
  BY_ALIAS.set(fold(club.display), club.display);
  for (const alias of club.aliases) {
    BY_ALIAS.set(fold(alias), club.display);
  }
}

export interface ClubNameInput {
  code?: string | null;
  name?: string | null;
  shortName?: string | null;
}

function tidy(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function stripEllipsis(value: string): string {
  return value.replace(/(?:\.{2,}|…)+\s*$/u, "").trim();
}

/** Drop club legal tokens. Unknown names still keep accents and the rest of the words. */
export function stripClubLegalForm(raw: string): string {
  let value = stripEllipsis(tidy(raw));
  if (!value) return "";
  for (let i = 0; i < 4; i += 1) {
    const next = value.replace(LEADING_LEGAL, "").replace(TRAILING_LEGAL, "").trim();
    if (next === value) break;
    value = next;
  }
  return value.replace(/^club\s+/i, "").trim();
}

function isCodeToken(value: string, code: string): boolean {
  const compact = value.replace(/[^A-Za-z]/g, "");
  if (!compact) return true;
  if (code && compact.toUpperCase() === code.toUpperCase()) return true;
  return /^[A-Z]{2,4}$/.test(value);
}

function fallbackClubName(input: ClubNameInput, code: string): string {
  const short = stripClubLegalForm(input.shortName ?? "");
  const full = stripClubLegalForm(input.name ?? "");
  if (short && !isCodeToken(short, code)) return short;
  if (full && !isCodeToken(full, code)) return full;
  const rawShort = stripEllipsis(tidy(input.shortName));
  const rawName = stripEllipsis(tidy(input.name));
  if (rawShort && !isCodeToken(rawShort, code)) return rawShort;
  if (rawName && !isCodeToken(rawName, code)) return rawName;
  if (code) return code;
  return "Club";
}

/** Canonical on-page name for a club. Never blank. */
export function clubDisplayName(input: ClubNameInput): string {
  const code = tidy(input.code).toUpperCase();
  const byCode = code ? BY_CODE.get(code) : undefined;
  if (byCode) return byCode;

  const byName = BY_ALIAS.get(fold(tidy(input.name)));
  if (byName) return byName;
  const byShort = BY_ALIAS.get(fold(tidy(input.shortName)));
  if (byShort) return byShort;

  return fallbackClubName(input, code);
}

/** Visible label for any team. Does not rewrite national-team names. */
export function presentTeamName(team: ClubNameInput): string {
  const name = tidy(team.name);
  if (name) return name;
  const shortName = tidy(team.shortName);
  if (shortName) return shortName;
  const code = tidy(team.code);
  if (code) return code;
  return "TBD";
}

export function withClubDisplayName(team: TeamInfo): TeamInfo {
  const name = clubDisplayName(team);
  if (team.name === name && team.shortName === name) return team;
  return { ...team, name, shortName: name };
}

/** League fixtures show the shared club name. Other stages keep their own names. */
export function withDisplayedClubs(match: MatchInfo): MatchInfo {
  if (match.stage !== "LEAGUE") return match;
  const homeTeam = withClubDisplayName(match.homeTeam);
  const awayTeam = withClubDisplayName(match.awayTeam);
  if (homeTeam === match.homeTeam && awayTeam === match.awayTeam) return match;
  return { ...match, homeTeam, awayTeam };
}

export function listClubDisplayNames(): Array<{ code: string; display: string }> {
  return CLUBS.map((club) => ({ code: club.code, display: club.display }));
}
