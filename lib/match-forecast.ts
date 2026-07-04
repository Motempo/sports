import { getRoundLabel } from "@/lib/bracket-constants";
import type { MatchInfo, TeamInfo } from "@/lib/types";
import { isPlaceholderTeam } from "@/lib/match-context";

const MAX_FORECAST = 300;

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
  UEFA: "technical and ruthless in possession",
  CONMEBOL: "physical, expressive, and dangerous 1-v-1",
  CONCACAF: "direct, battle-hardened, and hard to shake",
  CAF: "compact, athletic, and lethal on the break",
  AFC: "disciplined, organized, and sharp counters",
  OFC: "organized, fearless, and ready to punch up",
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

/** Prefer ending on a full sentence; only ellipsis if we must cut mid-thought. */
function clampForecast(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= MAX_FORECAST) return trimmed;

  const slice = trimmed.slice(0, MAX_FORECAST);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (sentenceEnd >= 140) {
    return trimmed.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace >= 200) {
    return `${trimmed.slice(0, lastSpace).trim()}.`;
  }

  return `${trimmed.slice(0, MAX_FORECAST - 1).trim()}…`;
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
  return `${teamName(home)} are ${homeStyle}; ${teamName(away)} play ${awayStyle} football.`;
}

function finishedRecap(match: MatchInfo): string {
  const { homeTeam, awayTeam, homeScore, awayScore, winnerCode, round } = match;
  const roundLabel = getRoundLabel(round);
  const stakes = roundStakes(round);
  const venue = venueSnippet(match);

  if (homeScore === null || awayScore === null) {
    return `Full-time${venue}. The ${roundLabel} bracket shifts and ${stakes} has been decided — check the scoreline above for how this one landed.`;
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

  if (margin === 0) {
    if (winner && winnerLabel && loserLabel) {
      return pick(match.id, [
        `${scoreline} after 90${venue} — penalties decided it. ${winnerLabel} kept their nerve to claim ${stakes}; ${loserLabel} matched them for 120 minutes and still went home.`,
        `${winnerLabel} survive a ${scoreline} shootout${venue} after a brutal ${roundLabel} arm-wrestle with ${loserLabel}. Cruel exit for the losers, but someone had to advance.`,
      ]);
    }
    return `Finished ${scoreline}${venue}. Neither ${rankTag(homeTeam)} nor ${rankTag(awayTeam)} could break the deadlock in 90 minutes — a rare ${roundLabel} stalemate that went the distance.`;
  }

  if (winner && winnerLabel && loserLabel) {
    if (margin >= 3) {
      return pick(match.id, [
        `${winnerLabel} ran riot${venue}, winning ${scoreline} against ${loserLabel}. A statement ${roundLabel} performance — clinical in both boxes and never really threatened. ${stakes} secured in style.`,
        `Brutal for ${loserLabel}: ${winnerLabel} cruise ${scoreline}${venue} and turn this ${roundLabel} tie into a procession. The underdog never found a foothold and the favorite never looked back.`,
      ]);
    }
    if (margin === 1) {
      return pick(match.id, [
        `${winnerLabel} edge it ${scoreline}${venue} against ${loserLabel} — one moment of quality in a knife-edge ${roundLabel} tie. Fine margins decide ${stakes}, and tonight they fell the right way.`,
        `As tight as it gets: ${winnerLabel} nick ${scoreline}${venue} and deny ${loserLabel} ${stakes}. One chance, one finish, one team still dreaming — the other packs their bags.`,
      ]);
    }
    return pick(match.id, [
      `${winnerLabel} advance ${scoreline}${venue} after a proper scrap with ${loserLabel}. Neither gave an inch in a ${roundLabel} battle where both boxes saw real danger. Quality at the key moment won ${stakes}.`,
      `Hard-fought ${scoreline}${venue}: ${winnerLabel} had just enough for ${loserLabel}. The ${roundLabel} score flatters nobody — this felt closer than the numbers suggest, but only one side moves on.`,
    ]);
  }

  return `${rankTag(homeTeam)} ${scoreline} ${rankTag(awayTeam)} at the final whistle${venue}. Another ${roundLabel} chapter written — the bracket reshapes and the losers' summer is over.`;
}

function liveComment(match: MatchInfo): string {
  const { homeTeam, awayTeam, homeScore, awayScore, round } = match;
  const h = homeScore ?? 0;
  const a = awayScore ?? 0;
  const stakes = roundStakes(round);
  const venue = venueSnippet(match);
  const roundLabel = getRoundLabel(round);

  if (h === a) {
    const scoreline = `${h}–${a}`;
    const style = styleContrast(homeTeam, awayTeam);
    return pick(match.id, [
      `Level at ${scoreline}${venue} — ${rankTag(homeTeam)} and ${rankTag(awayTeam)} trading blows in a live ${roundLabel} thriller. The next goal swings ${stakes}; both benches are chasing a winner before pens loom.`,
      `All square ${scoreline}${venue} between ${rankTag(homeTeam)} and ${rankTag(awayTeam)}. ${style ?? "Knockout tension everywhere."} Extra time is on the table if nobody blinks — this is win-or-go-home football at its finest.`,
    ]);
  }

  const leader = h > a ? homeTeam : awayTeam;
  const trailer = h > a ? awayTeam : homeTeam;
  const scoreline = `${h}–${a}`;
  return pick(match.id, [
    `${rankTag(leader)} lead ${scoreline}${venue}, but ${rankTag(trailer)} still have paths back in this ${roundLabel} tie. ${stakes} on the line — one goal flips the mood, the tactics, and the whole stadium.`,
    `Live ${scoreline}: ${rankTag(leader)} ahead, ${rankTag(trailer)} chasing a lifeline${venue}. Knockout football at its cruellest — composure and a big moment now decide who claims ${stakes}.`,
  ]);
}

function placeholderPreview(match: MatchInfo): string {
  const roundLabel = getRoundLabel(match.round);
  const stakes = roundStakes(match.round);

  const roundHints: Record<MatchInfo["round"], string[]> = {
    R32: [
      `This Round of 32 slot is still waiting on group results. Once both teams are confirmed, it becomes a straight win-or-go-home ${roundLabel} tie — lose once and the World Cup is over.`,
      `Who fills this bracket spot depends on the final group games. When the names land, expect a ${roundLabel} shootout with ${stakes} on the line and no safety net.`,
    ],
    R16: [
      `This Round of 16 pairing locks in after the first knockout weekend. Two survivors will collide for ${stakes} — quality rises, nerves tighten, and mistakes get punished instantly.`,
      `Winner-takes-all ${roundLabel} football once both sides are known. Expect a clearer favorite to emerge once the Round of 32 dust settles and the bracket firms up.`,
    ],
    QF: [
      `A quarter-final berth on the line — eight teams left, four tickets to the semis. Only the coolest heads survive this ${roundLabel} stage when every pass carries weight.`,
      `Two ${roundLabel} survivors meet for ${stakes}. The bracket narrows fast from here; every half-chance feels enormous and every save can swing a continent's mood.`,
    ],
    SF: [
      `Semi-final pressure cooker — ${stakes} awaits whoever handles the big moments. One game from the final; belief, discipline, and a bit of magic all required.`,
      `A place in the final is the prize in this ${roundLabel} slot. When the teams are set, expect a heavyweight clash where the first goal rarely tells the whole story.`,
    ],
    FINAL: [
      `The whole tournament boils down to 90 minutes or more on the biggest stage. Champion-elect still TBD — form, belief, and one killer moment will decide who lifts the trophy.`,
      `One match for immortality. When the finalists are confirmed, expect a ${roundLabel} soaked in noise, drama, and world-class individual quality under impossible pressure.`,
    ],
    THIRD: [
      `Bronze medal match — two teams that fell just short still have ${stakes}. Pride is real here; often surprisingly open because nobody wants to fly home empty-handed.`,
      `Third-place game with genuine stakes: ${stakes} for sides that deserved more. Not a consolation for the heartbroken — a last chance to leave a mark on the tournament.`,
    ],
  };

  return pick(match.id, roundHints[match.round] ?? roundHints.R32);
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
  const roundLabel = getRoundLabel(round);
  const style = styleContrast(homeTeam, awayTeam);

  if (RIVALRY_PAIRS.has(pairKey(homeTeam.code, awayTeam.code))) {
    return pick(match.id, [
      `Classic ${homeLabel} vs ${awayLabel}${venue} — form and FIFA rankings go out the window. History, noise, and pride fuel a ${roundLabel} grudge match where neither side yields easily and ${stakes} feels personal.`,
      `Rivalry renewed: ${homeLabel} meet ${awayLabel} in win-or-go-home ${roundLabel} football${venue}. Expect a tense, crowd-driven night where cards, momentum swings, and one big moment likely decide everything.`,
    ]);
  }

  if (style) {
    return pick(match.id, [
      `${style} Watch transitions and set pieces${venue} — a ${roundLabel} chess match where ${stakes} goes to whoever imposes their rhythm first and survives the late chaos.`,
      `Tactical duel${venue}: ${homeLabel} vs ${awayLabel} in the ${roundLabel}. ${style} The midfield battle sets the tone; the team that wins those pockets probably books ${stakes}.`,
    ]);
  }

  if (fav && dog && favLabel && dogLabel && gap !== null) {
    if (gap >= 15) {
      return pick(match.id, [
        `${favLabel} look like heavy favorites on paper${venue}; ${dogLabel} need a near-perfect night to flip the script. Expect the favourite to boss possession, but one counter can rewrite this ${roundLabel} story.`,
        `Upset radar: ${dogLabel} vs ${favLabel}${venue}. The FIFA gap is huge on paper, yet knockout football loves a plot twist — ${stakes} is still worth every sprint and every save.`,
      ]);
    }
    if (gap >= 8) {
      return pick(match.id, [
        `Lean ${favLabel} in the ${roundLabel}${venue}, but ${dogLabel} can live on the counter and set pieces. Rankings say favorite; knockout reality says stay nervous until the final whistle blows.`,
        `${favLabel} carry a clear edge over ${dogLabel}${venue} — not a lock, though. One early goal or red card tilts this ${roundLabel} tie fast, and ${stakes} waits for the side that adapts.`,
      ]);
    }
    if (gap <= 3) {
      return pick(match.id, [
        `FIFA rankings call this a toss-up: ${homeLabel} vs ${awayLabel}${venue}. Expect a cagey start, a frantic finish, and ${stakes} decided by one big moment in the ${roundLabel}.`,
        `Too close to call — ${homeLabel} and ${awayLabel} are separated by almost nothing${venue}. Set pieces, penalties, or individual brilliance may settle this ${roundLabel} thriller. Don't blink first.`,
      ]);
    }
    return pick(match.id, [
      `${favLabel} enter as slight favorites against ${dogLabel}${venue}, but belief won't be short on either bench. Tight ${roundLabel} forecast: one quality spell, one mistake, and ${stakes} is decided.`,
      `Slight nod to ${favLabel} over ${dogLabel}${venue} — still very live. Whoever handles the opening 20 minutes and the late chaos likely advances in this ${roundLabel} tie.`,
    ]);
  }

  return pick(match.id, [
    `Open ${roundLabel} tie${venue}: ${homeLabel} and ${awayLabel} both one win from ${stakes}. Win-or-go-home — big-game composure beats pretty football when the stadium gets loud.`,
    `Hard to split before kickoff${venue}. ${homeLabel} vs ${awayLabel} in a live-or-die ${roundLabel} clash — expect tension, momentum swings, and late drama that defines a summer.`,
    `${homeLabel} meet ${awayLabel} with ${stakes} on the line${venue}. Knockout margins are thin; the side that scores first often controls the whole story until the final whistle.`,
  ]);
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
