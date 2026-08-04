import { capForecast } from "@/lib/match-forecast";
import type { LaLigaSeasonData, LeagueStandingRow } from "@/lib/la-liga-types";
import type { MatchInfo } from "@/lib/types";

export const LALIGA_RECORD_COMMENTARY_MAX_CHARS = 300;

export interface LaLigaRecordMark {
  value: string;
  holder: string;
  teamCode?: string;
  context?: string;
}

export interface LaLigaRecord {
  id: string;
  name: string;
  emoji: string;
  description: string;
  allTime: LaLigaRecordMark;
  season: LaLigaRecordMark;
  highlightSeason: "leading" | "all-time" | null;
  commentary: string;
}

function record(
  partial: Omit<LaLigaRecord, "commentary"> & { commentary: string }
): LaLigaRecord {
  return {
    ...partial,
    commentary: capForecast(partial.commentary, LALIGA_RECORD_COMMENTARY_MAX_CHARS),
  };
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

function highestScoringMatch(matches: MatchInfo[]): {
  match: MatchInfo;
  goals: number;
} | null {
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

function longestWinStreak(matches: MatchInfo[], rows: LeagueStandingRow[]): {
  team: string;
  teamCode: string;
  length: number;
} | null {
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
 * Season & all-time La Liga records — same shape as F1 / World Cup records cards.
 */
export function buildLaLigaRecords(data: LaLigaSeasonData): LaLigaRecord[] {
  const { standings, matches, seasonLabel } = data;
  const rows = standings.rows;
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
  const gap =
    rows.length >= 2 ? rows[0]!.points - rows[1]!.points : null;
  const avgGoals =
    finished.length > 0 ? Math.round((goals / finished.length) * 100) / 100 : null;

  return [
    record({
      id: "most-points-season",
      name: "Most Points in a Season",
      emoji: "📈",
      description:
        "Highest points total by one club in a single La Liga campaign — the modern title haul benchmark.",
      allTime: {
        value: "100 pts",
        holder: "Real Madrid",
        teamCode: "RMA",
        context: "2011/12",
      },
      season: leader
        ? {
            value: `${leader.points} pts`,
            holder: leader.team.shortName ?? leader.team.name,
            teamCode: leader.team.code,
            context: `${seasonLabel} · MD ${standings.matchday}`,
          }
        : { value: "—", holder: "Season not started", context: seasonLabel },
      highlightSeason:
        leader && leader.points >= 100
          ? "all-time"
          : leader && leader.points > 0
            ? "leading"
            : null,
      commentary: `Real Madrid's 100-point season in 2011/12 remains the gold standard. ${
        leader && leader.points > 0
          ? `${leader.team.name} lead ${seasonLabel} on ${leader.points} after ${leader.played} match${leader.played === 1 ? "" : "es"}.`
          : "The points race opens with Matchday 1."
      } Commentators watch every dropped point as title maths.`,
    }),

    record({
      id: "most-goals-club-season",
      name: "Most Goals by a Club",
      emoji: "⚽",
      description:
        "Most league goals scored by one side in a single season — attacking fireworks measured over 38 games.",
      allTime: {
        value: "121 goals",
        holder: "Real Madrid",
        teamCode: "RMA",
        context: "2011/12",
      },
      season: goalsLeader
        ? {
            value: `${goalsLeader.goalsFor} goals`,
            holder: goalsLeader.team.shortName ?? goalsLeader.team.name,
            teamCode: goalsLeader.team.code,
            context: `${seasonLabel} attack`,
          }
        : { value: "—", holder: "No goals yet", context: seasonLabel },
      highlightSeason:
        goalsLeader && goalsLeader.goalsFor >= 121
          ? "all-time"
          : goalsLeader && goalsLeader.goalsFor > 0
            ? "leading"
            : null,
      commentary: `Madrid's 121 in 2011/12 still defines peak La Liga firepower. ${
        goalsLeader && goalsLeader.goalsFor > 0
          ? `${goalsLeader.team.name} lead the ${seasonLabel} scoring charts with ${goalsLeader.goalsFor}.`
          : "Club goal tallies start climbing from the opening whistle."
      }`,
    }),

    record({
      id: "most-wins-season",
      name: "Most Wins in a Season",
      emoji: "🥇",
      description:
        "Most league victories by one club across a 38-matchday campaign.",
      allTime: {
        value: "32 wins",
        holder: "Real Madrid",
        teamCode: "RMA",
        context: "2011/12",
      },
      season: winsLeader
        ? {
            value: `${winsLeader.won} win${winsLeader.won === 1 ? "" : "s"}`,
            holder: winsLeader.team.shortName ?? winsLeader.team.name,
            teamCode: winsLeader.team.code,
            context: `${seasonLabel} season`,
          }
        : { value: "—", holder: "No wins yet", context: seasonLabel },
      highlightSeason:
        winsLeader && winsLeader.won >= 32
          ? "all-time"
          : winsLeader && winsLeader.won > 0
            ? "leading"
            : null,
      commentary: `Thirty-two wins in 2011/12 is still the single-season bar. ${
        winsLeader && winsLeader.won > 0
          ? `${winsLeader.team.name} sit on ${winsLeader.won} for ${seasonLabel}.`
          : "First three points of the season open this chart."
      }`,
    }),

    record({
      id: "win-streak",
      name: "Longest Win Streak",
      emoji: "🔥",
      description:
        "Longest run of consecutive league wins in the season — pure momentum.",
      allTime: {
        value: "18 in a row",
        holder: "Barcelona",
        teamCode: "FCB",
        context: "2010/11",
      },
      season: streak
        ? {
            value: `${streak.length} in a row`,
            holder: streak.team,
            teamCode: streak.teamCode,
            context: `${seasonLabel} best streak`,
          }
        : { value: "—", holder: "No streak yet", context: seasonLabel },
      highlightSeason:
        streak && streak.length >= 18
          ? "all-time"
          : streak && streak.length >= 2
            ? "leading"
            : null,
      commentary: `Barcelona's eighteen-game streak in 2010/11 still defines La Liga momentum. ${
        streak
          ? `${streak.team}'s ${streak.length}-win run is ${seasonLabel}'s longest so far.`
          : "No multi-win streak yet this season."
      }`,
    }),

    record({
      id: "biggest-win",
      name: "Biggest Win",
      emoji: "💥",
      description:
        "Largest winning margin in a single La Liga match — scoreline chaos.",
      allTime: {
        value: "12–1",
        holder: "Athletic Club",
        teamCode: "ATH",
        context: "vs Barcelona, 1931",
      },
      season: bigWin
        ? {
            value: `${bigWin.margin}-goal margin`,
            holder: bigWin.winner,
            teamCode: bigWin.winnerCode,
            context: `${bigWin.scoreline} · ${seasonLabel}`,
          }
        : { value: "—", holder: "No results yet", context: seasonLabel },
      highlightSeason: bigWin && bigWin.margin >= 8 ? "leading" : bigWin ? "leading" : null,
      commentary: `Athletic's 12–1 in 1931 remains folklore. ${
        bigWin
          ? `${bigWin.winner}'s ${bigWin.scoreline} is ${seasonLabel}'s heaviest win so far.`
          : "The first thrashing of the season will claim this card."
      }`,
    }),

    record({
      id: "highest-scoring-match",
      name: "Highest-Scoring Match",
      emoji: "🎯",
      description:
        "Most combined goals in one league fixture — open, chaotic afternoons.",
      allTime: {
        value: "14 goals",
        holder: "Athletic 12–1 Barcelona",
        teamCode: "ATH",
        context: "1930/31",
      },
      season: high
        ? {
            value: `${high.goals} goals`,
            holder: `${high.match.homeTeam.shortName ?? high.match.homeTeam.name} ${high.match.homeScore}–${high.match.awayScore} ${high.match.awayTeam.shortName ?? high.match.awayTeam.name}`,
            teamCode: high.match.homeTeam.code,
            context: seasonLabel,
          }
        : { value: "—", holder: "No goals yet", context: seasonLabel },
      highlightSeason: high && high.goals >= 8 ? "leading" : high ? "leading" : null,
      commentary: `Fourteen goals in that 1931 classic still sits atop the chart. ${
        high
          ? `${seasonLabel}'s wildest so far finished ${high.match.homeScore}–${high.match.awayScore}.`
          : "Waiting on the first goal-fest of the campaign."
      }`,
    }),

    record({
      id: "fewest-goals-conceded",
      name: "Best Defence",
      emoji: "🛡️",
      description:
        "Fewest goals conceded by a club this season — the Zamora-era defensive standard.",
      allTime: {
        value: "18 conceded",
        holder: "Deportivo",
        context: "1993/94 (38 games)",
      },
      season: cleanest
        ? {
            value: `${cleanest.goalsAgainst} conceded`,
            holder: cleanest.team.shortName ?? cleanest.team.name,
            teamCode: cleanest.team.code,
            context: `${seasonLabel} · ${cleanest.played} played`,
          }
        : { value: "—", holder: "Season not started", context: seasonLabel },
      highlightSeason:
        cleanest && cleanest.played > 0
          ? cleanest.goalsAgainst === 0
            ? "leading"
            : "leading"
          : null,
      commentary: `Deportivo's 18-conceded season is the modern defensive mountain. ${
        cleanest && cleanest.played > 0
          ? `${cleanest.team.name} have let in ${cleanest.goalsAgainst} in ${seasonLabel}.`
          : "Clean sheets start writing this story from Matchday 1."
      }`,
    }),

    record({
      id: "title-gap",
      name: "Closest Title Fight",
      emoji: "⚔️",
      description:
        "Smallest points gap between the leaders and second — drama measured in points.",
      allTime: {
        value: "0 pts*",
        holder: "Real Madrid / Barcelona",
        context: "Several photo finishes (*GD decided)",
      },
      season:
        gap !== null && leader && rows[1]
          ? {
              value: `${gap} pt${gap === 1 ? "" : "s"}`,
              holder: `${leader.team.shortName ?? leader.team.name} vs ${rows[1].team.shortName ?? rows[1].team.name}`,
              teamCode: leader.team.code,
              context: `${seasonLabel} live gap`,
            }
          : { value: "—", holder: "Need two clubs", context: seasonLabel },
      highlightSeason: gap !== null && gap <= 6 ? "leading" : gap !== null ? "leading" : null,
      commentary: `La Liga title races have often been decided on goal difference. ${
        gap !== null && leader && rows[1]
          ? `Right now ${leader.team.name} lead ${rows[1].team.name} by ${gap} — ${gap <= 6 ? "one weekend can flip it." : "still a live chase if form shifts."}`
          : "The gap chart fills once two clubs are on the board."
      }`,
    }),

    record({
      id: "different-winners",
      name: "Different Match Winners",
      emoji: "🎲",
      description:
        "How many different clubs have won a league match this season — a measure of how open the field is.",
      allTime: {
        value: "20 clubs",
        holder: "Typical full season",
        context: "Every side usually tastes victory",
      },
      season: {
        value:
          winners.count === 0
            ? "0"
            : `${winners.count} club${winners.count === 1 ? "" : "s"}`,
        holder:
          winners.count > 0
            ? winners.names.slice(0, 4).join(", ") + (winners.count > 4 ? "…" : "")
            : "None yet",
        context: `${seasonLabel} · ${finished.length} results`,
      },
      highlightSeason: winners.count > 0 ? "leading" : null,
      commentary: `Most seasons see nearly every club claim at least one win. ${
        winners.count > 0
          ? `${seasonLabel} has ${winners.count} different winners from ${finished.length} finished match${finished.length === 1 ? "" : "es"}.`
          : "The winners' club opens with the first full-time whistle."
      }`,
    }),

    record({
      id: "goals-per-game",
      name: "Goals per Game",
      emoji: "📊",
      description:
        "Average goals per finished match this season — the pulse of how open the league is.",
      allTime: {
        value: "3.39 GPG",
        holder: "1950/51 season",
        context: "Most prolific modern-era average",
      },
      season: {
        value: avgGoals !== null ? `${avgGoals} GPG` : "—",
        holder:
          finished.length > 0
            ? `${goals} goals · ${finished.length} matches`
            : "No matches yet",
        context: seasonLabel,
      },
      highlightSeason: avgGoals !== null && avgGoals >= 3 ? "leading" : avgGoals !== null ? "leading" : null,
      commentary: `Early-1950s La Liga remains the high-scoring benchmark. ${
        avgGoals !== null
          ? `${seasonLabel} is averaging ${avgGoals} goals per game across ${finished.length} results.`
          : "The goals-per-game chart fills after Matchday 1."
      }`,
    }),
  ];
}
