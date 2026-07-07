import type { MatchInfo } from "@/lib/types";

export interface TournamentRecord {
  label: string;
  value: string;
  detail?: string;
}

export interface TournamentRecords {
  items: TournamentRecord[];
  finishedMatches: number;
  totalGoals: number;
}

function formatMatchup(match: MatchInfo): string {
  return `${match.homeTeam.name} ${match.homeScore}–${match.awayScore} ${match.awayTeam.name}`;
}

export function computeTournamentRecords(matches: MatchInfo[]): TournamentRecords {
  const finished = matches.filter(
    (match) => match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null
  );

  let totalGoals = 0;
  let highestScoring: MatchInfo | null = null;
  let biggestWin: MatchInfo | null = null;
  let biggestMargin = -1;

  const teamGoals = new Map<string, { name: string; goals: number }>();

  for (const match of finished) {
    const home = match.homeScore!;
    const away = match.awayScore!;
    const combined = home + away;
    totalGoals += combined;

    if (!highestScoring || combined > highestScoring.homeScore! + highestScoring.awayScore!) {
      highestScoring = match;
    }

    const margin = Math.abs(home - away);
    if (margin > biggestMargin) {
      biggestMargin = margin;
      biggestWin = match;
    }

    for (const [team, goals] of [
      [match.homeTeam, home],
      [match.awayTeam, away],
    ] as const) {
      const current = teamGoals.get(team.code) ?? { name: team.name, goals: 0 };
      current.goals += goals;
      teamGoals.set(team.code, current);
    }
  }

  const topScoringTeam = Array.from(teamGoals.values()).sort((a, b) => b.goals - a.goals)[0];
  const items: TournamentRecord[] = [];

  if (finished.length > 0) {
    items.push({
      label: "Matches played",
      value: String(finished.length),
      detail: `${totalGoals} total goals so far`,
    });
  }

  if (highestScoring) {
    items.push({
      label: "Highest-scoring match",
      value: `${highestScoring.homeScore! + highestScoring.awayScore!} goals`,
      detail: formatMatchup(highestScoring),
    });
  }

  if (biggestWin && biggestMargin > 0) {
    items.push({
      label: "Biggest win",
      value: `${biggestMargin}-goal margin`,
      detail: formatMatchup(biggestWin),
    });
  }

  if (topScoringTeam) {
    items.push({
      label: "Most goals by a team",
      value: `${topScoringTeam.goals} goals`,
      detail: topScoringTeam.name,
    });
  }

  return {
    items,
    finishedMatches: finished.length,
    totalGoals,
  };
}
