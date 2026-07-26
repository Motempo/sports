import { capForecast } from "@/lib/match-forecast";
import type { F1GrandPrix, F1SeasonData, F1StandingRow } from "@/lib/f1-types";

export const F1_RECORD_COMMENTARY_MAX_CHARS = 300;

export interface F1RecordMark {
  value: string;
  holder: string;
  constructorId?: string;
  context?: string;
}

export interface F1Record {
  id: string;
  name: string;
  emoji: string;
  description: string;
  allTime: F1RecordMark;
  season: F1RecordMark;
  /** Season mark leads this edition or threatens an all-time mark. */
  highlightSeason: "leading" | "all-time" | null;
  commentary: string;
}

function record(
  partial: Omit<F1Record, "commentary"> & { commentary: string }
): F1Record {
  return {
    ...partial,
    commentary: capForecast(partial.commentary, F1_RECORD_COMMENTARY_MAX_CHARS),
  };
}

function completedRaces(calendar: F1GrandPrix[]): F1GrandPrix[] {
  return calendar.filter((gp) => gp.status === "completed" && gp.winner);
}

function longestWinStreak(calendar: F1GrandPrix[]): {
  driver: string;
  length: number;
} | null {
  const races = completedRaces(calendar);
  if (races.length === 0) return null;

  let bestDriver = races[0]!.winner!;
  let bestLen = 1;
  let curDriver = races[0]!.winner!;
  let curLen = 1;

  for (let i = 1; i < races.length; i++) {
    const winner = races[i]!.winner!;
    if (winner === curDriver) {
      curLen += 1;
    } else {
      curDriver = winner;
      curLen = 1;
    }
    if (curLen > bestLen) {
      bestLen = curLen;
      bestDriver = curDriver;
    }
  }

  return { driver: bestDriver, length: bestLen };
}

function uniqueWinners(calendar: F1GrandPrix[]): number {
  return new Set(completedRaces(calendar).map((gp) => gp.winner).filter(Boolean)).size;
}

function findDriver(
  standings: F1StandingRow[],
  name: string
): F1StandingRow | undefined {
  return standings.find(
    (d) => d.driverName === name || d.driverCode === name || d.driverName.includes(name)
  );
}

