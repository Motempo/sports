import type { MatchInfo, TeamInfo } from "@/lib/types";
import { isPlaceholderTeam } from "@/lib/match-context";

const RIVALRY_PAIRS = new Set([
  "ARG|BRA",
  "BRA|ARG",
  "USA|MEX",
  "MEX|USA",
  "ENG|FRA",
  "FRA|ENG",
  "ENG|GER",
  "GER|ENG",
  "ESP|POR",
  "POR|ESP",
  "JPN|KOR",
  "KOR|JPN",
]);

function pairKey(a: string, b: string): string {
  return `${a}|${b}`;
}

function isLive(status: MatchInfo["status"]): boolean {
  return status === "LIVE" || status === "IN_PLAY" || status === "PAUSED";
}

function rankOf(team: TeamInfo): number | null {
  return team.fifaRank ?? null;
}

function favorite(home: TeamInfo, away: TeamInfo): TeamInfo | null {
  const hr = rankOf(home);
  const ar = rankOf(away);
  if (hr === null || ar === null) return null;
  if (hr === ar) return null;
  return hr < ar ? home : away;
}

function underdog(home: TeamInfo, away: TeamInfo): TeamInfo | null {
  const fav = favorite(home, away);
  if (!fav) return null;
  return fav.code === home.code ? away : home;
}

function pick(seed: number, options: string[]): string {
  return options[Math.abs(seed) % options.length]!;
}

function teamName(team: TeamInfo): string {
  return team.name?.trim() || team.code;
}

function finishedRecap(match: MatchInfo): string {
  const { homeTeam, awayTeam, homeScore, awayScore, winnerCode } = match;
  if (homeScore === null || awayScore === null) {
    return "Full-time — see how the bracket reshapes from here.";
  }

  const margin = Math.abs(homeScore - awayScore);
  const winner = winnerCode
    ? winnerCode === homeTeam.code
      ? homeTeam
      : awayTeam
    : null;
  const winnerLabel = winner ? teamName(winner) : null;

  if (margin === 0) {
    return pick(match.id, [
      "Deadlocked after 90 — extra time and penalties decided it.",
      "Neither side blinked in regulation; a shootout settled the tie.",
    ]);
  }

  if (winner && winnerLabel) {
    if (margin >= 3) {
      return pick(match.id, [
        `${winnerLabel} ran away with it — a statement knockout win.`,
        `Comfortable for ${winnerLabel}; the scoreline flattered the loser.`,
      ]);
    }
    if (margin === 1) {
      return pick(match.id, [
        `${winnerLabel} edged it — one moment of quality made the difference.`,
        `Tight to the end; ${winnerLabel} found the decisive goal.`,
      ]);
    }
    return pick(match.id, [
      `${winnerLabel} advance after a hard-fought ${homeScore}–${awayScore}.`,
      `Two good sides — ${winnerLabel} just had a little more on the night.`,
    ]);
  }

  return `${teamName(homeTeam)} ${homeScore}–${awayScore} ${teamName(awayTeam)} at the final whistle.`;
}

function liveComment(match: MatchInfo): string {
  const { homeTeam, awayTeam, homeScore, awayScore } = match;
  const h = homeScore ?? 0;
  const a = awayScore ?? 0;

  if (h === a) {
    return pick(match.id, [
      "Level so far — expect both managers to chase a winner.",
      "All square at the moment; the next goal swings the tie.",
    ]);
  }

  const leader = h > a ? homeTeam : awayTeam;
  const trailer = h > a ? awayTeam : homeTeam;
  return pick(match.id, [
    `${teamName(leader)} lead — ${teamName(trailer)} need a response before time runs out.`,
    `${teamName(leader)} in front, but knockout football can turn in minutes.`,
  ]);
}

function placeholderPreview(match: MatchInfo): string {
  const roundHints: Record<MatchInfo["round"], string[]> = {
    R32: [
      "Group stage still deciding who lands in this slot.",
      "Bracket opens up once the last group games finish.",
    ],
    R16: [
      "Winner-takes-all once both teams are confirmed.",
      "Expect a sharper favorite once the Round of 32 is settled.",
    ],
    QF: [
      "Quarter-final spot up for grabs — quality rises from here.",
      "Two survivors will meet with a semi-final on the line.",
    ],
    SF: [
      "A place in the final awaits the side that handles the pressure.",
      "Semi-final tension — every mistake is magnified.",
    ],
    FINAL: [
      "The whole tournament comes down to 90 minutes (or more).",
      "Champion-elect still TBD — form in the knockouts will tell.",
    ],
    THIRD: [
      "Bronze on the line for two teams that fell just short.",
      "Third-place game — pride and one last podium finish.",
    ],
  };

  return pick(match.id, roundHints[match.round] ?? roundHints.R32);
}

