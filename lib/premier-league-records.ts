import type { LeagueStandingRow, LeagueStandings } from "@/lib/premier-league-types";
import type { MatchInfo, TeamInfo } from "@/lib/types";

export interface PremierLeagueRecordMark {
  value: string;
  holder: string;
  teamCode?: string;
  crest?: string;
  context?: string;
}

export interface PremierLeagueRecord {
  id: string;
  name: string;
  emoji: string;
  description: string;
  mark: PremierLeagueRecordMark;
}

function teamLabel(team: TeamInfo): string {
  return team.shortName ?? team.name;
}

function vsLabel(match: MatchInfo): string {
  return `${teamLabel(match.homeTeam)} vs ${teamLabel(match.awayTeam)}`;
}

function winnerOf(match: MatchInfo): TeamInfo | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return match.homeTeam;
  if (match.awayScore > match.homeScore) return match.awayTeam;
  return null;
}

function markFromTeam(
  row: LeagueStandingRow,
  value: string,
  context: string
): PremierLeagueRecordMark {
  return {
    value,
    holder: row.team.name,
    teamCode: row.team.code,
    crest: row.team.crest,
    context,
  };
}

function markFromMatch(
  match: MatchInfo,
  holderTeam: TeamInfo,
  value: string,
  context?: string
): PremierLeagueRecordMark {
  return {
    value,
    holder: holderTeam.name,
    teamCode: holderTeam.code,
    crest: holderTeam.crest,
    context: context ?? `${vsLabel(match)}${match.group ? ` · ${match.group}` : ""}`,
  };
}

function topByStat(
  rows: LeagueStandingRow[],
  pick: (row: LeagueStandingRow) => number,
  opts?: { ascending?: boolean; requirePositive?: boolean }
): LeagueStandingRow | null {
  const sorted = [...rows].sort((a, b) => {
    const av = pick(a);
    const bv = pick(b);
    if (opts?.ascending) return av - bv || a.position - b.position;
    return bv - av || a.position - b.position;
  });
  const leader = sorted[0];
  if (!leader || leader.played === 0) return null;
  if (opts?.requirePositive && pick(leader) <= 0) return null;
  return leader;
}

type SideStats = {
  team: TeamInfo;
  played: number;
  won: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
};

function emptySide(team: TeamInfo): SideStats {
  return {
    team,
    played: 0,
    won: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
  };
}

function applySideResult(stats: SideStats, gf: number, ga: number) {
  stats.played += 1;
  stats.goalsFor += gf;
  stats.goalsAgainst += ga;
  if (ga === 0) stats.cleanSheets += 1;
  if (gf > ga) {
    stats.won += 1;
    stats.points += 3;
  } else if (gf === ga) {
    stats.points += 1;
  }
}

function computeSideStats(matches: MatchInfo[]): {
  home: Map<string, SideStats>;
  away: Map<string, SideStats>;
  cleanSheets: Map<string, { team: TeamInfo; count: number }>;
} {
  const home = new Map<string, SideStats>();
  const away = new Map<string, SideStats>();
  const cleanSheets = new Map<string, { team: TeamInfo; count: number }>();

  const bumpClean = (team: TeamInfo) => {
    const cur = cleanSheets.get(team.code) ?? { team, count: 0 };
    cur.count += 1;
    cleanSheets.set(team.code, cur);
  };

  for (const match of matches) {
    const hs = match.homeScore!;
    const as = match.awayScore!;

    if (!home.has(match.homeTeam.code)) home.set(match.homeTeam.code, emptySide(match.homeTeam));
    if (!away.has(match.awayTeam.code)) away.set(match.awayTeam.code, emptySide(match.awayTeam));

    applySideResult(home.get(match.homeTeam.code)!, hs, as);
    applySideResult(away.get(match.awayTeam.code)!, as, hs);

    if (as === 0) bumpClean(match.homeTeam);
    if (hs === 0) bumpClean(match.awayTeam);
  }

  return { home, away, cleanSheets };
}

function bestSideBy(
  side: Map<string, SideStats>,
  pick: (s: SideStats) => number
): SideStats | null {
  let best: SideStats | null = null;
  for (const stats of side.values()) {
    if (stats.played === 0) continue;
    if (!best || pick(stats) > pick(best)) best = stats;
  }
  return best && pick(best) > 0 ? best : null;
}

