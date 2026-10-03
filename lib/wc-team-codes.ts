/**
 * football-data.org TLAs that differ from the codes in wc2026 group fixtures.
 * Only codes that are not already a different team in that file.
 */
const TEAM_CODE_ALIASES: Record<string, string> = {
  KSA: "SAU",
  HTI: "HAI",
  URY: "URU",
  NLD: "NED",
  DEU: "GER",
  CHE: "SUI",
  PRT: "POR",
  HRV: "CRO",
  ZAF: "RSA",
  DZA: "ALG",
  DRC: "COD",
};

export function canonicalTeamCode(code: string): string {
  const upper = code.trim().toUpperCase();
  return TEAM_CODE_ALIASES[upper] ?? upper;
}