function upcomingForecast(match: MatchInfo): string {
  const { homeTeam, awayTeam } = match;
  const homeLabel = teamName(homeTeam);
  const awayLabel = teamName(awayTeam);
  const fav = favorite(homeTeam, awayTeam);
  const dog = underdog(homeTeam, awayTeam);
  const favLabel = fav ? teamName(fav) : null;
  const dogLabel = dog ? teamName(dog) : null;
  const hr = rankOf(homeTeam);
  const ar = rankOf(awayTeam);
  const gap = hr !== null && ar !== null ? Math.abs(hr - ar) : null;

  if (RIVALRY_PAIRS.has(pairKey(homeTeam.code, awayTeam.code))) {
    return pick(match.id, [
      `Classic ${homeLabel}–${awayLabel} rivalry — form goes out the window.`,
      `History between these two — expect a tense, crowd-driven night.`,
      `Neither side wants to lose this one; a genuine coin-flip derby.`,
    ]);
  }

  if (homeTeam.confederation && awayTeam.confederation && homeTeam.confederation !== awayTeam.confederation) {
    const styles: Record<string, string> = {
      UEFA: "structured and technical",
      CONMEBOL: "physical with individual flair",
      CONCACAF: "direct and battle-hardened",
      CAF: "athletic and compact",
      AFC: "disciplined and quick in transition",
      OFC: "organized and fearless",
    };
    const homeStyle = styles[homeTeam.confederation] ?? "their own rhythm";
    const awayStyle = styles[awayTeam.confederation] ?? "their own rhythm";
    if (homeStyle !== awayStyle) {
      return pick(match.id, [
        `${homeTeam.confederation} meets ${awayTeam.confederation} — contrasting styles on show.`,
        `${homeLabel}'s ${homeStyle} approach vs ${awayLabel}'s ${awayStyle} game.`,
      ]);
    }
  }

  if (fav && dog && favLabel && dogLabel && gap !== null) {
    if (gap >= 15) {
      return pick(match.id, [
        `${favLabel} heavy favorites on paper; ${dogLabel} will need a perfect night.`,
        `Upset alert if ${dogLabel} pull this off — ${favLabel} should control tempo.`,
      ]);
    }
    if (gap >= 8) {
      return pick(match.id, [
        `${favLabel} slight edge in the rankings — ${dogLabel} live on the counter.`,
        `Lean ${favLabel}, but knockout margins are rarely comfortable.`,
      ]);
    }
    if (gap <= 3) {
      return pick(match.id, [
        `FIFA rankings have this as a toss-up between ${homeLabel} and ${awayLabel}.`,
        `Evenly matched on paper — one set piece could decide it.`,
        `Too close to call; expect a cautious start and a frantic finish.`,
      ]);
    }
    return pick(match.id, [
      `${favLabel} enter as favorites, though ${dogLabel} won't lack belief.`,
      `Slight nod to ${favLabel}; ${dogLabel} have paths to an upset.`,
    ]);
  }

  return pick(match.id, [
    `Open knockout tie — ${homeLabel} and ${awayLabel} both one win from advancing.`,
    `Win-or-go-home: whoever handles the big moments goes through.`,
    `Hard to split these two before kickoff; expect a tight 90 minutes.`,
  ]);
}

export function getMatchForecast(match: MatchInfo): string | null {
  if (match.stage === "GROUP") return null;

  const homePlaceholder = isPlaceholderTeam(match.homeTeam.code, match.homeTeam.name);
  const awayPlaceholder = isPlaceholderTeam(match.awayTeam.code, match.awayTeam.name);

  if (match.status === "FINISHED") {
    return finishedRecap(match);
  }

  if (isLive(match.status)) {
    return liveComment(match);
  }

  if (homePlaceholder || awayPlaceholder) {
    return placeholderPreview(match);
  }

  return upcomingForecast(match);
}
