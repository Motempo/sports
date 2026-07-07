import scorerBirthdays from "@/data/wc2026-scorer-birthdays.json";
import {
  fetchOpenFootballRawMatches,
  resolveOpenFootballTeamCode,
  type OpenFootballGoal,
  type OpenFootballMatch,
} from "@/lib/openfootball-data";
import { buildTeamInfo } from "@/lib/team-info";
import type { MatchInfo } from "@/lib/types";

const YOUNG_PLAYER_CUTOFF = new Date("2004-01-01T00:00:00Z");
const TOURNAMENT_REFERENCE = new Date("2026-06-15T00:00:00Z");

export interface ScorerRow {
  playerName: string;
  teamCode: string;
  teamName: string;
  goals: number;
  penalties: number;
}

export interface TeamDefenseRow {
  teamName: string;
  teamCode: string;
  goalsConceded: number;
  cleanSheets: number;
  matchesPlayed: number;
}

export interface GoalEventMark {
  playerName: string;
  teamCode: string;
  teamName: string;
  minute: number;
  matchLabel: string;
  opponentName: string;
}

export interface HatTrickMark {
  playerName: string;
  teamCode: string;
  teamName: string;
  matchLabel: string;
  goals: number;
  spanMinutes: number;
  firstMinute: number;
  lastMinute: number;
}

export interface AgeScorerMark {
  playerName: string;
  teamCode: string;
  teamName: string;
  ageYears: number;
  ageDays: number;
}

export interface TournamentGoalStats {
  scorers: ScorerRow[];
  teamDefense: TeamDefenseRow[];
  fastestGoal: GoalEventMark | null;
  hatTricks: HatTrickMark[];
  fastestHatTrick: HatTrickMark | null;
  latestWinningGoal: GoalEventMark | null;
  youngestScorer: AgeScorerMark | null;
  oldestScorer: AgeScorerMark | null;
  youngScorers: Array<ScorerRow & { ageYears: number }>;
  totalGoals: number;
  finishedMatches: number;
}

const birthdayMap = new Map(
  Object.entries(scorerBirthdays as Record<string, string>).map(([name, iso]) => [
    normalizePlayerName(name),
    iso,
  ])
);

function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function matchLabel(raw: OpenFootballMatch): string {
  if (raw.group) return raw.group;
  return raw.round ?? "WC 2026";
}

function ageOnTournament(birthIso: string): { years: number; days: number } {
  const birth = new Date(`${birthIso}T00:00:00Z`);
  const ref = TOURNAMENT_REFERENCE;
  let years = ref.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = ref.getUTCMonth() - birth.getUTCMonth();
  const dayDiff = ref.getUTCDate() - birth.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;

  const ageStart = new Date(Date.UTC(birth.getUTCFullYear() + years, birth.getUTCMonth(), birth.getUTCDate()));
  const days = Math.floor((ref.getTime() - ageStart.getTime()) / (24 * 60 * 60 * 1000));
  return { years, days };
}

function lookupBirthday(playerName: string): string | null {
  const direct = birthdayMap.get(normalizePlayerName(playerName));
  if (direct) return direct;

  const parts = normalizePlayerName(playerName).split(/\s+/);
  const last = parts[parts.length - 1];
  if (!last) return null;

  for (const [key, iso] of birthdayMap) {
    if (key.endsWith(` ${last}`) || key === last) {
      const keyParts = key.split(/\s+/);
      if (keyParts[keyParts.length - 1] === last && keyParts[0] === parts[0]) {
        return iso;
      }
    }
  }
  return null;
}

function isYoungPlayerEligible(birthIso: string): boolean {
  return new Date(`${birthIso}T00:00:00Z`) >= YOUNG_PLAYER_CUTOFF;
}

function goalMinute(goal: OpenFootballGoal): number {
  const raw = goal.minute;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  const text = String(raw).trim();
  const stoppage = text.match(/^(\d+)\+(\d+)$/);
  if (stoppage) {
    return Number(stoppage[1]) + Number(stoppage[2]);
  }

  const base = Number(text);
  return Number.isFinite(base) ? base : 999;
}

