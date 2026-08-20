/**
 * Parse openfootball football.db league text files
 * (e.g. england/2026-27/1-premierleague.txt).
 */

export interface OpenFootballTxtMatch {
  round: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  team1: string;
  team2: string;
  score?: { ft: [number, number] };
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MATCHDAY_RE = /^[▪•]?\s*Matchday\s+(\d+)\s*$/i;
const DATE_RE =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/i;
const KICKOFF_RE =
  /^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)(?:\s+(\d+)\s*[-–:]\s*(\d+))?\s*$/i;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Parse a football.db league .txt body into fixture rows. */
export function parseOpenFootballLeagueTxt(text: string): OpenFootballTxtMatch[] {
  const matches: OpenFootballTxtMatch[] = [];
  let matchday: number | null = null;
  let year: number | null = null;
  let month = 8;
  let day = 1;
  let time = "15:00";
  let currentDate: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("=") || line.startsWith("#")) continue;

    const md = line.match(MATCHDAY_RE);
    if (md) {
      matchday = Number(md[1]);
      continue;
    }

    const dateMatch = line.match(DATE_RE);
    if (dateMatch) {
      const mon = MONTHS[dateMatch[1]!.toLowerCase()];
      const d = Number(dateMatch[2]);
      if (!mon || !d) continue;
      if (dateMatch[3]) {
        year = Number(dateMatch[3]);
      } else if (year != null) {
        // Roll year forward when calendar wraps past December.
        if (mon < month && month >= 8 && mon <= 6) year += 1;
      }
      if (year == null) continue;
      month = mon;
      day = d;
      currentDate = toIsoDate(year, month, day);
      continue;
    }

    if (matchday == null || !currentDate) continue;

    const kick = line.match(KICKOFF_RE);
    if (!kick) continue;

    if (kick[1]) time = kick[1];
    const team1 = kick[2]!.replace(/\s+/g, " ").trim();
    const team2 = kick[3]!.replace(/\s+/g, " ").trim();
    if (!team1 || !team2) continue;

    const row: OpenFootballTxtMatch = {
      round: `Matchday ${matchday}`,
      date: currentDate,
      time,
      team1,
      team2,
    };
    if (kick[4] != null && kick[5] != null) {
      row.score = { ft: [Number(kick[4]), Number(kick[5])] };
    }
    matches.push(row);
  }

  return matches;
}
