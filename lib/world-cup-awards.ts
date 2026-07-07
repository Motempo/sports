import { capForecast } from "@/lib/match-forecast";
import { fetchWorldCupScorers } from "@/lib/fetch-football-scorers";
import type { TournamentGoalStats } from "@/lib/tournament-goal-stats";
import type { MatchInfo } from "@/lib/types";
import { buildTeamInfo } from "@/lib/team-info";

export const AWARD_COMMENTARY_MAX_CHARS = 300;

const TOTAL_TOURNAMENT_MATCHES = 104;

export interface AwardContender {
  rank: number;
  label: string;
  teamCode: string;
  teamName: string;
  stat: number;
  statLabel: string;
  winChance: number;
}

export interface WorldCupAward {
  id: string;
  name: string;
  sponsor: string;
  emoji: string;
  description: string;
  progress: number;
  contenders: AwardContender[];
  commentary: string;
}

function tournamentProgress(matches: MatchInfo[]): number {
  const finished = matches.filter((m) => m.status === "FINISHED").length;
  return Math.min(100, Math.round((finished / TOTAL_TOURNAMENT_MATCHES) * 100));
}

function winChances(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values, 1);
  const weights = values.map((v) => Math.exp((v / max) * 2.4));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => Math.round((w / total) * 100));
}

function raceProgress(tournamentPct: number, leader: number, runnerUp: number, scale: number): number {
  const gap = Math.max(0, leader - runnerUp);
  const gapPct = Math.min(55, (gap / scale) * 55);
  return Math.min(98, Math.round(tournamentPct * 0.45 + gapPct));
}

function buildContenders(
  entries: Array<{
    label: string;
    teamCode: string;
    stat: number;
    statLabel: string;
  }>
): AwardContender[] {
  const chances = winChances(entries.map((e) => e.stat));
  return entries.map((entry, i) => {
    const team = buildTeamInfo(entry.teamCode, "");
    return {
      rank: i + 1,
      label: entry.label,
      teamCode: entry.teamCode,
      teamName: team.name,
      stat: entry.stat,
      statLabel: entry.statLabel,
      winChance: chances[i] ?? 0,
    };
  });
}

function bootCommentary(contenders: AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a) {
    return capForecast(
      "The Golden Boot race is just getting started — every knockout goal reshuffles the leaderboard. Strikers who survive deep into the bracket get extra chances to pad their totals, so expect late surges from teams that reach the semi-finals and final.",
      AWARD_COMMENTARY_MAX_CHARS
    );
  }
  if (!b || a.stat === b.stat) {
    return capForecast(
      `${a.label} (${a.teamName}) leads the scoring charts with ${a.stat} ${a.statLabel} — roughly a ${a.winChance}% chance to finish as top scorer if the tournament ended today. With ${progress}% of matches complete, one hot streak in the knockouts could still flip the race overnight.`,
      AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} leads on ${a.stat} ${a.statLabel} (${a.winChance}% chance), with ${b.label} (${b.teamName}) on ${b.stat} chasing at ${b.winChance}%. The gap matters less in knockout football — a hat-trick in the quarter-finals can swing the Golden Boot. ${progress}% of the tournament is in the books; expect the leader board to tighten before the final whistle.`,
    AWARD_COMMENTARY_MAX_CHARS
  );
}

function gloveCommentary(contenders: AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a) {
    return capForecast(
      "The Golden Glove goes to the best goalkeeper of the tournament — clean sheets and goals conceded in high-stakes knockouts weigh heavily. Keepers on teams that advance far naturally get more opportunities to build their case.",
      AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} (${a.teamName}) tops the defensive standings with ${a.stat} ${a.statLabel} and about a ${a.winChance}% chance to back the Golden Glove winner. ${b ? `${b.label} is next on ${b.stat} ${b.statLabel} (${b.winChance}%). ` : ""}Rankings use verified match results — clean sheets and goals conceded — from the live World Cup feed. ${progress}% through the tournament, the race is still live.`,
    AWARD_COMMENTARY_MAX_CHARS
  );
}