function collectGoals(
  raw: OpenFootballMatch,
  side: "goals1" | "goals2",
  teamName: string,
  opponentName: string
): Array<OpenFootballGoal & { teamName: string; opponentName: string; matchLabel: string }> {
  return (raw[side] ?? []).map((goal) => ({
    ...goal,
    teamName,
    opponentName,
    matchLabel: matchLabel(raw),
  }));
}

export function computeTournamentGoalStats(
  rawMatches: OpenFootballMatch[],
  allMatches: MatchInfo[]
): TournamentGoalStats {
  const scorerGoals = new Map<string, ScorerRow>();
  const teamDefense = new Map<string, TeamDefenseRow>();
  let fastestGoal: GoalEventMark | null = null;
  const hatTricks: HatTrickMark[] = [];
  let latestWinningGoal: GoalEventMark | null = null;
  let youngestScorer: AgeScorerMark | null = null;
  let oldestScorer: AgeScorerMark | null = null;

  const finishedFromMatches = allMatches.filter(
    (m) => m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null
  ).length;

  let totalGoalsFromMatches = 0;

  for (const raw of rawMatches) {
    const ft = raw.score?.ft;
    if (!ft || !raw.team1 || !raw.team2) continue;

    totalGoalsFromMatches += ft[0] + ft[1];

    const [homeGoals, awayGoals] = ft;
    const homeCode = resolveOpenFootballTeamCode(raw.team1);
    const awayCode = resolveOpenFootballTeamCode(raw.team2);
    const homeTeam = buildTeamInfo(homeCode, raw.team1);
    const awayTeam = buildTeamInfo(awayCode, raw.team2);
    const label = matchLabel(raw);

    for (const [code, name, conceded, scored] of [
      [homeCode, homeTeam.name, awayGoals, homeGoals],
      [awayCode, awayTeam.name, homeGoals, awayGoals],
    ] as const) {
      const row =
        teamDefense.get(code) ??
        ({
          teamCode: code,
          teamName: name,
          goalsConceded: 0,
          cleanSheets: 0,
          matchesPlayed: 0,
        } satisfies TeamDefenseRow);
      row.goalsConceded += conceded;
      row.matchesPlayed += 1;
      if (conceded === 0) row.cleanSheets += 1;
      teamDefense.set(code, row);
      void scored;
    }

    const homeGoalEvents = collectGoals(raw, "goals1", raw.team1, raw.team2);
    const awayGoalEvents = collectGoals(raw, "goals2", raw.team2, raw.team1);

    for (const goal of [...homeGoalEvents, ...awayGoalEvents]) {
      if (goal.owngoal) continue;

      const teamCode = resolveOpenFootballTeamCode(goal.teamName);
      const teamName = buildTeamInfo(teamCode, goal.teamName).name;
      const minute = goalMinute(goal);
      const key = `${normalizePlayerName(goal.name)}|${teamCode}`;
      const existing =
        scorerGoals.get(key) ??
        ({
          playerName: goal.name,
          teamCode,
          teamName,
          goals: 0,
          penalties: 0,
        } satisfies ScorerRow);
      existing.goals += 1;
      if (goal.penalty) existing.penalties += 1;
      scorerGoals.set(key, existing);

      if (!fastestGoal || minute < fastestGoal.minute) {
        fastestGoal = {
          playerName: goal.name,
          teamCode,
          teamName,
          minute,
          matchLabel: label,
          opponentName: goal.opponentName,
        };
      }

      const birthIso = lookupBirthday(goal.name);
      if (birthIso) {
        const { years, days } = ageOnTournament(birthIso);
        const mark: AgeScorerMark = {
          playerName: goal.name,
          teamCode,
          teamName,
          ageYears: years,
          ageDays: days,
        };
        if (!youngestScorer || years < youngestScorer.ageYears || (years === youngestScorer.ageYears && days < youngestScorer.ageDays)) {
          youngestScorer = mark;
        }
        if (!oldestScorer || years > oldestScorer.ageYears || (years === oldestScorer.ageYears && days > oldestScorer.ageDays)) {
          oldestScorer = mark;
        }
      }
    }

    const goalsByPlayer = new Map<
      string,
      { playerName: string; teamName: string; teamCode: string; minutes: number[] }
    >();
    for (const goal of [...homeGoalEvents, ...awayGoalEvents]) {
      if (goal.owngoal) continue;
      const teamCode = resolveOpenFootballTeamCode(goal.teamName);
      const key = `${normalizePlayerName(goal.name)}|${teamCode}`;
      const row = goalsByPlayer.get(key) ?? {
        playerName: goal.name,
        teamName: buildTeamInfo(teamCode, goal.teamName).name,
        teamCode,
        minutes: [],
      };
      row.minutes.push(goalMinute(goal));
      goalsByPlayer.set(key, row);
    }

    for (const row of goalsByPlayer.values()) {
      if (row.minutes.length < 3) continue;
      const span = Math.max(...row.minutes) - Math.min(...row.minutes);
      hatTricks.push({
        playerName: row.playerName,
        teamCode: row.teamCode,
        teamName: row.teamName,
        matchLabel: label,
        goals: row.minutes.length,
        spanMinutes: span,
        firstMinute: Math.min(...row.minutes),
        lastMinute: Math.max(...row.minutes),
      });
    }

    if (homeGoals === awayGoals) continue;

    const winnerSide = homeGoals > awayGoals ? homeGoalEvents : awayGoalEvents;
    if (winnerSide.length === 0) continue;
    const lastWinnerGoal = winnerSide.reduce((best, goal) => {
      const minute = goalMinute(goal);
      return minute > goalMinute(best) ? goal : best;
    });
    const teamCode = resolveOpenFootballTeamCode(lastWinnerGoal.teamName);
    const mark: GoalEventMark = {
      playerName: lastWinnerGoal.name,
      teamCode,
      teamName: buildTeamInfo(teamCode, lastWinnerGoal.teamName).name,
      minute: goalMinute(lastWinnerGoal),
      matchLabel: label,
      opponentName: lastWinnerGoal.opponentName,
    };
    if (!latestWinningGoal || mark.minute > latestWinningGoal.minute) {
      latestWinningGoal = mark;
    }
  }

  const scorers = [...scorerGoals.values()].sort((a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName));
  const teamDefenseRows = [...teamDefense.values()].sort(
    (a, b) =>
      a.goalsConceded - b.goalsConceded ||
      b.cleanSheets - a.cleanSheets ||
      a.teamName.localeCompare(b.teamName)
  );

  const fastestHatTrick =
    hatTricks.length > 0
      ? [...hatTricks].sort((a, b) => a.spanMinutes - b.spanMinutes || a.firstMinute - b.firstMinute)[0]!
      : null;

  const youngScorers = scorers
    .map((row) => {
      const birthIso = lookupBirthday(row.playerName);
      if (!birthIso || !isYoungPlayerEligible(birthIso)) return null;
      return { ...row, ageYears: ageOnTournament(birthIso).years };
    })
    .filter((row): row is ScorerRow & { ageYears: number } => row != null)
    .sort((a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName));

  const totalGoals =
    totalGoalsFromMatches ||
    allMatches
      .filter((m) => m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null)
      .reduce((sum, m) => sum + m.homeScore! + m.awayScore!, 0);

  return {
    scorers,
    teamDefense: teamDefenseRows,
    fastestGoal,
    hatTricks,
    fastestHatTrick,
    latestWinningGoal,
    youngestScorer,
    oldestScorer,
    youngScorers,
    totalGoals,
    finishedMatches: finishedFromMatches,
  };
}

export async function fetchTournamentGoalStats(allMatches: MatchInfo[]): Promise<TournamentGoalStats> {
  const rawMatches = await fetchOpenFootballRawMatches();
  return computeTournamentGoalStats(rawMatches, allMatches);
}
