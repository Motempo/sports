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

function findLeagueRow(standings: LeagueStandings | undefined, code: string): LeagueStandingRow | undefined {
  return standings?.rows.find((row) => row.team.code === code);
}

function resultDescription(match: MatchInfo): string {
  const home = teamLabel(match.homeTeam);
  const away = teamLabel(match.awayTeam);
  const venue = formatMatchVenueLine(match);
  const at = venue ? ` at ${venue}` : "";
  const score =
    match.homeScore !== null && match.awayScore !== null
      ? `${match.homeScore}–${match.awayScore}`
      : "–";

  if (match.stage === "LEAGUE") {
    const matchday = match.group?.trim();
    const day = matchday ? ` (${matchday})` : "";
    return `${home} ${score} ${away}${at}${day}.`;
  }

  if (match.stage === "GROUP") {
    const group = match.group?.replace("GROUP_", "Group ") ?? "the group";
    return `${home} ${score} ${away} in ${group}${at}.`;
  }

  const round = getRoundLabel(match.round);
  return `${home} ${score} ${away} in the ${round}${at}.`;
}

function leagueHighlights(match: MatchInfo, standings?: LeagueStandings): string {
  const home = findLeagueRow(standings, match.homeTeam.code);
  const away = findLeagueRow(standings, match.awayTeam.code);
  const homeName = teamLabel(match.homeTeam);
  const awayName = teamLabel(match.awayTeam);
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const margin = Math.abs(homeScore - awayScore);

  if (homeScore === awayScore) {
    return `A shared ${homeScore}–${awayScore} draw — both sides took a point and neither fully controlled the tempo. Set pieces and the final 15 minutes decided who looked happier walking off.`;
  }

  const winner = homeScore > awayScore ? homeName : awayName;
  const loser = homeScore > awayScore ? awayName : homeName;
  const winnerRow = homeScore > awayScore ? home : away;
  const loserRow = homeScore > awayScore ? away : home;

  if (margin >= 3) {
    return `${winner} ran out comfortable ${homeScore}–${awayScore} winners against ${loser}. Clinical in both boxes and rarely troubled — the kind of scoreline that flatters a one-sided afternoon.`;
  }

  if (margin === 1) {
    const underdog =
      winnerRow && loserRow && winnerRow.position > loserRow.position ? `${loser} pushed hard, but ` : "";
    return `${underdog}${winner} edged it ${homeScore}–${awayScore}. Fine margins — one moment of quality or a defensive lapse settled a tight game that could have swung either way.`;
  }

  return `${winner} beat ${loser} ${homeScore}–${awayScore} in a proper scrap. Chances at both ends, momentum swings, and a result that felt earned rather than gifted.`;
}

function leagueImpactRecap(
  match: MatchInfo,
  standings?: LeagueStandings,
  titleRace?: PremierLeagueRaceInsight | null,
  relegationRace?: PremierLeagueRaceInsight | null
): string {
  const home = findLeagueRow(standings, match.homeTeam.code);
  const away = findLeagueRow(standings, match.awayTeam.code);
  const homeName = teamLabel(match.homeTeam);
  const awayName = teamLabel(match.awayTeam);
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  if (!home || !away) {
    return `The full-time whistle reset the week for both squads — winners carry belief into training, losers feel the next session a little sharper.`;
  }

  const eitherRelegation = home.zone === "RELEGATION" || away.zone === "RELEGATION";
  const eitherTitle = home.position <= 2 || away.position <= 2;

  if (eitherRelegation && relegationRace?.message) {
    return `${relegationRace.message} This result moved real survival maths — ${homeName} sit ${ordinal(home.position)} on ${home.points} pts; ${awayName} are ${ordinal(away.position)} on ${away.points}.`;
  }

  if (eitherTitle && titleRace?.message) {
    return `${titleRace.message} After this one, ${homeName} are ${ordinal(home.position)} on ${home.points} pts and ${awayName} ${ordinal(away.position)} on ${away.points} — a three-point swing in the title picture.`;
  }

  const winnerName = homeScore > awayScore ? homeName : awayScore > homeScore ? awayName : null;
  if (homeScore === awayScore) {
    return `Both sides take a point: ${homeName} stay ${ordinal(home.position)} on ${home.points} pts; ${awayName} remain ${ordinal(away.position)} on ${away.points}. Neither climbed the table, neither slipped further.`;
  }

  return `${winnerName} banked three points. ${homeName} are ${ordinal(home.position)} on ${home.points} pts; ${awayName} sit ${ordinal(away.position)} on ${away.points} — the table now reflects who controlled the afternoon.`;
}

