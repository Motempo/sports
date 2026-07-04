import { getRoundLabel } from "@/lib/bracket-constants";
import type { MatchInfo, TeamInfo } from "@/lib/types";
import { isPlaceholderTeam } from "@/lib/match-context";

const MAX_FORECAST = 200;

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

const CONFEDERATION_STYLES: Record<string, string> = {
  UEFA: "structured, technical, and ruthless in possession",
  CONMEBOL: "physical, expressive, and dangerous in one-v-one moments",
  CONCACAF: "direct, battle-hardened, and hard to knock off rhythm",
  CAF: "athletic, compact, and quick to punish space in behind",
  AFC: "disciplined, organized, and sharp on the counter",
  OFC: "organized, fearless, and happy to punch above their weight",
};

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

function clampForecast(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= MAX_FORECAST) return trimmed;
  const cut = trimmed.slice(0, MAX_FORECAST - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 120 ? cut.slice(0, lastSpace) : cut}…`;
}

function rankTag(team: TeamInfo): string {
  const rank = rankOf(team);
  return rank ? `${teamName(team)} (#${rank})` : teamName(team);
}

function confederationStyle(confederation?: string): string | null {
  return confederation ? (CONFEDERATION_STYLES[confederation] ?? null) : null;
}

function roundStakes(round: MatchInfo["round"]): string {
  switch (round) {
    case "R32":
      return "a place in the Round of 16";
    case "R16":
      return "a quarter-final berth";
    case "QF":
      return "a semi-final spot";
    case "SF":
      return "a shot at the final";
    case "FINAL":
      return "the trophy itself";
    case "THIRD":
      return "bronze and one last podium moment";
    default:
      return "the next round";
  }
}

function venueSnippet(match: MatchInfo): string {
  const city = match.city?.split(",")[0]?.trim();
  if (city) return ` in ${city}`;
  if (match.venue?.trim()) return ` at ${match.venue.trim()}`;
  return "";
}

function styleContrast(home: TeamInfo, away: TeamInfo): string | null {
  if (!home.confederation || !away.confederation || home.confederation === away.confederation) {
    return null;
  }
  const homeStyle = confederationStyle(home.confederation);
  const awayStyle = confederationStyle(away.confederation);
  if (!homeStyle || !awayStyle) return null;
  return `${teamName(home)} bring a ${homeStyle} game; ${teamName(away)} answer with ${awayStyle} football.`;
}

function finishedRecap(match: MatchInfo): string {
  const { homeTeam, awayTeam, homeScore, awayScore, winnerCode, round } = match;
  if (homeScore === null || awayScore === null) {
    return clampForecast(
      `Full-time${venueSnippet(match)} — the ${getRoundLabel(round)} picture shifts and ${roundStakes(round)} is decided.`
    );
  }

  const margin = Math.abs(homeScore - awayScore);
  const scoreline = `${homeScore}–${awayScore}`;
  const winner =
    winnerCode === homeTeam.code
      ? homeTeam
      : winnerCode === awayTeam.code
        ? awayTeam
        : null;
  const loser =
    winner?.code === homeTeam.code
      ? awayTeam
      : winner?.code === awayTeam.code
        ? homeTeam
        : null;
  const winnerLabel = winner ? rankTag(winner) : null;
  const loserLabel = loser ? rankTag(loser) : null;
  const stakes = roundStakes(round);
  const venue = venueSnippet(match);

  if (margin === 0) {
    if (winner && winnerLabel && loserLabel) {
      return clampForecast(
        pick(match.id, [
          `${scoreline} after 90${venue} — nerve-shredding shootout drama, and ${winnerLabel} hold their cool to claim ${stakes}. ${loserLabel} leave with heads high but hearts broken.`,
          `${winnerLabel} survive penalties after a ${scoreline} classic${venue}. ${loserLabel} matched them for 120 minutes — cruel way to bow out when ${stakes} was on the line.`,
        ])
      );
    }
    return clampForecast(
      `Finished ${scoreline}${venue} — honors shared after 90 minutes, with neither side able to separate in a tense ${getRoundLabel(round)} stalemate.`
    );
  }

  if (winner && winnerLabel && loserLabel) {
    if (margin >= 3) {
      return clampForecast(
        pick(match.id, [
          `${winnerLabel} ran riot${venue}, cruising to a ${scoreline} statement win over ${loserLabel}. Clinical finishing and control from start to finish — ${stakes} never looked in doubt.`,
          `Brutal scoreline for ${loserLabel}: ${winnerLabel} win ${scoreline}${venue} and turn ${getRoundLabel(round)} into a procession. The underdog never found a foothold.`,
        ])
      );
    }
    if (margin === 1) {
      return clampForecast(
        pick(match.id, [
          `${winnerLabel} edge it ${scoreline}${venue} — one flash of quality separated these two in a knife-edge ${getRoundLabel(round)} tie. ${loserLabel} will rue the fine margins.`,
          `Tight as it gets: ${winnerLabel} nick a ${scoreline} win${venue} and deny ${loserLabel} ${stakes}. One moment, one chance, one team still standing.`,
        ])
      );
    }
    return clampForecast(
      pick(match.id, [
        `${winnerLabel} advance ${scoreline}${venue} after a proper battle with ${loserLabel}. Neither side gave an inch — quality in both boxes decided who moves on to ${stakes}.`,
        `Hard-fought ${scoreline}${venue}: ${winnerLabel} had just enough for ${loserLabel} in a ${getRoundLabel(round)} clash that felt closer than the score suggests.`,
      ])
    );
  }

  return clampForecast(
    `${rankTag(homeTeam)} ${scoreline} ${rankTag(awayTeam)} at the final whistle${venue} — ${getRoundLabel(round)} drama in the books.`
  );
}