/** Chronological results for streak detection: newest not required — oldest first. */
function teamResultsChrono(
  code: string,
  matches: MatchInfo[]
): Array<"W" | "D" | "L"> {
  return matches
    .filter(
      (m) =>
        m.homeTeam.code === code || m.awayTeam.code === code
    )
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .map((match) => {
      const home = match.homeTeam.code === code;
      const gf = home ? match.homeScore! : match.awayScore!;
      const ga = home ? match.awayScore! : match.homeScore!;
      if (gf > ga) return "W";
      if (gf < ga) return "L";
      return "D";
    });
}

function longestStreak(
  results: Array<"W" | "D" | "L">,
  predicate: (r: "W" | "D" | "L") => boolean
): number {
  let best = 0;
  let cur = 0;
  for (const r of results) {
    if (predicate(r)) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

function biggestWinOnSide(
  matches: MatchInfo[],
  side: "home" | "away"
): { match: MatchInfo; margin: number; winner: TeamInfo } | null {
  let best: { match: MatchInfo; margin: number; winner: TeamInfo } | null = null;

  for (const match of matches) {
    const hs = match.homeScore!;
    const as = match.awayScore!;
    if (hs === as) continue;

    if (side === "home" && hs <= as) continue;
    if (side === "away" && as <= hs) continue;

    const margin = Math.abs(hs - as);
    const winner = side === "home" ? match.homeTeam : match.awayTeam;
    if (!best || margin > best.margin) {
      best = { match, margin, winner };
    }
  }

  return best;
}

export function buildPremierLeagueRecords(
  matches: MatchInfo[],
  standings: LeagueStandings
): PremierLeagueRecord[] {
  const finished = matches.filter(
    (m) => m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null
  );

  const records: PremierLeagueRecord[] = [];
  const rows = standings.rows;

  const champion = rows[0];
  if (champion && champion.played > 0) {
    records.push({
      id: "top-of-table",
      name: "Table leaders",
      emoji: "👑",
      description: "Club sitting top of the Premier League.",
      mark: markFromTeam(
        champion,
        `${champion.points} pts`,
        `${champion.won}W-${champion.drawn}D-${champion.lost}L · GD ${champion.goalDifference >= 0 ? "+" : ""}${champion.goalDifference}`
      ),
    });
  }

  let highest: MatchInfo | null = null;
  let biggestWin: MatchInfo | null = null;
  let highestDraw: MatchInfo | null = null;
  let biggestMargin = -1;
  let highestGoals = -1;
  let highestDrawGoals = -1;
  let seasonGoals = 0;

  for (const match of finished) {
    const total = match.homeScore! + match.awayScore!;
    seasonGoals += total;

    if (total > highestGoals) {
      highestGoals = total;
      highest = match;
    }

    const margin = Math.abs(match.homeScore! - match.awayScore!);
    if (margin > biggestMargin) {
      biggestMargin = margin;
      biggestWin = match;
    }

    if (match.homeScore === match.awayScore && total > highestDrawGoals) {
      highestDrawGoals = total;
      highestDraw = match;
    }
  }

  if (highest) {
    const holder = winnerOf(highest) ?? highest.homeTeam;
    records.push({
      id: "highest-scoring",
      name: "Highest-scoring match",
      emoji: "🎯",
      description: "Most goals in a single Premier League fixture this season.",
      mark: markFromMatch(
        highest,
        holder,
        `${highest.homeScore}–${highest.awayScore}`,
        `${vsLabel(highest)} · ${highestGoals} goals`
      ),
    });
  }

  if (biggestWin && biggestMargin > 0) {
    const winner = winnerOf(biggestWin)!;
    records.push({
      id: "biggest-win",
      name: "Biggest win",
      emoji: "💥",
      description: "Largest winning margin so far this season.",
      mark: markFromMatch(
        biggestWin,
        winner,
        `${biggestWin.homeScore}–${biggestWin.awayScore}`,
        `${vsLabel(biggestWin)} · margin ${biggestMargin}`
      ),
    });
  }

  const biggestHome = biggestWinOnSide(finished, "home");
  if (biggestHome) {
    records.push({
      id: "biggest-home-win",
      name: "Biggest home win",
      emoji: "🏠",
      description: "Widest home victory this season.",
      mark: markFromMatch(
        biggestHome.match,
        biggestHome.winner,
        `${biggestHome.match.homeScore}–${biggestHome.match.awayScore}`,
        `${vsLabel(biggestHome.match)} · margin ${biggestHome.margin}`
      ),
    });
  }

  const biggestAway = biggestWinOnSide(finished, "away");
  if (biggestAway) {
    records.push({
      id: "biggest-away-win",
      name: "Biggest away win",
      emoji: "✈️",
      description: "Widest away victory this season.",
      mark: markFromMatch(
        biggestAway.match,
        biggestAway.winner,
        `${biggestAway.match.homeScore}–${biggestAway.match.awayScore}`,
        `${vsLabel(biggestAway.match)} · margin ${biggestAway.margin}`
      ),
    });
  }

  if (highestDraw && highestDrawGoals > 0) {
    records.push({
      id: "highest-draw",
      name: "Highest-scoring draw",
      emoji: "🤝",
      description: "The most goals shared in a draw this season.",
      mark: {
        value: `${highestDraw.homeScore}–${highestDraw.awayScore}`,
        holder: vsLabel(highestDraw),
        teamCode: highestDraw.homeTeam.code,
        crest: highestDraw.homeTeam.crest,
        context: highestDraw.group ?? `${highestDrawGoals} goals`,
      },
    });
  }

  const bestAttack = topByStat(rows, (r) => r.goalsFor, { requirePositive: true });
  if (bestAttack) {
    records.push({
      id: "goals-for",
      name: "Top attack",
      emoji: "🔥",
      description: "Most goals scored in the league this season.",
      mark: markFromTeam(
        bestAttack,
        String(bestAttack.goalsFor),
        `${bestAttack.played} matches · ${bestAttack.won} wins`
      ),
    });
  }

  const bestDefence = topByStat(rows, (r) => r.goalsAgainst, { ascending: true });
  if (bestDefence) {
    records.push({
      id: "goals-against",
      name: "Best defence",
      emoji: "🧱",
      description: "Fewest goals conceded this season.",
      mark: markFromTeam(
        bestDefence,
        String(bestDefence.goalsAgainst),
        `${bestDefence.played} matches · GD ${bestDefence.goalDifference >= 0 ? "+" : ""}${bestDefence.goalDifference}`
      ),
    });
  }

  const bestGd = topByStat(rows, (r) => r.goalDifference);
  if (bestGd && bestGd.goalDifference > 0) {
    records.push({
      id: "goal-difference",
      name: "Best goal difference",
      emoji: "📈",
      description: "Healthiest goals scored minus conceded.",
      mark: markFromTeam(
        bestGd,
        `${bestGd.goalDifference > 0 ? "+" : ""}${bestGd.goalDifference}`,
        `${bestGd.goalsFor} scored · ${bestGd.goalsAgainst} conceded`
      ),
    });
  }

  const mostWins = topByStat(rows, (r) => r.won, { requirePositive: true });
  if (mostWins) {
    records.push({
      id: "most-wins",
      name: "Most wins",
      emoji: "✅",
      description: "Club with the most victories this season.",
      mark: markFromTeam(
        mostWins,
        String(mostWins.won),
        `${mostWins.points} pts · ${mostWins.played} played`
      ),
    });
  }

  const mostDraws = topByStat(rows, (r) => r.drawn, { requirePositive: true });
  if (mostDraws) {
    records.push({
      id: "most-draws",
      name: "Draw specialists",
      emoji: "⚖️",
      description: "Most shared points from draws.",
      mark: markFromTeam(
        mostDraws,
        String(mostDraws.drawn),
        `${mostDraws.points} pts · P${mostDraws.position}`
      ),
    });
  }

  const fewestWins = topByStat(rows, (r) => r.won, { ascending: true });
  if (fewestWins && fewestWins.played > 0) {
    records.push({
      id: "fewest-wins",
      name: "Fewest wins",
      emoji: "🧊",
      description: "Club still searching for victories this season.",
      mark: markFromTeam(
        fewestWins,
        String(fewestWins.won),
        `${fewestWins.points} pts · P${fewestWins.position}`
      ),
    });
  }

  const { home, away, cleanSheets } = computeSideStats(finished);

  const bestHomePoints = bestSideBy(home, (s) => s.points);
  if (bestHomePoints) {
    records.push({
      id: "home-points",
      name: "Fortress",
      emoji: "🏟️",
      description: "Most points taken at home.",
      mark: {
        value: `${bestHomePoints.points} pts`,
        holder: bestHomePoints.team.name,
        teamCode: bestHomePoints.team.code,
        crest: bestHomePoints.team.crest,
        context: `${bestHomePoints.won} home wins · ${bestHomePoints.played} home games`,
      },
    });
  }

  const bestAwayPoints = bestSideBy(away, (s) => s.points);
  if (bestAwayPoints) {
    records.push({
      id: "away-points",
      name: "Road warriors",
      emoji: "🚌",
      description: "Most points taken on the road.",
      mark: {
        value: `${bestAwayPoints.points} pts`,
        holder: bestAwayPoints.team.name,
        teamCode: bestAwayPoints.team.code,
        crest: bestAwayPoints.team.crest,
        context: `${bestAwayPoints.won} away wins · ${bestAwayPoints.played} away games`,
      },
    });
  }

  let cleanSheetLeader: { team: TeamInfo; count: number } | null = null;
  for (const entry of cleanSheets.values()) {
    if (!cleanSheetLeader || entry.count > cleanSheetLeader.count) {
      cleanSheetLeader = entry;
    }
  }
  if (cleanSheetLeader && cleanSheetLeader.count > 0) {
    records.push({
      id: "clean-sheets",
      name: "Clean sheets",
      emoji: "🧤",
      description: "Most matches without conceding.",
      mark: {
        value: String(cleanSheetLeader.count),
        holder: cleanSheetLeader.team.name,
        teamCode: cleanSheetLeader.team.code,
        crest: cleanSheetLeader.team.crest,
        context: "Shutouts this season",
      },
    });
  }

  let bestWinStreak: { team: TeamInfo; length: number } | null = null;
  let bestUnbeaten: { team: TeamInfo; length: number } | null = null;
  for (const row of rows) {
    const results = teamResultsChrono(row.team.code, finished);
    const winStreak = longestStreak(results, (r) => r === "W");
    const unbeaten = longestStreak(results, (r) => r !== "L");
    if (winStreak > 0 && (!bestWinStreak || winStreak > bestWinStreak.length)) {
      bestWinStreak = { team: row.team, length: winStreak };
    }
    if (unbeaten > 0 && (!bestUnbeaten || unbeaten > bestUnbeaten.length)) {
      bestUnbeaten = { team: row.team, length: unbeaten };
    }
  }

  if (bestWinStreak) {
    records.push({
      id: "win-streak",
      name: "Longest win streak",
      emoji: "🔁",
      description: "Most consecutive league wins in a row.",
      mark: {
        value: String(bestWinStreak.length),
        holder: bestWinStreak.team.name,
        teamCode: bestWinStreak.team.code,
        crest: bestWinStreak.team.crest,
        context: "Consecutive victories",
      },
    });
  }

  if (bestUnbeaten && (!bestWinStreak || bestUnbeaten.length > bestWinStreak.length)) {
    records.push({
      id: "unbeaten-run",
      name: "Longest unbeaten run",
      emoji: "🛡️",
      description: "Most matches without a league defeat in a row.",
      mark: {
        value: String(bestUnbeaten.length),
        holder: bestUnbeaten.team.name,
        teamCode: bestUnbeaten.team.code,
        crest: bestUnbeaten.team.crest,
        context: "Wins and draws without a loss",
      },
    });
  }

  if (finished.length > 0 && seasonGoals > 0) {
    const avg = seasonGoals / finished.length;
    records.push({
      id: "goals-per-game",
      name: "Goals per game",
      emoji: "📊",
      description: "Average goals across all finished fixtures this season.",
      mark: {
        value: avg.toFixed(2),
        holder: "Premier League",
        context: `${seasonGoals} goals in ${finished.length} matches`,
      },
    });
  }

  return records;
}
