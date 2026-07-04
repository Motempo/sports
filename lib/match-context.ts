import {
  computeGroupStandings,
  computeThirdPlaceTracker,
  formatGroupLabel,
  type GroupStandingRow,
  type GroupStandings,
} from "@/lib/group-standings";
import type { MatchInfo } from "@/lib/types";

const MAX_STAKES = 200;

const LIVE_STATUSES = new Set<MatchInfo["status"]>(["LIVE", "IN_PLAY", "PAUSED"]);

export function getMatchdayLabel(match: MatchInfo, groupMatches: MatchInfo[]): string | null {
  if (!match.group) return null;
  const groupGames = groupMatches
    .filter((m) => m.group === match.group)
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const idx = groupGames.findIndex((m) => m.id === match.id);
  if (idx < 0) return null;
  const matchday = Math.min(3, Math.floor(idx / 2) + 1);
  return `Matchday ${matchday} of 3`;
}

function clampStakes(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_STAKES) return trimmed;
  const cut = trimmed.slice(0, MAX_STAKES - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 80 ? cut.slice(0, lastSpace) : cut}…`;
}

function ordinal(position: number): string {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return `${position}th`;
}

function findRow(group: GroupStandings | undefined, code: string): GroupStandingRow | undefined {
  return group?.rows.find((r) => r.team.code === code);
}

function thirdPlaceRank(
  code: string,
  standings: GroupStandings[]
): { rank: number; advances: boolean } | null {
  const row = computeThirdPlaceTracker(standings).rows.find((r) => r.team.code === code);
  if (!row) return null;
  return { rank: row.rank, advances: row.advances };
}

function gamesRemaining(team: GroupStandingRow): number {
  return Math.max(0, 3 - team.played);
}

function describeThirdPlace(code: string, standings: GroupStandings[]): string {
  const info = thirdPlaceRank(code, standings);
  if (!info) return `${code} sit 3rd`;
  if (info.advances) {
    return `${code} 3rd and rank ${info.rank}/12 among best thirds — on course to sneak through`;
  }
  return `${code} 3rd but only ${info.rank}/12 among thirds — outside the cut line right now`;
}

function describePositionShift(
  code: string,
  before: GroupStandingRow | undefined,
  after: GroupStandingRow,
  standings: GroupStandings[]
): string {
  const remaining = gamesRemaining(after);

  if (remaining === 0) {
    if (after.position <= 2) {
      return `${code} book a Round of 32 spot from ${ordinal(after.position)}`;
    }
    if (after.position === 3) {
      const info = thirdPlaceRank(code, standings);
      if (info?.advances) {
        return `${code} survive as one of the eight best third-place teams`;
      }
      return `${code} finish 3rd but miss the best-eight cut`;
    }
    return `${code} bow out in ${ordinal(after.position)}`;
  }

  if (!before) {
    return `${code} ${ordinal(after.position)} on ${after.points} pts`;
  }

  const delta = before.position - after.position;
  if (delta >= 2) return `${code} rocket to ${ordinal(after.position)} — knockout picture brightens`;
  if (delta === 1) return `${code} climb to ${ordinal(after.position)} (${after.points} pts)`;
  if (delta === -1) return `${code} slip to ${ordinal(after.position)} — nerves set in`;
  if (delta <= -2) return `${code} tumble to ${ordinal(after.position)} — long road back`;

  if (after.position === 1) return `${code} stay top on ${after.points} pts`;
  if (after.position === 2) return `${code} hold 2nd on ${after.points} pts`;
  if (after.position === 3) return describeThirdPlace(code, standings);
  return `${code} remain ${ordinal(after.position)} on ${after.points} pts`;
}

function describeFinishedStakes(
  match: MatchInfo,
  standings: GroupStandings[],
  groupMatches?: MatchInfo[]
): string {
  const group = standings.find((g) => g.groupId === match.group);
  if (!group || match.homeScore === null || match.awayScore === null) {
    return `${formatGroupLabel(match.group!)} result — see standings for the fallout`;
  }

  const preStandings = groupMatches
    ? computeGroupStandings(groupMatches.filter((m) => m.id !== match.id))
    : null;
  const preGroup = preStandings?.find((g) => g.groupId === match.group);

  const homeAfter = findRow(group, match.homeTeam.code);
  const awayAfter = findRow(group, match.awayTeam.code);
  if (!homeAfter || !awayAfter) {
    return `${formatGroupLabel(match.group!)} result — see standings for the fallout`;
  }

  const homeBefore = findRow(preGroup, match.homeTeam.code);
  const awayBefore = findRow(preGroup, match.awayTeam.code);

  const homeLine = describePositionShift(
    match.homeTeam.code,
    homeBefore,
    homeAfter,
    standings
  );
  const awayLine = describePositionShift(
    match.awayTeam.code,
    awayBefore,
    awayAfter,
    standings
  );

  const hs = match.homeScore;
  const as = match.awayScore;
  let opener = "";
  if (hs > as) opener = `${match.homeTeam.code} take the points`;
  else if (hs < as) opener = `${match.awayTeam.code} take the points`;
  else opener = `Honors even at ${hs}–${as}`;

  return clampStakes(`${opener}: ${homeLine}; ${awayLine}`);
}

function describeTeamOutlook(
  code: string,
  team: GroupStandingRow,
  group: GroupStandings,
  standings: GroupStandings[]
): string {
  const remaining = gamesRemaining(team);
  const thirdInGroup = group.rows.find((r) => r.position === 3);

  if (team.position === 1) {
    if (remaining === 0) return `${code} top the group and march on`;
    const chaser = group.rows.find((r) => r.position === 2);
    const gap = team.points - (chaser?.points ?? 0);
    if (gap === 0) return `${code} share top spot — a win steals the group lead`;
    return `${code} lead on ${team.points} pts — win to keep rivals at arm's length`;
  }

  if (team.position === 2) {
    if (remaining === 0) return `${code} qualify from 2nd place`;
    const gapToThird = team.points - (thirdInGroup?.points ?? 0);
    const gapToFirst = (group.rows.find((r) => r.position === 1)?.points ?? 0) - team.points;
    if (gapToThird === 0) {
      return `${code} level with 3rd on points — this game could flip the knockout race`;
    }
    if (gapToFirst <= 1 && remaining <= 1) {
      return `${code} can still win the group with the right result`;
    }
    if (gapToThird <= 1) {
      return `${code} cling to 2nd by a point — one slip and 3rd closes in`;
    }
    return `${code} 2nd on ${team.points} pts — solid, but nothing sealed yet`;
  }

  if (team.position === 3) {
    if (remaining === 0) {
      const info = thirdPlaceRank(code, standings);
      if (info?.advances) return `${code} sneak through as a best third`;
      return `${code} finish 3rd but fall short of the best-eight cut`;
    }
    return describeThirdPlace(code, standings);
  }

  if (team.position === 4) {
    const gapToThird = (thirdInGroup?.points ?? 0) - team.points;
    if (remaining === 0) return `${code} finish last and head home`;
    if (remaining === 1 && gapToThird >= 3) {
      return `${code} need a miracle from the basement`;
    }
    if (gapToThird <= 1) {
      return `${code} one point off 3rd — still alive in the scramble`;
    }
    return `${code} propping up the table — likely need to win out`;
  }

  return `${code} ${ordinal(team.position)} on ${team.points} pts`;
}