function liveComment(match: MatchInfo): string {
  const { homeTeam, awayTeam, homeScore, awayScore, round } = match;
  const h = homeScore ?? 0;
  const a = awayScore ?? 0;
  const stakes = roundStakes(round);
  const venue = venueSnippet(match);

  if (h === a) {
    const scoreline = `${h}–${a}`;
    const style = styleContrast(homeTeam, awayTeam);
    return clampForecast(
      pick(match.id, [
        `Level at ${scoreline}${venue} — ${rankTag(homeTeam)} and ${rankTag(awayTeam)} trading blows in a live ${getRoundLabel(round)} thriller. Next goal swings ${stakes}; expect both benches to chase a winner.`,
        `All square ${scoreline}${venue} between ${rankTag(homeTeam)} and ${rankTag(awayTeam)}. Tension building — extra time looms if nobody blinks. ${style ?? "Knockout nerves everywhere."}`,
      ])
    );
  }

  const leader = h > a ? homeTeam : awayTeam;
  const trailer = h > a ? awayTeam : homeTeam;
  const scoreline = `${h}–${a}`;
  return clampForecast(
    pick(match.id, [
      `${rankTag(leader)} lead ${scoreline}${venue}, but ${rankTag(trailer)} still have routes back into this ${getRoundLabel(round)} tie. ${stakes} on the line — one goal changes everything.`,
      `Live ${scoreline}: ${rankTag(leader)} ahead, ${rankTag(trailer)} chasing a lifeline${venue}. Knockout football at its cruellest — composure now wins ${stakes}.`,
    ])
  );
}

function placeholderPreview(match: MatchInfo): string {
  const round = getRoundLabel(match.round);
  const stakes = roundStakes(match.round);

  const roundHints: Record<MatchInfo["round"], string[]> = {
    R32: [
      `Round of 32 slot still TBD — group results are filling the bracket. Once both teams are confirmed, expect a win-or-go-home ${round} tie with ${stakes} up for grabs.`,
      `Who lands here depends on the last group games. When the names are set, this becomes a straight shootout for ${stakes} — no second chances.`,
    ],
    R16: [
      `Round of 16 pairing locks in after the first knockout weekend. Two survivors will meet for ${stakes} — quality rises and mistakes get punished.`,
      `Winner-takes-all ${round} football once both sides are known. Expect a sharper favorite to emerge once the Round of 32 dust settles.`,
    ],
    QF: [
      `Quarter-final berth on the line here — eight teams left, four tickets to the semis. Only the coolest heads survive this ${round} stage.`,
      `Two ${round} survivors collide for ${stakes}. The bracket narrows fast from here — every half-chance feels enormous.`,
    ],
    SF: [
      `Semi-final pressure cooker — ${stakes} awaits whoever handles the big moments. One game from the final; nerves and quality both required.`,
      `A place in the final is the prize. This ${round} slot will host a genuine heavyweight clash once the quarter-finals are done.`,
    ],
    FINAL: [
      `The whole tournament boils down to 90 minutes (or more) on the biggest stage. Champion-elect still TBD — form, belief, and one killer moment decide it all.`,
      `One match for immortality. When the finalists are set, expect a ${round} soaked in drama, noise, and world-class individual quality.`,
    ],
    THIRD: [
      `Bronze medal match — two teams that fell just short still have ${stakes}. Pride, momentum, and a podium finish make this more than a consolation.`,
      `Third-place game with real stakes: ${stakes} for sides that deserved more. Often surprisingly open — nobody wants to fly home empty-handed.`,
    ],
  };

  return clampForecast(pick(match.id, roundHints[match.round] ?? roundHints.R32));
}