export function buildF1Records(data: F1SeasonData): F1Record[] {
  const seasonLabel = String(data.season);
  const drivers = data.driverStandings;
  const constructors = data.constructorStandings;
  const leader = drivers[0];
  const winsLeader = [...drivers].sort((a, b) => b.wins - a.wins || b.points - a.points)[0];
  const constructorLeader = constructors[0];
  const constructorWinsLeader = [...constructors].sort(
    (a, b) => b.wins - a.wins || b.points - a.points
  )[0];
  const streak = longestWinStreak(data.calendar);
  const winnersCount = uniqueWinners(data.calendar);
  const racesDone = data.calendar.filter((gp) => gp.status === "completed").length;
  const gap =
    drivers.length >= 2 ? Math.round((drivers[0]!.points - drivers[1]!.points) * 10) / 10 : null;
  const streakDriver = streak ? findDriver(drivers, streak.driver) : undefined;

  return [
    record({
      id: "most-wins-season",
      name: "Most Wins in a Season",
      emoji: "🥇",
      description:
        "Most Grand Prix victories by one driver in a single championship season.",
      allTime: {
        value: "13 wins",
        holder: "Michael Schumacher / Sebastian Vettel",
        context: "2004 · 2013",
      },
      season: winsLeader
        ? {
            value: `${winsLeader.wins} win${winsLeader.wins === 1 ? "" : "s"}`,
            holder: winsLeader.driverName,
            constructorId: winsLeader.constructorId,
            context: `${seasonLabel} season`,
          }
        : { value: "—", holder: "No races yet", context: seasonLabel },
      highlightSeason: winsLeader && winsLeader.wins >= 10 ? "leading" : winsLeader && winsLeader.wins > 0 ? "leading" : null,
      commentary: `Schumacher (2004) and Vettel (2013) share the single-season wins record at thirteen. ${
        winsLeader && winsLeader.wins > 0
          ? `${winsLeader.driverName} leads ${seasonLabel} with ${winsLeader.wins} — every Sunday victory keeps that mark in the conversation.`
          : `No ${seasonLabel} wins on the board yet.`
      } Commentators always ask: is this dominance, or a short purple patch?`,
    }),

    record({
      id: "most-points-season",
      name: "Most Points in a Season",
      emoji: "📈",
      description:
        "Highest points total by a driver in one championship year under modern scoring.",
      allTime: {
        value: "575 pts",
        holder: "Max Verstappen",
        context: "2023",
      },
      season: leader
        ? {
            value: `${leader.points} pts`,
            holder: leader.driverName,
            constructorId: leader.constructorId,
            context: `${seasonLabel} live total`,
          }
        : { value: "—", holder: "Season not started", context: seasonLabel },
      highlightSeason: leader && leader.points >= 400 ? "leading" : leader ? "leading" : null,
      commentary: `Verstappen's 575 in 2023 is the modern-era Everest. ${
        leader
          ? `${leader.driverName} sits on ${leader.points} after ${racesDone} race${racesDone === 1 ? "" : "s"} — the running total every studio chart tracks.`
          : "Points tallies start climbing from round one."
      } Sprint weekends and bonus points can still reshape the final number.`,
    }),

    record({
      id: "most-constructor-wins-season",
      name: "Most Team Wins in a Season",
      emoji: "🏎️",
      description:
        "Most race victories by a constructor in a single season — either car counting.",
      allTime: {
        value: "19 wins",
        holder: "Mercedes",
        constructorId: "mercedes",
        context: "2016",
      },
      season: constructorWinsLeader
        ? {
            value: `${constructorWinsLeader.wins} win${constructorWinsLeader.wins === 1 ? "" : "s"}`,
            holder: constructorWinsLeader.constructorName,
            constructorId: constructorWinsLeader.constructorId,
            context: `${seasonLabel} season`,
          }
        : { value: "—", holder: "No wins yet", context: seasonLabel },
      highlightSeason:
        constructorWinsLeader && constructorWinsLeader.wins > 0 ? "leading" : null,
      commentary: `Mercedes' nineteen wins in 2016 still define constructor dominance. ${
        constructorWinsLeader && constructorWinsLeader.wins > 0
          ? `${constructorWinsLeader.constructorName} leads ${seasonLabel} with ${constructorWinsLeader.wins} race win${constructorWinsLeader.wins === 1 ? "" : "s"}.`
          : `No constructor has taken a ${seasonLabel} win yet.`
      } Two competitive cars turn good weekends into championship landslides.`,
    }),

    record({
      id: "constructor-points-season",
      name: "Most Constructor Points",
      emoji: "🏁",
      description:
        "Highest points haul by a team in one season — the benchmark for factory dominance.",
      allTime: {
        value: "765 pts",
        holder: "Mercedes",
        constructorId: "mercedes",
        context: "2016",
      },
      season: constructorLeader
        ? {
            value: `${constructorLeader.points} pts`,
            holder: constructorLeader.constructorName,
            constructorId: constructorLeader.constructorId,
            context: `${seasonLabel} live total`,
          }
        : { value: "—", holder: "Season not started", context: seasonLabel },
      highlightSeason: constructorLeader ? "leading" : null,
      commentary: `Mercedes' 765 in 2016 remains the constructors' points mountain. ${
        constructorLeader
          ? `${constructorLeader.constructorName} leads ${seasonLabel} on ${constructorLeader.points}.`
          : "Constructor tallies build every double-points finish."
      } Commentators watch the gap to P2 as closely as the drivers' title.`,
    }),

    record({
      id: "career-wins",
      name: "All-Time Race Wins",
      emoji: "👑",
      description:
        "Most Grand Prix victories by one driver across their career — the all-time wins chart.",
      allTime: {
        value: "105 wins",
        holder: "Lewis Hamilton",
        context: "2007–present",
      },
      season: {
        value: "105 wins",
        holder: "Lewis Hamilton",
        context: "Record still stands",
      },
      highlightSeason: null,
      commentary: `Hamilton's 105 victories are the number every modern ace is measured against — Schumacher's 91 sat for years before being overhauled. No one in ${seasonLabel} is threatening the all-time mark yet, but a deep title run keeps the conversation alive. Studio panels always ask: who gets there next?`,
    }),

    record({
      id: "win-streak",
      name: "Consecutive Race Wins",
      emoji: "🔥",
      description:
        "Longest streak of back-to-back Grand Prix victories in a season — pure momentum.",
      allTime: {
        value: "10 in a row",
        holder: "Max Verstappen",
        context: "2023",
      },
      season: streak
        ? {
            value: `${streak.length} in a row`,
            holder: streak.driver,
            constructorId: streakDriver?.constructorId,
            context: `${seasonLabel} best streak`,
          }
        : { value: "—", holder: "No streak yet", context: seasonLabel },
      highlightSeason: streak && streak.length >= 3 ? "leading" : streak ? "leading" : null,
      commentary: `Verstappen's ten-win streak in 2023 rewrote the modern consecutive-wins chart. ${
        streak
          ? `${streak.driver}'s ${streak.length}-race run is ${seasonLabel}'s longest streak so far.`
          : "No multi-race streak yet this season."
      } When a driver strings Sundays together, every rival starts talking about stopping the run.`,
    }),

    record({
      id: "title-gap",
      name: "Closest Title Fight",
      emoji: "⚔️",
      description:
        "Smallest points gap between championship leader and challenger — drama measured in decimals.",
      allTime: {
        value: "0.5 pts",
        holder: "Lauda vs Prost",
        context: "1984 finale",
      },
      season:
        gap !== null && leader && drivers[1]
          ? {
              value: `${gap} pt${gap === 1 ? "" : "s"}`,
              holder: `${leader.driverName.split(" ").pop()} vs ${drivers[1].driverName.split(" ").pop()}`,
              constructorId: leader.constructorId,
              context: `${seasonLabel} live gap`,
            }
          : { value: "—", holder: "Need two scorers", context: seasonLabel },
      highlightSeason: gap !== null && gap <= 25 ? "leading" : gap !== null ? "leading" : null,
      commentary: `Lauda beat Prost by half a point in 1984 — the closest title finish in F1 history. ${
        gap !== null && leader && drivers[1]
          ? `Right now ${leader.driverName} leads ${drivers[1].driverName} by ${gap} — ${gap <= 25 ? "one race weekend can flip it." : "still a live fight if the challenger finds form."}`
          : "The gap chart fills once two drivers are on the board."
      } Commentators live for nights when the title comes down to the final corners.`,
    }),

    record({
      id: "different-winners",
      name: "Different Race Winners",
      emoji: "🎲",
      description:
        "How many different drivers have won a Grand Prix this season — a measure of how open the field is.",
      allTime: {
        value: "11 winners",
        holder: "2012 season",
        context: "Most in a single season",
      },
      season: {
        value: winnersCount === 0 ? "0" : `${winnersCount} winner${winnersCount === 1 ? "" : "s"}`,
        holder:
          winnersCount > 0
            ? completedRaces(data.calendar)
                .map((gp) => gp.winner)
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .slice(0, 4)
                .join(", ") + (winnersCount > 4 ? "…" : "")
            : "None yet",
        context: `${seasonLabel} · ${racesDone} races`,
      },
      highlightSeason: winnersCount > 0 ? "leading" : null,
      commentary: `2012's eleven different winners remains the gold standard for an open season. ${
        winnersCount > 0
          ? `${seasonLabel} has ${winnersCount} so far from ${racesDone} completed races — ${winnersCount >= 5 ? "proper variety." : "still room for more names on the winners' list."}`
          : "The winners' club opens at the first chequered flag."
      } Pundits love a season where Sundays aren't a one-team show.`,
    }),

    record({
      id: "youngest-winner",
      name: "Youngest Race Winner",
      emoji: "🌱",
      description:
        "Youngest driver to win a Formula 1 Grand Prix — teenage breakthrough moments.",
      allTime: {
        value: "18y 228d",
        holder: "Max Verstappen",
        context: "Spanish GP, 2016",
      },
      season: {
        value: "18y 228d",
        holder: "Max Verstappen",
        context: "Record still stands",
      },
      highlightSeason: null,
      commentary: `Verstappen's Spanish GP win at eighteen remains the youngest victory in F1 history — every teenage podium still gets the comparison. ${seasonLabel}'s winners will be measured against that fearlessness. Commentators frame it as no memory of past failures — just pure attack.`,
    }),

    record({
      id: "races-in-season",
      name: "Races in a Season",
      emoji: "🗓️",
      description:
        "Number of Grands Prix on the championship calendar — the modern era keeps expanding.",
      allTime: {
        value: "24 races",
        holder: "2024 season",
        context: "Longest F1 calendar",
      },
      season: {
        value: `${data.calendar.length} races`,
        holder: `${racesDone} completed`,
        context: `${seasonLabel} calendar`,
      },
      highlightSeason: data.calendar.length >= 22 ? "leading" : null,
      commentary: `Twenty-four rounds in 2024 set the calendar length bar. ${seasonLabel} is scheduled for ${data.calendar.length} with ${racesDone} already done — every extra flyaway weekend tests cars, crews, and title maths. Commentators track fatigue as carefully as points.`,
    }),
  ];
}