function ballCommentary(contenders: AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a) {
    return capForecast(
      "The Golden Ball honours the tournament's best player — not just goals, but influence in big moments, leadership, and performances when it matters most. The winner is often decided in the semi-finals and final.",
      AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} (${a.teamName}) leads the Golden Ball tracker on ${a.stat} tournament ${a.statLabel} (~${a.winChance}% proxy chance). ${b ? `${b.label} (${b.teamName}) is pressing with ${b.stat} (${b.winChance}%). ` : ""}This is a goals-based live proxy until full player ratings are available — voters still weigh creativity and clutch moments in the final rounds. ${progress}% of matches played.`,
    AWARD_COMMENTARY_MAX_CHARS
  );
}

function youngCommentary(contenders: AwardContender[], progress: number): string {
  const [a, b] = contenders;
  if (!a) {
    return capForecast(
      "The Best Young Player award spotlights stars born on or after 1 January 2004. Breakout performances in the group stage and fearless displays in knockouts have launched careers at past World Cups — this edition is no different.",
      AWARD_COMMENTARY_MAX_CHARS
    );
  }
  return capForecast(
    `${a.label} (${a.teamName}) leads eligible young scorers on ${a.stat} ${a.statLabel} (~${a.winChance}%). ${b ? `${b.label} (${b.teamName}) is close behind at ${b.winChance}%. ` : ""}Only players born on or after 1 January 2004 with verified birthdays are listed. ${progress}% of the tournament is complete; a standout semi-final could seal it.`,
    AWARD_COMMENTARY_MAX_CHARS
  );
}

function goldenBootFromScorers(
  scorers: Array<{ playerName: string; teamCode: string; teamName: string; goals: number }>,
  tournamentPct: number
): WorldCupAward {
  const entries = scorers.slice(0, 5).map((s) => ({
    label: s.playerName,
    teamCode: s.teamCode,
    stat: s.goals,
    statLabel: s.goals === 1 ? "goal" : "goals",
  }));
  const contenders = buildContenders(entries);
  const leader = contenders[0]?.stat ?? 0;
  const second = contenders[1]?.stat ?? 0;

  return {
    id: "golden-boot",
    name: "Golden Boot",
    sponsor: "Adidas",
    emoji: "👟",
    description:
      "Awarded to the tournament's top goalscorer. Tallies are compiled from verified goal events in the live match feed.",
    progress: raceProgress(tournamentPct, leader, second, 6),
    contenders,
    commentary: bootCommentary(contenders, tournamentPct),
  };
}

function goldenGloveFromDefense(
  goalStats: TournamentGoalStats,
  tournamentPct: number
): WorldCupAward | null {
  const top = goalStats.teamDefense.slice(0, 5);
  if (top.length === 0) return null;

  const entries = top.map((row) => ({
    label: row.teamName,
    teamCode: row.teamCode,
    stat: row.cleanSheets,
    statLabel: row.cleanSheets === 1 ? "clean sheet" : "clean sheets",
  }));
  const contenders = buildContenders(entries);
  const score = (row: (typeof top)[0]) => row.cleanSheets * 3 - row.goalsConceded * 0.4;

  return {
    id: "golden-glove",
    name: "Golden Glove",
    sponsor: "Adidas",
    emoji: "🧤",
    description:
      "Proxy for the best goalkeeper: teams ranked by clean sheets and goals conceded from verified match results.",
    progress: raceProgress(tournamentPct, score(top[0]!), score(top[1] ?? top[0]!), 8),
    contenders,
    commentary: gloveCommentary(contenders, tournamentPct),
  };
}

function goldenBallFromScorers(
  scorers: Array<{ playerName: string; teamCode: string; teamName: string; goals: number }>,
  tournamentPct: number
): WorldCupAward | null {
  if (scorers.length === 0) return null;

  const entries = scorers.slice(0, 5).map((s) => ({
    label: s.playerName,
    teamCode: s.teamCode,
    stat: s.goals,
    statLabel: s.goals === 1 ? "goal" : "goals",
  }));
  const contenders = buildContenders(entries);

  return {
    id: "golden-ball",
    name: "Golden Ball",
    sponsor: "Adidas",
    emoji: "⚽",
    description:
      "Awarded to the best player of the tournament — live tracker uses verified goals as a proxy until media voting closes.",
    progress: raceProgress(tournamentPct, entries[0]?.stat ?? 0, entries[1]?.stat ?? 0, 6),
    contenders,
    commentary: ballCommentary(contenders, tournamentPct),
  };
}

function youngPlayerFromScorers(
  youngScorers: TournamentGoalStats["youngScorers"],
  tournamentPct: number
): WorldCupAward | null {
  if (youngScorers.length === 0) return null;

  const entries = youngScorers.slice(0, 5).map((s) => ({
    label: `${s.playerName} (${s.ageYears})`,
    teamCode: s.teamCode,
    stat: s.goals,
    statLabel: s.goals === 1 ? "goal" : "goals",
  }));
  const contenders = buildContenders(entries);

  return {
    id: "young-player",
    name: "Best Young Player",
    sponsor: "FIFA",
    emoji: "🌟",
    description:
      "Awarded to the best player born on or after 1 January 2004 — ranked by goals among eligible scorers with verified birthdays.",
    progress: raceProgress(
      tournamentPct,
      youngScorers[0]?.goals ?? 0,
      youngScorers[1]?.goals ?? 0,
      3
    ),
    contenders,
    commentary: youngCommentary(contenders, tournamentPct),
  };
}

function mergeScorerRows(
  primary: TournamentGoalStats["scorers"],
  apiScorers: Awaited<ReturnType<typeof fetchWorldCupScorers>>
): TournamentGoalStats["scorers"] {
  if (!apiScorers?.length) return primary;

  const byKey = new Map(
    primary.map((row) => [`${row.playerName.toLowerCase()}|${row.teamCode}`, row])
  );

  for (const row of apiScorers) {
    const key = `${row.playerName.toLowerCase()}|${row.teamCode}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        playerName: row.playerName,
        teamCode: row.teamCode,
        teamName: row.teamName,
        goals: row.goals,
        penalties: 0,
      });
      continue;
    }
    if (row.goals > existing.goals) {
      existing.goals = row.goals;
    }
  }

  return [...byKey.values()].sort(
    (a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName)
  );
}

export async function buildWorldCupAwards(
  allMatches: MatchInfo[],
  goalStats: TournamentGoalStats
): Promise<WorldCupAward[]> {
  const tournamentPct = tournamentProgress(allMatches);
  const apiScorers = await fetchWorldCupScorers(12);
  const scorers = mergeScorerRows(goalStats.scorers, apiScorers);

  const awards: WorldCupAward[] = [goldenBootFromScorers(scorers, tournamentPct)];

  const goldenGlove = goldenGloveFromDefense(goalStats, tournamentPct);
  if (goldenGlove) awards.push(goldenGlove);

  const goldenBall = goldenBallFromScorers(scorers, tournamentPct);
  if (goldenBall) awards.push(goldenBall);

  const youngPlayer = youngPlayerFromScorers(goalStats.youngScorers, tournamentPct);
  if (youngPlayer) awards.push(youngPlayer);

  return awards;
}
