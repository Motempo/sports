import type { MatchInfo } from "@/lib/types";
import { capForecast } from "@/lib/match-forecast";
import type { TournamentGoalStats } from "@/lib/tournament-goal-stats";

export const RECORD_COMMENTARY_MAX_CHARS = 300;

export interface RecordMark {
  value: string;
  holder: string;
  teamCode?: string;
  context?: string;
}

export interface WorldCupRecord {
  id: string;
  name: string;
  emoji: string;
  description: string;
  allTime: RecordMark;
  tournament2026: RecordMark;
  /** 2026 mark leads this edition or set a new World Cup all-time mark. */
  highlight2026: "leading" | "all-time" | null;
  commentary: string;
}

function formatTime(minute: number, second = 0, addedMinute?: number): string {
  if (addedMinute && addedMinute > 0) {
    return `${minute}+${addedMinute}'`;
  }
  if (minute === 0) return `${second}s`;
  return second > 0 ? `${minute}' ${second}s` : `${minute}'`;
}

function formatAge(years: number, days = 0): string {
  return days > 0 ? `${years}y ${days}d` : `${years} years`;
}

function formatSpan(minutes: number, seconds = 0): string {
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`;
}

function matchGoals(m: MatchInfo): number | null {
  if (m.homeScore === null || m.awayScore === null) return null;
  return m.homeScore + m.awayScore;
}

function matchMargin(m: MatchInfo): number | null {
  if (m.homeScore === null || m.awayScore === null) return null;
  return Math.abs(m.homeScore - m.awayScore);
}

function finishedMatches(matches: MatchInfo[]): MatchInfo[] {
  return matches.filter(
    (m) => m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null
  );
}

function highestScoringMatch(matches: MatchInfo[]): { match: MatchInfo; goals: number } | null {
  let best: { match: MatchInfo; goals: number } | null = null;
  for (const m of finishedMatches(matches)) {
    const goals = matchGoals(m)!;
    if (!best || goals > best.goals) best = { match: m, goals };
  }
  return best;
}

function biggestWin(matches: MatchInfo[]): {
  match: MatchInfo;
  margin: number;
  winner: string;
  scoreline: string;
} | null {
  let best: ReturnType<typeof biggestWin> = null;
  for (const m of finishedMatches(matches)) {
    const margin = matchMargin(m)!;
    if (margin === 0) continue;
    const homeWins = m.homeScore! > m.awayScore!;
    const winner = homeWins ? m.homeTeam.name : m.awayTeam.name;
    const scoreline = `${m.homeScore}–${m.awayScore}`;
    if (!best || margin > best.margin) {
      best = { match: m, margin, winner, scoreline };
    }
  }
  return best;
}

function record(
  partial: Omit<WorldCupRecord, "commentary"> & { commentary: string }
): WorldCupRecord {
  return {
    ...partial,
    commentary: capForecast(partial.commentary, RECORD_COMMENTARY_MAX_CHARS),
  };
}

export function buildWorldCupRecords(
  allMatches: MatchInfo[],
  goalStats: TournamentGoalStats
): WorldCupRecord[] {
  const finished = finishedMatches(allMatches);
  const goalsTotal = goalStats.totalGoals || finished.reduce((sum, m) => sum + matchGoals(m)!, 0);
  const highScoring = highestScoringMatch(allMatches);
  const bigWin = biggestWin(allMatches);
  const hatTrickCount = goalStats.hatTricks.length;
  const leader = goalStats.scorers[0];

  const fastestGoal2026 = goalStats.fastestGoal
    ? {
        value: formatTime(goalStats.fastestGoal.minute),
        holder: goalStats.fastestGoal.playerName,
        teamCode: goalStats.fastestGoal.teamCode,
        context: `${goalStats.fastestGoal.matchLabel} vs ${goalStats.fastestGoal.opponentName}`,
      }
    : { value: "—", holder: "Not yet scored", context: "WC 2026" };

  const fastestHt2026 = goalStats.fastestHatTrick
    ? {
        value: formatSpan(goalStats.fastestHatTrick.spanMinutes),
        holder: goalStats.fastestHatTrick.playerName,
        teamCode: goalStats.fastestHatTrick.teamCode,
        context: goalStats.fastestHatTrick.matchLabel,
      }
    : { value: "—", holder: "No hat-trick yet", context: "WC 2026" };

  const sukurSeconds = 11;
  const fastest2026Seconds =
    goalStats.fastestGoal?.minute === 0 ? 0 : (goalStats.fastestGoal?.minute ?? 999) * 60;

  return [
    record({
      id: "fastest-goal",
      name: "Fastest Goal",
      emoji: "⚡",
      description:
        "Quickest goal from kick-off in a World Cup match — every second counts on the highlight reels.",
      allTime: {
        value: "11 seconds",
        holder: "Hakan Şükür",
        teamCode: "TUR",
        context: "Turkey vs Scotland, 2002",
      },
      tournament2026: fastestGoal2026,
      highlight2026:
        fastest2026Seconds < sukurSeconds
          ? "all-time"
          : goalStats.fastestGoal && goalStats.fastestGoal.minute <= 1
            ? "leading"
            : goalStats.fastestGoal
              ? "leading"
              : null,
      commentary: `Commentators love an early bolt from the blue — Şükür's 11-second strike in 2002 still sets the all-time bar. ${
        goalStats.fastestGoal
          ? `${goalStats.fastestGoal.playerName}'s ${fastestGoal2026.value} effort is the pace-setter in 2026 so far; one direct attack off kick-off can rewrite the record books.`
          : "No 2026 entry yet — the first-minute gamble is always a talking point when teams start fast."
      } Expect managers to mention set-piece routines and kick-off traps whenever a forward breaks clear inside 60 seconds.`,
    }),

    record({
      id: "fastest-hat-trick",
      name: "Fastest Hat-trick",
      emoji: "🎩",
      description:
        "Shortest elapsed time between a player's first and third goal in one World Cup match.",
      allTime: {
        value: "7 minutes",
        holder: "László Kiss",
        teamCode: "HUN",
        context: "Hungary vs El Salvador, 1982",
      },
      tournament2026: fastestHt2026,
      highlight2026: goalStats.fastestHatTrick ? "leading" : null,
      commentary: `A hat-trick inside a single half is rare; doing it in minutes is legendary — Kiss netted three in seven against El Salvador in 1982. ${
        goalStats.fastestHatTrick
          ? `${goalStats.fastestHatTrick.playerName}'s ${fastestHt2026.value} treble is the 2026 benchmark commentators keep replaying.`
          : "No 2026 hat-trick speed mark yet — strikers in form are one hot spell away."
      } When it happens, co-commentators always ask: was it instinct, fatigue in the defence, or pure confidence?`,
    }),

    record({
      id: "hat-tricks-tournament",
      name: "Hat-tricks This Tournament",
      emoji: "🔥",
      description:
        "Total individual hat-tricks scored across the 2026 World Cup — a sign of open, attacking football.",
      allTime: {
        value: "8 hat-tricks",
        holder: "1954 World Cup",
        context: "Most in a single edition",
      },
      tournament2026: {
        value:
          hatTrickCount === 0 ? "0" : `${hatTrickCount} hat-trick${hatTrickCount === 1 ? "" : "s"}`,
        holder:
          hatTrickCount > 0
            ? goalStats.hatTricks.map((h) => h.playerName).join(", ")
            : "None yet",
        context:
          hatTrickCount > 0
            ? goalStats.hatTricks.map((h) => h.matchLabel).join(" · ")
            : "WC 2026",
      },
      highlight2026: hatTrickCount > 0 ? "leading" : null,
      commentary: `Pundits track hat-trick tallies like a fever chart for attacking quality — the 1954 tournament in Switzerland still holds the record for the most trebles in one edition. ${
        hatTrickCount > 0
          ? `2026 already has ${hatTrickCount} — ${goalStats.hatTricks.map((h) => h.playerName).join(" and ")} have delivered the kind of nights fans travel for.`
          : "None so far in 2026, but knockout football often unlocks space for a striker on a roll."
      } Every treble reshuffles the Golden Boot conversation and the post-match studio panel.`,
    }),

    record({
      id: "highest-scoring-match",
      name: "Highest-Scoring Match",
      emoji: "🥅",
      description:
        "Most combined goals in a single World Cup match — chaos that defines a tournament's story.",
      allTime: {
        value: "12 goals",
        holder: "Austria 7–5 Switzerland",
        teamCode: "AUT",
        context: "Quarter-final, 1954",
      },
      tournament2026: highScoring
        ? {
            value: `${highScoring.goals} goals`,
            holder: `${highScoring.match.homeTeam.name} ${highScoring.match.homeScore}–${highScoring.match.awayScore} ${highScoring.match.awayTeam.name}`,
            context:
              highScoring.match.stage === "GROUP" ? "Group stage" : highScoring.match.round,
          }
        : { value: "—", holder: "No finished matches", context: "WC 2026" },
      highlight2026: highScoring ? "leading" : null,
      commentary: `The 7–5 quarter-final in 1954 remains the gold standard for goal-glut drama — twelve goals, no keeper safe. ${
        highScoring
          ? `In 2026, ${highScoring.match.homeTeam.name} vs ${highScoring.match.awayTeam.name} (${highScoring.goals} goals) is the match analysts keep citing when debating defensive organisation.`
          : "2026's highest-scoring game is still TBD — but group-stage openers often set an early tone."
      } When the tally climbs past five, expect every co-commentator to invoke 'classic World Cup madness'.`,
    }),

    record({
      id: "biggest-win",
      name: "Biggest Win",
      emoji: "📈",
      description:
        "Largest victory margin in a single match — the scoreline that makes global headlines.",
      allTime: {
        value: "9-goal margin",
        holder: "Hungary 10–1 El Salvador",
        teamCode: "HUN",
        context: "Group stage, 1982",
      },
      tournament2026: bigWin
        ? {
            value: `${bigWin.margin}-goal margin`,
            holder: `${bigWin.winner} (${bigWin.scoreline})`,
            teamCode: bigWin.match.winnerCode ?? bigWin.match.homeTeam.code,
            context: bigWin.match.stage === "GROUP" ? "Group stage" : bigWin.match.round,
          }
        : { value: "—", holder: "No decisive results yet", context: "WC 2026" },
      highlight2026: bigWin ? "leading" : null,
      commentary: `Hungary's 10–1 demolition of El Salvador in 1982 is the margin every lopsided result gets compared to. ${
        bigWin
          ? `${bigWin.winner}'s ${bigWin.scoreline} win is 2026's widest gap so far — analysts debate whether it reflects quality or a mismatch.`
          : "No blowout yet in 2026; the knockouts tend to tighten margins even when group games explode."
      } Commentators always balance praise for the winners with sympathy for a squad chasing shadows.`,
    }),

    record({
      id: "most-goals-tournament",
      name: "Goals Scored (Edition)",
      emoji: "⚽",
      description:
        "Total goals across the tournament — pace compared with the most prolific World Cups ever.",
      allTime: {
        value: "171 goals",
        holder: "1998 & 2018",
        context: "Most in a 32-team World Cup",
      },
      tournament2026: {
        value: `${goalsTotal} goals`,
        holder: `${goalStats.finishedMatches || finished.length} matches played`,
        context: "WC 2026 running total",
      },
      highlight2026: goalsTotal > 0 ? "leading" : null,
      commentary: `Goal-per-game rate is the stat studio panels chart every night — France '98 and Russia 2018 hit 171 in the 32-team era. ${
        goalsTotal > 0
          ? `2026 sits on ${goalsTotal} from ${goalStats.finishedMatches || finished.length} completed matches; the expanded 48-team format could push the final tally into uncharted territory.`
          : "The scoreboard is just warming up — early group games often spike the average before tactics tighten in the knockouts."
      } Every free-kick and penalty adds another line on the running graph commentators love.`,
    }),

    record({
      id: "youngest-scorer",
      name: "Youngest Goalscorer",
      emoji: "🌱",
      description: "Youngest player to score at a World Cup — teenage breakthrough moments.",
      allTime: {
        value: "17y 239d",
        holder: "Pelé",
        teamCode: "BRA",
        context: "Brazil vs Wales, 1958",
      },
      tournament2026: goalStats.youngestScorer
        ? {
            value: formatAge(
              goalStats.youngestScorer.ageYears,
              goalStats.youngestScorer.ageDays
            ),
            holder: goalStats.youngestScorer.playerName,
            teamCode: goalStats.youngestScorer.teamCode,
            context: "WC 2026 · verified birthdays only",
          }
        : { value: "—", holder: "Birthday data pending", context: "WC 2026" },
      highlight2026:
        goalStats.youngestScorer && goalStats.youngestScorer.ageYears < 18 ? "leading" : null,
      commentary: `Pelé's 1958 strike at seventeen made youth the romance of the World Cup — every teenager who scores inherits the comparison. ${
        goalStats.youngestScorer
          ? `${goalStats.youngestScorer.playerName} at ${formatAge(goalStats.youngestScorer.ageYears, goalStats.youngestScorer.ageDays)} is 2026's youngest known marksman on the board.`
          : "No verified 2026 age entry yet — we list youngest scorers only when birthdays are confirmed."
      } Commentators frame it as fearlessness: no memory of past failures, just pure instinct in the box.`,
    }),

    record({
      id: "oldest-scorer",
      name: "Oldest Goalscorer",
      emoji: "🕰️",
      description:
        "Oldest player to score at a World Cup — experience finishing on the biggest stage.",
      allTime: {
        value: "42 years",
        holder: "Roger Milla",
        teamCode: "CMR",
        context: "Cameroon vs Russia, 1994",
      },
      tournament2026: goalStats.oldestScorer
        ? {
            value: formatAge(goalStats.oldestScorer.ageYears, goalStats.oldestScorer.ageDays),
            holder: goalStats.oldestScorer.playerName,
            teamCode: goalStats.oldestScorer.teamCode,
            context: "WC 2026 · verified birthdays only",
          }
        : { value: "—", holder: "Birthday data pending", context: "WC 2026" },
      highlight2026:
        goalStats.oldestScorer && goalStats.oldestScorer.ageYears >= 38 ? "leading" : null,
      commentary: `Roger Milla's corner-flag shuffle at forty-two is the template for every veteran goal celebration. ${
        goalStats.oldestScorer
          ? `${goalStats.oldestScorer.playerName} at ${formatAge(goalStats.oldestScorer.ageYears, goalStats.oldestScorer.ageDays)} leads the 2026 age chart among scorers with verified birthdays.`
          : "No verified 2026 age entry yet — experienced forwards in the knockouts often supply the story."
      } Pundits love the narrative: legs may slow, but composure in the six-yard box rarely ages.`,
    }),

    record({
      id: "latest-winning-goal",
      name: "Latest Winning Goal",
      emoji: "⏱️",
      description:
        "Winning goal scored latest in regulation or stoppage time — drama that defines knockouts.",
      allTime: {
        value: "120th minute",
        holder: "Mario Götze",
        teamCode: "GER",
        context: "Germany vs Argentina, 2014 final",
      },
      tournament2026: goalStats.latestWinningGoal
        ? {
            value: formatTime(goalStats.latestWinningGoal.minute),
            holder: goalStats.latestWinningGoal.playerName,
            teamCode: goalStats.latestWinningGoal.teamCode,
            context: `${goalStats.latestWinningGoal.matchLabel} vs ${goalStats.latestWinningGoal.opponentName}`,
          }
        : { value: "—", holder: "No winner yet", context: "WC 2026" },
      highlight2026: goalStats.latestWinningGoal ? "leading" : null,
      commentary: `Götze's extra-time winner in Rio is the clock every late goal gets measured against — 120 minutes, one touch, a nation erupting. ${
        goalStats.latestWinningGoal
          ? `${goalStats.latestWinningGoal.playerName}'s ${formatTime(goalStats.latestWinningGoal.minute)} winner is the latest decisive strike of 2026 so far.`
          : "No 2026 entry on the board — the knockouts are where seconds feel like hours."
      } Commentators always replay the seconds before: the tired pass, the set piece, the one run that broke the deadlock.`,
    }),

    record({
      id: "most-goals-career",
      name: "All-Time Goals Record",
      emoji: "👑",
      description:
        "Most World Cup goals by one player across their career — the benchmark every striker chases.",
      allTime: {
        value: "16 goals",
        holder: "Miroslav Klose",
        teamCode: "GER",
        context: "2002–2014",
      },
      tournament2026: {
        value: "16 goals",
        holder: "Miroslav Klose",
        teamCode: "GER",
        context: "Record still stands",
      },
      highlight2026: null,
      commentary: `Klose's sixteen across four tournaments is the number every centre-forward chases — Müller, Ronaldo, and Mbappé have all been measured against it. No one at 2026 has threatened the all-time mark yet, but a deep run with six or seven goals puts a player in the conversation. Studio panels always ask: is the expanded format a chance for a modern striker to finally overhaul the chart?`,
    }),

    record({
      id: "single-tournament-goals",
      name: "Most Goals in One Tournament",
      emoji: "🎯",
      description: "Most goals by a single player in one World Cup edition.",
      allTime: {
        value: "13 goals",
        holder: "Just Fontaine",
        teamCode: "FRA",
        context: "Sweden 1958",
      },
      tournament2026: leader
        ? {
            value: `${leader.goals} goal${leader.goals === 1 ? "" : "s"}`,
            holder: leader.playerName,
            teamCode: leader.teamCode,
            context: "WC 2026 live leader",
          }
        : {
            value: "—",
            holder: "No goals yet",
            context: "WC 2026",
          },
      highlight2026: leader && leader.goals >= 5 ? "leading" : null,
      commentary: `Fontaine's thirteen in 1958 remains the single-tournament Everest — six matches, relentless movement, a record that survived Pelé, Ronaldo, and every generation since. ${
        leader
          ? `${leader.playerName} leads 2026 on ${leader.goals} verified goals — whoever tops the chart by the semi-finals enters pundit territory.`
          : "The 2026 Golden Boot race is just warming up."
      } Commentators invoke Fontaine whenever a striker hits four before the quarter-finals.`,
    }),
  ];
}
