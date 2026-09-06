import { capForecast } from "@/lib/match-forecast";
import type { LeagueStandingRow, LeagueStandings } from "@/lib/premier-league-types";
import type { MatchInfo, TeamInfo } from "@/lib/types";

export const PL_RECORD_COMMENTARY_MAX_CHARS = 300;

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
  allTime: PremierLeagueRecordMark;
  season: PremierLeagueRecordMark;
  highlightSeason: "leading" | "all-time" | null;
  commentary: string;
}

function record(
  partial: Omit<PremierLeagueRecord, "commentary"> & { commentary: string }
): PremierLeagueRecord {
  return {
    ...partial,
    commentary: capForecast(partial.commentary, PL_RECORD_COMMENTARY_MAX_CHARS),
  };
}

function teamLabel(team: TeamInfo): string {
  return team.shortName ?? team.name;
}

function vsLabel(match: MatchInfo): string {
  return `${teamLabel(match.homeTeam)} vs ${teamLabel(match.awayTeam)}`;
}

function finishedMatches(matches: MatchInfo[]): MatchInfo[] {
  return matches.filter(
    (m) => m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null
  );
}

function totalGoals(matches: MatchInfo[]): number {
  return finishedMatches(matches).reduce(
    (sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0
  );
}

function highestScoringMatch(matches: MatchInfo[]): { match: MatchInfo; goals: number } | null {
  let best: { match: MatchInfo; goals: number } | null = null;
  for (const m of finishedMatches(matches)) {
    const goals = m.homeScore! + m.awayScore!;
    if (!best || goals > best.goals) best = { match: m, goals };
  }
  return best;
}

function biggestWin(matches: MatchInfo[]): {
  match: MatchInfo;
  margin: number;
  winner: string;
  winnerCode: string;
  scoreline: string;
} | null {
  let best: {
    match: MatchInfo;
    margin: number;
    winner: string;
    winnerCode: string;
    scoreline: string;
  } | null = null;

  for (const m of finishedMatches(matches)) {
    const margin = Math.abs(m.homeScore! - m.awayScore!);
    if (margin === 0) continue;
    const homeWins = m.homeScore! > m.awayScore!;
    const winner = homeWins ? m.homeTeam.name : m.awayTeam.name;
    const winnerCode = homeWins ? m.homeTeam.code : m.awayTeam.code;
    const scoreline = `${m.homeScore}–${m.awayScore}`;
    if (!best || margin > best.margin) {
      best = { match: m, margin, winner, winnerCode, scoreline };
    }
  }
  return best;
}

function longestWinStreak(
  matches: MatchInfo[],
  rows: LeagueStandingRow[]
): { team: string; teamCode: string; length: number } | null {
  let best: { team: string; teamCode: string; length: number } | null = null;

  for (const row of rows) {
    const code = row.team.code;
    const teamMatches = finishedMatches(matches)
      .filter((m) => m.homeTeam.code === code || m.awayTeam.code === code)
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

    let cur = 0;
    let max = 0;
    for (const m of teamMatches) {
      const home = m.homeTeam.code === code;
      const gf = home ? m.homeScore! : m.awayScore!;
      const ga = home ? m.awayScore! : m.homeScore!;
      if (gf > ga) {
        cur += 1;
        max = Math.max(max, cur);
      } else {
        cur = 0;
      }
    }

    if (max > 0 && (!best || max > best.length)) {
      best = {
        team: row.team.shortName ?? row.team.name,
        teamCode: code,
        length: max,
      };
    }
  }

  return best;
}

function uniqueWinners(matches: MatchInfo[]): { count: number; names: string[] } {
  const winners = new Map<string, string>();
  for (const m of finishedMatches(matches)) {
    if (m.homeScore! === m.awayScore!) continue;
    const homeWins = m.homeScore! > m.awayScore!;
    const code = homeWins ? m.homeTeam.code : m.awayTeam.code;
    const name = homeWins
      ? m.homeTeam.shortName ?? m.homeTeam.name
      : m.awayTeam.shortName ?? m.awayTeam.name;
    winners.set(code, name);
  }
  return { count: winners.size, names: [...winners.values()] };
}

/**
 * Season & all-time Premier League records — same card shape as World Cup / F1 / La Liga.
 */
export function buildPremierLeagueRecords(
  matches: MatchInfo[],
  standings: LeagueStandings
): PremierLeagueRecord[] {
  const seasonLabel = standings.seasonLabel;
  const rows = standings.rows;
  const seasonNotStarted = rows.every((r) => r.played === 0);
  const leader = rows[0];
  const goalsLeader = [...rows].sort(
    (a, b) => b.goalsFor - a.goalsFor || b.points - a.points
  )[0];
  const winsLeader = [...rows].sort((a, b) => b.won - a.won || b.points - a.points)[0];
  const cleanest = [...rows].sort(
    (a, b) => a.goalsAgainst - b.goalsAgainst || b.points - a.points
  )[0];
  const finished = finishedMatches(matches);
  const goals = totalGoals(matches);
  const high = highestScoringMatch(matches);
  const bigWin = biggestWin(matches);
  const streak = longestWinStreak(matches, rows);
  const winners = uniqueWinners(matches);
  const gap = rows.length >= 2 ? rows[0]!.points - rows[1]!.points : null;
  const avgGoals =
    finished.length > 0 ? Math.round((goals / finished.length) * 100) / 100 : null;

  const awaiting: PremierLeagueRecordMark = {
    value: "—",
    holder: "Contestants TBD",
    context: seasonLabel,
  };

  return [
    record({
      id: "most-points-season",
      name: "Most Points in a Season",
      emoji: "📈",
      description:
        "Highest points total by one club in a single Premier League campaign — the modern title haul.",
      allTime: {
        value: "100 pts",
        holder: "Manchester City",
        teamCode: "MCI",
        context: "2017/18",
      },
      season: seasonNotStarted
        ? awaiting
        : leader
          ? {
              value: `${leader.points} pts`,
              holder: leader.team.shortName ?? leader.team.name,
              teamCode: leader.team.code,
              crest: leader.team.crest,
              context: `${seasonLabel} · MD ${standings.matchday}`,
            }
          : { value: "—", holder: "Season not started", context: seasonLabel },
      highlightSeason:
        !seasonNotStarted && leader && leader.points >= 100
          ? "all-time"
          : !seasonNotStarted && leader && leader.points > 0
            ? "leading"
            : null,
      commentary: `Manchester City's 100-point season in 2017/18 remains the gold standard. ${
        seasonNotStarted
          ? "The contestants are yet to be seen — nobody leads a blank scorecard."
          : leader && leader.points > 0
            ? `${leader.team.name} lead ${seasonLabel} on ${leader.points} after ${leader.played} match${leader.played === 1 ? "" : "es"}.`
            : "The points race opens with Matchday 1."
      } Commentators watch every dropped point as title maths.`,
    }),

    record({
      id: "most-goals-club-season",
      name: "Most Goals by a Club",
      emoji: "⚽",
      description:
        "Most league goals scored by one side in a single season — attacking fireworks over 38 games.",
      allTime: {
        value: "106 goals",
        holder: "Manchester City",
        teamCode: "MCI",
        context: "2017/18",
      },
      season: seasonNotStarted
        ? awaiting
        : goalsLeader && goalsLeader.goalsFor > 0
          ? {
              value: `${goalsLeader.goalsFor} goals`,
              holder: goalsLeader.team.shortName ?? goalsLeader.team.name,
              teamCode: goalsLeader.team.code,
              crest: goalsLeader.team.crest,
              context: `${seasonLabel} · ${goalsLeader.played} played`,
            }
          : { value: "—", holder: "No goals yet", context: seasonLabel },
      highlightSeason:
        !seasonNotStarted && goalsLeader && goalsLeader.goalsFor >= 106
          ? "all-time"
          : !seasonNotStarted && goalsLeader && goalsLeader.goalsFor > 0
            ? "leading"
            : null,
      commentary: `City's 106 in 2017/18 is the Premier League scoring mountain. ${
        seasonNotStarted
          ? "Nobody has a goal on the board until the first ball is kicked."
          : goalsLeader && goalsLeader.goalsFor > 0
            ? `${goalsLeader.team.name} lead ${seasonLabel} with ${goalsLeader.goalsFor}.`
            : "The charts fill after the first weekend."
      }`,
    }),

    record({
      id: "most-wins-season",
      name: "Most Wins in a Season",
      emoji: "✅",
      description: "Most league victories by one club in a 38-game Premier League season.",
      allTime: {
        value: "32 wins",
        holder: "Manchester City",
        teamCode: "MCI",
        context: "2017/18 & 2018/19",
      },
      season: seasonNotStarted
        ? awaiting
        : winsLeader && winsLeader.won > 0
          ? {
              value: `${winsLeader.won} wins`,
              holder: winsLeader.team.shortName ?? winsLeader.team.name,
              teamCode: winsLeader.team.code,
              crest: winsLeader.team.crest,
              context: `${seasonLabel} · ${winsLeader.played} played`,
            }
          : { value: "—", holder: "No wins yet", context: seasonLabel },
      highlightSeason:
        !seasonNotStarted && winsLeader && winsLeader.won >= 32
          ? "all-time"
          : !seasonNotStarted && winsLeader && winsLeader.won > 0
            ? "leading"
            : null,
      commentary: `City's 32 wins in back-to-back seasons set the bar. ${
        seasonNotStarted
          ? "The win column is empty until Kickoff 1."
          : winsLeader && winsLeader.won > 0
            ? `${winsLeader.team.name} have ${winsLeader.won} so far in ${seasonLabel}.`
            : "Sunday results start the wins race."
      }`,
    }),

    record({
      id: "win-streak",
      name: "Longest Win Streak",
      emoji: "🔁",
      description: "Most consecutive Premier League victories in a row — pure momentum.",
      allTime: {
        value: "18 in a row",
        holder: "Manchester City",
        teamCode: "MCI",
        context: "Aug–Dec 2017",
      },
      season: streak
        ? {
            value: `${streak.length} in a row`,
            holder: streak.team,
            teamCode: streak.teamCode,
            context: `${seasonLabel} best streak`,
          }
        : awaiting,
      highlightSeason: streak && streak.length >= 18 ? "all-time" : streak ? "leading" : null,
      commentary: `City's 18-game run in 2017 rewrote the consecutive-wins chart. ${
        streak
          ? `${streak.team} own ${seasonLabel}'s longest streak at ${streak.length}.`
          : "Streaks start the first time a side strings two Sundays together."
      }`,
    }),

    record({
      id: "biggest-win",
      name: "Biggest Win",
      emoji: "💥",
      description: "Largest winning margin in a Premier League match — a true hiding.",
      allTime: {
        value: "9–0",
        holder: "Leicester City",
        teamCode: "LEI",
        context: "vs Southampton · 2019",
      },
      season: bigWin
        ? {
            value: bigWin.scoreline,
            holder: bigWin.winner,
            teamCode: bigWin.winnerCode,
            context: `${vsLabel(bigWin.match)} · margin ${bigWin.margin}`,
          }
        : awaiting,
      highlightSeason: bigWin && bigWin.margin >= 9 ? "all-time" : bigWin ? "leading" : null,
      commentary: `Leicester's 9–0 in 2019 (and United's 9–0 vs Ipswich in 1995) sit at the top. ${
        bigWin
          ? `${bigWin.winner} have ${seasonLabel}'s biggest win at ${bigWin.scoreline}.`
          : "The first blowout writes this card."
      }`,
    }),

    record({
      id: "highest-scoring-match",
      name: "Highest-Scoring Match",
      emoji: "🎯",
      description: "Most goals in a single Premier League fixture — both nets rattling.",
      allTime: {
        value: "11 goals",
        holder: "Portsmouth 7–4 Reading",
        context: "2007/08",
      },
      season: high
        ? {
            value: `${high.goals} goals`,
            holder: vsLabel(high.match),
            teamCode: high.match.homeTeam.code,
            crest: high.match.homeTeam.crest,
            context: `${high.match.homeScore}–${high.match.awayScore}`,
          }
        : awaiting,
      highlightSeason: high && high.goals >= 11 ? "all-time" : high ? "leading" : null,
      commentary: `Portsmouth 7–4 Reading in 2007 remains the 11-goal classic. ${
        high
          ? `${vsLabel(high.match)} lead ${seasonLabel} with ${high.goals} goals.`
          : "The first feast fills this box."
      }`,
    }),

    record({
      id: "fewest-goals-conceded",
      name: "Best Defence",
      emoji: "🧱",
      description: "Fewest goals conceded in a 38-game Premier League season.",
      allTime: {
        value: "15 conceded",
        holder: "Chelsea",
        teamCode: "CHE",
        context: "2004/05",
      },
      season: seasonNotStarted
        ? awaiting
        : cleanest && cleanest.played > 0
          ? {
              value: `${cleanest.goalsAgainst} conceded`,
              holder: cleanest.team.shortName ?? cleanest.team.name,
              teamCode: cleanest.team.code,
              crest: cleanest.team.crest,
              context: `${seasonLabel} · ${cleanest.played} played`,
            }
          : { value: "—", holder: "No minutes yet", context: seasonLabel },
      highlightSeason:
        !seasonNotStarted && cleanest && cleanest.played >= 30 && cleanest.goalsAgainst <= 15
          ? "all-time"
          : !seasonNotStarted && cleanest && cleanest.played > 0
            ? "leading"
            : null,
      commentary: `Mourinho's Chelsea leaked just 15 in 2004/05. ${
        seasonNotStarted
          ? "Clean sheets are theoretical until Matchday 1."
          : cleanest && cleanest.played > 0
            ? `${cleanest.team.name} have conceded ${cleanest.goalsAgainst} in ${seasonLabel}.`
            : "The defence charts open with the first goal."
      }`,
    }),

    record({
      id: "title-gap",
      name: "Closest Title Fight",
      emoji: "🥇",
      description: "Smallest gap between first and second — drama measured in points and GD.",
      allTime: {
        value: "GD only",
        holder: "City vs United",
        teamCode: "MCI",
        context: "Both 89 pts · 2011/12",
      },
      season:
        gap === null || seasonNotStarted
          ? awaiting
          : {
              value: `${gap} pt${gap === 1 ? "" : "s"}`,
              holder: `${leader?.team.shortName ?? "Leader"} vs ${rows[1]?.team.shortName ?? "2nd"}`,
              teamCode: leader?.team.code,
              crest: leader?.team.crest,
              context: `${seasonLabel} live gap`,
            },
      highlightSeason: !seasonNotStarted && gap !== null ? "leading" : null,
      commentary: `2011/12 ended with City and United on 89 points — Agueroooo. ${
        seasonNotStarted
          ? "The gap is theoretical until two clubs have points."
          : gap !== null
            ? `Right now the gap is ${gap} point${gap === 1 ? "" : "s"}.`
            : "The table needs two rows to make a race."
      }`,
    }),

    record({
      id: "different-winners",
      name: "Different Match Winners",
      emoji: "🎲",
      description: "How many different clubs have won a league match this season — how open it is.",
      allTime: {
        value: "20 winners",
        holder: "2010/11 season",
        context: "Every club won at least once",
      },
      season:
        winners.count > 0
          ? {
              value: `${winners.count} winners`,
              holder: winners.names.slice(0, 3).join(", ") + (winners.names.length > 3 ? "…" : ""),
              context: `${seasonLabel} · ${finished.length} results`,
            }
          : awaiting,
      highlightSeason: winners.count >= 20 ? "all-time" : winners.count > 0 ? "leading" : null,
      commentary: `In 2010/11 every Premier League club won at least once. ${
        winners.count > 0
          ? `${seasonLabel} has ${winners.count} different winners so far.`
          : "The first result starts the variety count."
      }`,
    }),

    record({
      id: "goals-per-game",
      name: "Goals per Game",
      emoji: "📊",
      description: "Average goals across finished Premier League fixtures this season.",
      allTime: {
        value: "3.28",
        holder: "2023/24 season",
        context: "Highest scoring PL campaign",
      },
      season:
        avgGoals !== null
          ? {
              value: avgGoals.toFixed(2),
              holder: "Premier League",
              context: `${goals} goals in ${finished.length} matches`,
            }
          : awaiting,
      highlightSeason: avgGoals !== null && avgGoals >= 3.28 ? "all-time" : avgGoals !== null ? "leading" : null,
      commentary: `2023/24's 3.28 goals per game is the modern scoring boom. ${
        avgGoals !== null
          ? `${seasonLabel} is averaging ${avgGoals} across ${finished.length} results.`
          : "The rate appears after Matchday 1."
      }`,
    }),

    record({
      id: "most-titles",
      name: "Most League Titles",
      emoji: "👑",
      description: "Most English top-flight championships won by a club — the all-time kings.",
      allTime: {
        value: "20 titles",
        holder: "Manchester United",
        teamCode: "MUN",
        context: "All-time leaders",
      },
      season: seasonNotStarted
        ? awaiting
        : leader
          ? {
              value: "Chasing history",
              holder: leader.team.shortName ?? leader.team.name,
              teamCode: leader.team.code,
              crest: leader.team.crest,
              context: `${seasonLabel} table leaders`,
            }
          : { value: "—", holder: "Season not started", context: seasonLabel },
      highlightSeason: !seasonNotStarted && leader && leader.points > 0 ? "leading" : null,
      commentary: `Manchester United's 20 titles remain the English mountain. ${
        seasonNotStarted
          ? "History can wait until Matchday 1."
          : leader && leader.points > 0
            ? `${leader.team.name} currently top ${seasonLabel} — every point is another step toward adding to the pile.`
            : "The next champion will be decided across 38 matchdays."
      }`,
    }),

    record({
      id: "all-time-scorer",
      name: "All-Time Top Scorer",
      emoji: "🐐",
      description:
        "Most Premier League goals by one player across their career — the number every forward is measured against.",
      allTime: {
        value: "260 goals",
        holder: "Alan Shearer",
        teamCode: "NEW",
        context: "1992–2006",
      },
      season: {
        value: "260 goals",
        holder: "Alan Shearer",
        teamCode: "NEW",
        context: "Record still stands",
      },
      highlightSeason: null,
      commentary:
        "Shearer's 260 remains the Premier League Everest. Kane left on 213 — every modern Golden Boot chase still gets compared to that Blackburn-and-Newcastle haul.",
    }),

    record({
      id: "unbeaten-season",
      name: "Unbeaten Season",
      emoji: "✨",
      description: "A full Premier League campaign without a single defeat — the Invincibles bar.",
      allTime: {
        value: "38 unbeaten",
        holder: "Arsenal",
        teamCode: "ARS",
        context: "2003/04 · 26W 12D",
      },
      season: (() => {
        const unbeaten = rows
          .filter((r) => r.played > 0 && r.lost === 0)
          .sort((a, b) => b.points - a.points)[0];
        return unbeaten
          ? {
              value: `${unbeaten.played} unbeaten`,
              holder: unbeaten.team.shortName ?? unbeaten.team.name,
              teamCode: unbeaten.team.code,
              crest: unbeaten.team.crest,
              context: `${seasonLabel} · ${unbeaten.won}W ${unbeaten.drawn}D`,
            }
          : { value: "—", holder: "No unbeaten clubs", context: seasonLabel };
      })(),
      highlightSeason:
        rows.some((r) => r.played >= 38 && r.lost === 0)
          ? "all-time"
          : rows.some((r) => r.played > 0 && r.lost === 0)
            ? "leading"
            : null,
      commentary: `Wenger's Invincibles in 2003/04 remain unique. ${
        rows.some((r) => r.played > 0 && r.lost === 0)
          ? "At least one club is still without a loss this season — the clock starts ticking with every away trip."
          : "Everyone has a defeat, or the season hasn't started."
      }`,
    }),

    record({
      id: "consecutive-titles",
      name: "Consecutive Titles",
      emoji: "📚",
      description: "Most Premier League titles won in a row — dynasty maths.",
      allTime: {
        value: "4 in a row",
        holder: "Manchester City",
        teamCode: "MCI",
        context: "2020/21–2023/24",
      },
      season: seasonNotStarted
        ? awaiting
        : leader
          ? {
              value: "Defending / chasing",
              holder: leader.team.shortName ?? leader.team.name,
              teamCode: leader.team.code,
              crest: leader.team.crest,
              context: `${seasonLabel} table leaders`,
            }
          : awaiting,
      highlightSeason: !seasonNotStarted && leader && leader.points > 0 ? "leading" : null,
      commentary: `City's four-in-a-row is the Premier League dynasty record, passing United's threes. ${
        seasonNotStarted
          ? "The next chapter opens in August."
          : leader
            ? `${leader.team.name} sit top of ${seasonLabel} while that history sits in the studio graphic.`
            : "38 games decide whether the streak grows or snaps."
      }`,
    }),

    record({
      id: "best-goal-difference",
      name: "Best Goal Difference",
      emoji: "📐",
      description: "Healthiest goals scored minus conceded in a Premier League season.",
      allTime: {
        value: "+79",
        holder: "Manchester City",
        teamCode: "MCI",
        context: "2017/18",
      },
      season: seasonNotStarted
        ? awaiting
        : leader
          ? {
              value: `${leader.goalDifference >= 0 ? "+" : ""}${leader.goalDifference}`,
              holder: leader.team.shortName ?? leader.team.name,
              teamCode: leader.team.code,
              crest: leader.team.crest,
              context: `${leader.goalsFor} for · ${leader.goalsAgainst} against`,
            }
          : awaiting,
      highlightSeason:
        !seasonNotStarted && leader && leader.goalDifference >= 79
          ? "all-time"
          : !seasonNotStarted && leader && leader.played > 0
            ? "leading"
            : null,
      commentary: `City's +79 in 2017/18 is the GD Everest. ${
        seasonNotStarted
          ? "Difference is zero-zero until someone scores."
          : leader
            ? `${leader.team.name} sit on ${leader.goalDifference >= 0 ? "+" : ""}${leader.goalDifference} in ${seasonLabel}.`
            : "GD appears with the first goal."
      }`,
    }),
  ];
}