function describeUpcomingStakes(
  match: MatchInfo,
  standings: GroupStandings[],
  groupMatches?: MatchInfo[]
): string {
  const group = standings.find((g) => g.groupId === match.group);
  if (!group) return "";

  const home = findRow(group, match.homeTeam.code);
  const away = findRow(group, match.awayTeam.code);
  if (!home || !away) return "";

  const homeOutlook = describeTeamOutlook(match.homeTeam.code, home, group, standings);
  const awayOutlook = describeTeamOutlook(match.awayTeam.code, away, group, standings);

  if (home.position <= 2 && away.position <= 2 && home.played < 3) {
    return clampStakes(
      `Top-two tussle: ${match.homeTeam.code} and ${match.awayTeam.code} both eye a knockout ticket`
    );
  }

  if (home.position === 4 && away.position === 4) {
    return clampStakes(
      `Basement battle — ${match.homeTeam.code} and ${match.awayTeam.code} can't afford another loss`
    );
  }

  if (homeOutlook === awayOutlook) {
    return clampStakes(homeOutlook);
  }

  return clampStakes(`${homeOutlook}; ${awayOutlook}`);
}

function describeLiveStakes(
  match: MatchInfo,
  standings: GroupStandings[],
  groupMatches: MatchInfo[]
): string {
  const hs = match.homeScore ?? 0;
  const as = match.awayScore ?? 0;

  const projected = computeGroupStandings(
    groupMatches.map((m) =>
      m.id === match.id
        ? {
            ...m,
            status: "FINISHED" as const,
            homeScore: hs,
            awayScore: as,
            winnerCode:
              hs > as
                ? m.homeTeam.code
                : hs < as
                  ? m.awayTeam.code
                  : undefined,
          }
        : m
    )
  );

  const preGroup = standings.find((g) => g.groupId === match.group);
  const postGroup = projected.find((g) => g.groupId === match.group);
  if (!preGroup || !postGroup) {
    return describeUpcomingStakes(match, standings, groupMatches);
  }

  const homeBefore = findRow(preGroup, match.homeTeam.code);
  const homeAfter = findRow(postGroup, match.homeTeam.code);
  const awayBefore = findRow(preGroup, match.awayTeam.code);
  const awayAfter = findRow(postGroup, match.awayTeam.code);
  if (!homeBefore || !homeAfter || !awayBefore || !awayAfter) {
    return describeUpcomingStakes(match, standings, groupMatches);
  }

  const scoreLine =
    hs === as
      ? `Level at ${hs}-${as}`
      : hs > as
        ? `${match.homeTeam.code} lead ${hs}-${as}`
        : `${match.awayTeam.code} lead ${as}-${hs}`;

  const homeLine = describePositionShift(
    match.homeTeam.code,
    homeBefore,
    homeAfter,
    projected
  );
  const awayLine = describePositionShift(
    match.awayTeam.code,
    awayBefore,
    awayAfter,
    projected
  );

  return clampStakes(`${scoreLine} — if it holds: ${homeLine}; ${awayLine}`);
}