function groupHighlights(match: MatchInfo, standings?: GroupStandings[]): string {
  const forecast = getMatchForecast(match);
  if (forecast) return forecast;

  if (!standings || !match.group) {
    return `Group-stage points on the board. Whoever controlled the middle third looked sharper; whoever switched off in the box paid for it.`;
  }

  const group = standings.find((g) => g.groupId === match.group);
  const home = group?.rows.find((row) => row.team.code === match.homeTeam.code);
  const away = group?.rows.find((row) => row.team.code === match.awayTeam.code);
  if (!home || !away) {
    return `Another group-stage chapter written. The side that needed the win will feel they did enough; the side that could live with a point may still be satisfied.`;
  }

  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  if (homeScore === awayScore) {
    return `Finished ${homeScore}–${awayScore} — a point each that nudges ${teamLabel(match.homeTeam)} and ${teamLabel(match.awayTeam)} in the group table without settling who advances.`;
  }

  const winner = homeScore > awayScore ? teamLabel(match.homeTeam) : teamLabel(match.awayTeam);
  return `${winner} took the three points. ${teamLabel(match.homeTeam)} sit ${ordinal(home.position)} on ${home.points}; ${teamLabel(match.awayTeam)} are ${ordinal(away.position)} on ${away.points} — the group picture is clearer after this one.`;
}

function knockoutImpactRecap(match: MatchInfo): string {
  const home = teamLabel(match.homeTeam);
  const away = teamLabel(match.awayTeam);
  const winnerCode = match.winnerCode;
  const winner =
    winnerCode === match.homeTeam.code ? home : winnerCode === match.awayTeam.code ? away : null;
  const loser =
    winner === home ? away : winner === away ? home : null;

  switch (match.round) {
    case "R32":
      return winner && loser
        ? `${winner} advance to the Round of 16; ${loser}'s World Cup is over. One night, one result — careers defined by who handled the pressure.`
        : `The Round of 32 bracket shifted — one side keeps dreaming, the other flies home.`;
    case "R16":
      return winner && loser
        ? `${winner} are into the quarter-finals; ${loser} leave the tournament. The last eight is where summers become legends.`
        : `Quarter-final places decided — the losers' tournament ends here.`;
    case "QF":
      return winner && loser
        ? `${winner} reach the semi-finals; ${loser} miss a shot at the final four. These nights stay with players for decades.`
        : `Semi-final berths claimed — heartbreak for whoever went home.`;
    case "SF":
      return winner && loser
        ? `${winner} will play for the trophy; ${loser} drop into the third-place match. One win from the biggest game of their lives.`
        : `Finalists decided — the losers still have one more match for bronze.`;
    case "FINAL":
      return winner
        ? `${winner} are world champions; ${loser ?? "their opponents"} are runners-up forever. A lifetime changed at the final whistle.`
        : `The World Cup has a champion — the bracket is complete.`;
    case "THIRD":
      return winner && loser
        ? `${winner} take bronze; ${loser} leave empty-handed. Still a World Cup medal for the winners.`
        : `Third place decided — pride, ranking points, and one last medal on the line.`;
    default:
      return winner && loser
        ? `${winner} move on; ${loser}'s knockout run is over.`
        : `Knockout football: winners keep dreaming, losers pack their bags.`;
  }
}

export function previousMatchBrief(
  match: MatchInfo,
  options?: {
    groupStandings?: GroupStandings[];
    groupMatches?: MatchInfo[];
    leagueStandings?: LeagueStandings;
    titleRace?: PremierLeagueRaceInsight | null;
    relegationRace?: PremierLeagueRaceInsight | null;
  }
): NextEventBrief {
  const description = resultDescription(match);

  if (match.stage === "LEAGUE") {
    return {
      description,
      prediction: leagueHighlights(match, options?.leagueStandings),
      impact: leagueImpactRecap(
        match,
        options?.leagueStandings,
        options?.titleRace,
        options?.relegationRace
      ),
    };
  }

  if (match.stage === "GROUP") {
    return {
      description,
      prediction: groupHighlights(match, options?.groupStandings),
      impact:
        getMatchStakes(match, options?.groupStandings ?? [], options?.groupMatches) ??
        `Points here moved the group table — and the knockout picture with it.`,
    };
  }

  return {
    description,
    prediction:
      getMatchForecast(match) ??
      `${teamLabel(match.homeTeam)} vs ${teamLabel(match.awayTeam)} is in the books. Expect the bracket to reshuffle and the losers' summer to end.`,
    impact: knockoutImpactRecap(match),
  };
}

export function previousMatchParagraphs(
  match: MatchInfo,
  options?: Parameters<typeof previousMatchBrief>[1]
): string[] {
  return nextEventParagraphs(previousMatchBrief(match, options));
}