function upcomingForecast(match: MatchInfo): string {
  const { homeTeam, awayTeam, round } = match;
  const homeLabel = rankTag(homeTeam);
  const awayLabel = rankTag(awayTeam);
  const fav = favorite(homeTeam, awayTeam);
  const dog = underdog(homeTeam, awayTeam);
  const favLabel = fav ? rankTag(fav) : null;
  const dogLabel = dog ? rankTag(dog) : null;
  const hr = rankOf(homeTeam);
  const ar = rankOf(awayTeam);
  const gap = hr !== null && ar !== null ? Math.abs(hr - ar) : null;
  const stakes = roundStakes(round);
  const venue = venueSnippet(match);
  const style = styleContrast(homeTeam, awayTeam);

  if (RIVALRY_PAIRS.has(pairKey(homeTeam.code, awayTeam.code))) {
    return clampForecast(
      pick(match.id, [
        `Classic ${homeLabel} vs ${awayLabel} — form and rankings go out the window${venue}. History, noise, and pride fuel a ${getRoundLabel(round)} grudge match with ${stakes} on the line.`,
        `Rivalry renewed: ${homeLabel} meet ${awayLabel} in a win-or-go-home ${getRoundLabel(round)} clash${venue}. Expect a tense, crowd-driven night where neither side yields easily.`,
        `${homeLabel} and ${awayLabel} in a genuine coin-flip derby${venue}. Momentum, cards, and one big moment likely decide who claims ${stakes}.`,
      ])
    );
  }

  if (style) {
    return clampForecast(
      pick(match.id, [
        `${style} Watch for transitions and set pieces${venue} — ${getRoundLabel(round)} football with ${stakes} riding on who imposes their game first.`,
        `Tactical chess${venue}: ${homeLabel} vs ${awayLabel} in the ${getRoundLabel(round)}. ${style} Whoever wins the midfield battle likely takes ${stakes}.`,
      ])
    );
  }

  if (fav && dog && favLabel && dogLabel && gap !== null) {
    if (gap >= 15) {
      return clampForecast(
        pick(match.id, [
          `${favLabel} look like heavy favorites on paper${venue}; ${dogLabel} need a near-perfect night to pull the upset. Expect the favourite to control tempo and chance volume in this ${getRoundLabel(round)} tie.`,
          `Upset radar on: ${dogLabel} vs ${favLabel}${venue}. The gap in FIFA rankings is stark, but knockout football loves a script-flip — ${stakes} still worth fighting for.`,
        ])
      );
    }
    if (gap >= 8) {
      return clampForecast(
        pick(match.id, [
          `Lean ${favLabel} in the ${getRoundLabel(round)}${venue}, but ${dogLabel} can live on the counter and set pieces. Rankings say favorite; knockout margins say stay nervous until the final whistle.`,
          `${favLabel} carry a clear edge over ${dogLabel}${venue} — not a lock, though. One early goal or red card and this ${getRoundLabel(round)} tie tilts fast.`,
        ])
      );
    }
    if (gap <= 3) {
      return clampForecast(
        pick(match.id, [
          `FIFA rankings call this a toss-up: ${homeLabel} vs ${awayLabel}${venue}. Expect a cagey start, a frantic finish, and ${stakes} decided by one big moment in the ${getRoundLabel(round)}.`,
          `Too close to call on paper — ${homeLabel} and ${awayLabel} are separated by almost nothing${venue}. Set pieces, penalties, or individual brilliance may settle this ${getRoundLabel(round)} thriller.`,
          `Evenly matched heavyweight clash${venue}: ${homeLabel} vs ${awayLabel} for ${stakes}. Form says coin flip; knockout nerves say don't blink first.`,
        ])
      );
    }
    return clampForecast(
      pick(match.id, [
        `${favLabel} enter as slight favorites against ${dogLabel}${venue}, but belief won't be lacking on either side. Tight ${getRoundLabel(round)} forecast: one quality spell wins ${stakes}.`,
        `Slight nod to ${favLabel} over ${dogLabel}${venue} — still very live. Whoever handles the first 20 minutes and the late chaos likely advances in this ${getRoundLabel(round)} tie.`,
      ])
    );
  }

  return clampForecast(
    pick(match.id, [
      `Open ${getRoundLabel(round)} tie${venue}: ${homeLabel} and ${awayLabel} both one win from ${stakes}. Win-or-go-home — big-game composure beats pretty football here.`,
      `Hard to split before kickoff${venue}. ${homeLabel} vs ${awayLabel} in a live-or-die ${getRoundLabel(round)} clash — expect tension, momentum swings, and late drama.`,
      `${homeLabel} meet ${awayLabel} with ${stakes} on the line${venue}. Knockout margins are thin; the side that scores first may control the whole story.`,
    ])
  );
}

export function getMatchForecast(match: MatchInfo): string | null {
  if (match.stage === "GROUP") return null;

  const homePlaceholder = isPlaceholderTeam(match.homeTeam.code, match.homeTeam.name);
  const awayPlaceholder = isPlaceholderTeam(match.awayTeam.code, match.awayTeam.name);

  let forecast: string;
  if (match.status === "FINISHED") {
    forecast = finishedRecap(match);
  } else if (isLive(match.status)) {
    forecast = liveComment(match);
  } else if (homePlaceholder || awayPlaceholder) {
    forecast = placeholderPreview(match);
  } else {
    forecast = upcomingForecast(match);
  }

  return clampForecast(forecast);
}