export function getMatchStakes(
  match: MatchInfo,
  standings: GroupStandings[],
  groupMatches?: MatchInfo[]
): string | null {
  if (match.stage !== "GROUP" || !match.group) return null;

  const group = standings.find((g) => g.groupId === match.group);
  if (!group) return null;

  const home = findRow(group, match.homeTeam.code);
  const away = findRow(group, match.awayTeam.code);
  if (!home || !away) return null;

  if (match.status === "FINISHED") {
    return describeFinishedStakes(match, standings, groupMatches);
  }

  if (LIVE_STATUSES.has(match.status) && groupMatches) {
    return describeLiveStakes(match, standings, groupMatches);
  }

  return describeUpcomingStakes(match, standings, groupMatches);
}

export function isKnockoutSlotCode(code: string): boolean {
  return /^[12][A-L]$/.test(code) || /^W\d+$/.test(code) || /^L\d+$/.test(code) || code === "3RD";
}

export function formatKnockoutPlaceholder(code: string, name: string): string {
  if (isKnockoutSlotCode(code)) return code === "3RD" ? "3rd" : code;

  const winnerGroup = name.match(/^Winner · Group ([A-L])$/);
  if (winnerGroup) return `1${winnerGroup[1]}`;

  const runnerGroup = name.match(/^Runner-up · Group ([A-L])$/);
  if (runnerGroup) return `2${runnerGroup[1]}`;

  const winnerKnockout = name.match(/^Winner · (?:R32|QF|Semi) (\d+)$/);
  if (winnerKnockout) return `W${winnerKnockout[1]}`;

  const winnerMatch = name.match(/^Winner Match (\d+)$/);
  if (winnerMatch) return `W${winnerMatch[1]}`;

  const loserMatch = name.match(/^Loser Match (\d+)$/);
  if (loserMatch) return `L${loserMatch[1]}`;

  if (code !== "TBD" && name !== "TBD") return name;
  return name !== "TBD" ? name : "TBD";
}

export function isPlaceholderTeam(code: string, name: string): boolean {
  if (isKnockoutSlotCode(code)) return true;
  return code === "TBD" || name === "TBD" || name.startsWith("Winner") || name.startsWith("Runner-up") || name.startsWith("3rd");
}
