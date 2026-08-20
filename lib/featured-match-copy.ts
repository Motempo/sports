import { getRoundLabel } from "@/lib/bracket-constants";
import { getMatchStakes } from "@/lib/match-context";
import { getMatchForecast } from "@/lib/match-forecast";
import { formatMatchVenueLine } from "@/lib/match-venue";
import { nextEventParagraphs, type NextEventBrief } from "@/lib/next-event-copy";
import type { GroupStandings } from "@/lib/group-standings";
import type { LeagueStandingRow, LeagueStandings, PremierLeagueRaceInsight } from "@/lib/premier-league-types";
import type { MatchInfo } from "@/lib/types";

function teamLabel(team: MatchInfo["homeTeam"]): string {
  return team.name?.trim() || team.code;
}

function ordinal(position: number): string {
  const n = Math.abs(position);
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formTag(row: LeagueStandingRow): string {
  if (!row.form.length) return "";
  return row.form.slice(-5).join("");
}

function findLeagueRow(standings: LeagueStandings | undefined, code: string): LeagueStandingRow | undefined {
  return standings?.rows.find((row) => row.team.code === code);
}

function matchDescription(match: MatchInfo): string {
  const home = teamLabel(match.homeTeam);
  const away = teamLabel(match.awayTeam);
  const venue = formatMatchVenueLine(match);
  const at = venue ? ` at ${venue}` : "";

  if (match.stage === "LEAGUE") {
    const matchday = match.group?.trim();
    const day = matchday ? ` (${matchday})` : "";
    if (match.status === "FINISHED") {
      return `${home} ${match.homeScore ?? "–"}–${match.awayScore ?? "–"} ${away}${at}${day}.`;
    }
    if (match.status === "LIVE" || match.status === "IN_PLAY" || match.status === "PAUSED") {
      return `${home} vs ${away} is live${at}${day}.`;
    }
    return `${home} host ${away}${at}${day}. Ninety minutes, three points, and a place in the table on the line.`;
  }

  if (match.stage === "GROUP") {
    const group = match.group?.replace("GROUP_", "Group ") ?? "the group";
    if (match.status === "FINISHED") {
      return `${home} ${match.homeScore ?? "–"}–${match.awayScore ?? "–"} ${away} in ${group}${at}.`;
    }
    return `${home} vs ${away} in ${group}${at}. Group games still decide who reaches the knockout rounds.`;
  }

  const round = getRoundLabel(match.round);
  if (match.status === "FINISHED") {
    return `${home} ${match.homeScore ?? "–"}–${match.awayScore ?? "–"} ${away} in the ${round}${at}.`;
  }
  return `${home} vs ${away} in the ${round}${at}. Win or go home — one match decides who continues.`;
}

function leaguePrediction(match: MatchInfo, standings?: LeagueStandings): string {
  const home = findLeagueRow(standings, match.homeTeam.code);
  const away = findLeagueRow(standings, match.awayTeam.code);
  const homeName = teamLabel(match.homeTeam);
  const awayName = teamLabel(match.awayTeam);

  if (!home || !away) {
    return `The form book is thin until the table settles. Pundits will watch who controls the midfield and who looks sharper in both boxes.`;
  }

  const homeForm = formTag(home);
  const awayForm = formTag(away);
  const formBit =
    homeForm && awayForm ? ` Recent form (${homeForm} vs ${awayForm}) is the tell the pundits mark.` : "";
  const gap = Math.abs(home.points - away.points);

  if (match.status === "FINISHED") {
    return `${homeName} came in ${ordinal(home.position)} on ${home.points} pts; ${awayName} were ${ordinal(away.position)} on ${away.points}. The scoreline is what the table will remember.`;
  }

  if (Math.abs(home.position - away.position) <= 2 && gap <= 4) {
    return `Toss-up on the table: ${homeName} ${ordinal(home.position)} (${home.points} pts) vs ${awayName} ${ordinal(away.position)} (${away.points}). Expect a tight midfield scrap.${formBit}`;
  }

  const higher = home.position < away.position ? home : away;
  const lower = higher === home ? away : home;
  const higherName = higher === home ? homeName : awayName;
  const lowerName = lower === home ? homeName : awayName;
  return `Form book: ${higherName} sit ${ordinal(higher.position)} on ${higher.points} pts, ${gap} clear of ${lowerName} in ${ordinal(lower.position)}. The higher side should see more of the ball; the lower side will look to counter and set pieces.${formBit}`;
}

function zoneImpact(row: LeagueStandingRow, name: string): string {
  switch (row.zone) {
    case "CHAMPIONS_LEAGUE":
      return `${name} are in the Champions League places`;
    case "EUROPA_LEAGUE":
      return `${name} are on the Europa League line`;
    case "CONFERENCE_LEAGUE":
      return `${name} are in the Conference League slot`;
    case "RELEGATION":
      return `${name} sit in the drop zone`;
    default:
      return `${name} are mid-table on ${row.points} pts`;
  }
}

function leagueImpact(
  match: MatchInfo,
  standings?: LeagueStandings,
  titleRace?: PremierLeagueRaceInsight | null,
  relegationRace?: PremierLeagueRaceInsight | null
): string {
  const home = findLeagueRow(standings, match.homeTeam.code);
  const away = findLeagueRow(standings, match.awayTeam.code);
  const homeName = teamLabel(match.homeTeam);
  const awayName = teamLabel(match.awayTeam);

  if (!home || !away) {
    return `Three points here shift the week for every player in the squad — winners sleep easier, losers feel the next training session.`;
  }

  const eitherRelegation = home.zone === "RELEGATION" || away.zone === "RELEGATION";
  const eitherTitle = home.position <= 2 || away.position <= 2;

  if (eitherRelegation && relegationRace?.message) {
    return `${relegationRace.message} A win keeps players in the top flight conversation; a loss stacks pressure on the dressing room before the next away day.`;
  }
  if (eitherTitle && titleRace?.message) {
    return `${titleRace.message} A win is a three-point swing for the squad chasing the trophy; a slip hands the other dressing room a week of belief.`;
  }

  return `${zoneImpact(home, homeName)}; ${zoneImpact(away, awayName)}. The result moves real people — starters fighting for their place, and whole squads chasing Europe or safety.`;
}

function knockoutImpact(match: MatchInfo): string {
  const home = teamLabel(match.homeTeam);
  const away = teamLabel(match.awayTeam);
  switch (match.round) {
    case "R32":
      return `Win and ${home} or ${away} reach the Round of 16; lose and their World Cup is over. That's a career night for every starter.`;
    case "R16":
      return `A quarter-final place is the prize. The losers fly home; the winners walk into the last eight of a World Cup.`;
    case "QF":
      return `Semi-final football is one win away. Players remember these nights for decades — one moment can define a career.`;
    case "SF":
      return `The final is on the other side of this match. A win puts a squad in the biggest game of their lives; a loss dumps them into the third-place match.`;
    case "FINAL":
      return `Champions forever, or runners-up forever. Every player on the pitch is playing for a life that changes if they lift the trophy.`;
    case "THIRD":
      return `Bronze is still a World Cup medal. Pride, ranking points, and one last chance to leave camp with something in the bag.`;
    default:
      return `Knockout football: the winners keep dreaming, the losers' tournament ends.`;
  }
}

function groupPrediction(
  match: MatchInfo,
  standings?: GroupStandings[]
): string {
  const forecast = getMatchForecast(match);
  if (forecast) return forecast;

  if (!standings || !match.group) {
    return `Pundits will watch who controls the ball without rushing. In a group game, a draw can still be a good night — a loss rarely is.`;
  }

  const group = standings.find((g) => g.groupId === match.group);
  const home = group?.rows.find((row) => row.team.code === match.homeTeam.code);
  const away = group?.rows.find((row) => row.team.code === match.awayTeam.code);
  if (!home || !away) {
    return `The group table is still taking shape. Expect a cagey start and a frantic last 15 if the game is still live.`;
  }

  return `Group table: ${teamLabel(match.homeTeam)} sit ${ordinal(home.position)} on ${home.points} pts; ${teamLabel(match.awayTeam)} are ${ordinal(away.position)} on ${away.points}. The side that needs a win will push; the side that can live with a point will sit in.`;
}

export function featuredMatchBrief(
  match: MatchInfo,
  options?: {
    groupStandings?: GroupStandings[];
    groupMatches?: MatchInfo[];
    leagueStandings?: LeagueStandings;
    titleRace?: PremierLeagueRaceInsight | null;
    relegationRace?: PremierLeagueRaceInsight | null;
  }
): NextEventBrief {
  const description = matchDescription(match);

  if (match.stage === "LEAGUE") {
    return {
      description,
      prediction: leaguePrediction(match, options?.leagueStandings),
      impact: leagueImpact(match, options?.leagueStandings, options?.titleRace, options?.relegationRace),
    };
  }

  if (match.stage === "GROUP") {
    return {
      description,
      prediction: groupPrediction(match, options?.groupStandings),
      impact:
        getMatchStakes(match, options?.groupStandings ?? [], options?.groupMatches) ??
        `Points here decide who reaches the knockout rounds — and who is packing for home.`,
    };
  }

  return {
    description,
    prediction:
      getMatchForecast(match) ??
      `${teamLabel(match.homeTeam)} vs ${teamLabel(match.awayTeam)} is too close to script. Expect a tense start and a big moment to settle it.`,
    impact: knockoutImpact(match),
  };
}

export function featuredMatchParagraphs(
  match: MatchInfo,
  options?: Parameters<typeof featuredMatchBrief>[1]
): string[] {
  return nextEventParagraphs(featuredMatchBrief(match, options));
}
