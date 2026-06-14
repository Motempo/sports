import type { GroupStandings } from "@/lib/group-standings";
import type { MatchInfo } from "@/lib/types";
import { formatGroupLabel } from "@/lib/group-standings";

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

export function getMatchStakes(
  match: MatchInfo,
  standings: GroupStandings[]
): string | null {
  if (match.stage !== "GROUP" || !match.group) return null;

  const group = standings.find((g) => g.groupId === match.group);
  if (!group) return null;

  const home = group.rows.find((r) => r.team.code === match.homeTeam.code);
  const away = group.rows.find((r) => r.team.code === match.awayTeam.code);
  if (!home || !away) return null;

  if (match.status === "FINISHED") {
    return `${formatGroupLabel(match.group)} result — check standings for qualification`;
  }

  const homeNeed = home.position <= 2 ? "hold a qualifying spot" : home.position === 3 ? "fight for a best-3rd place spot" : "need points to stay alive";
  const awayNeed = away.position <= 2 ? "hold a qualifying spot" : away.position === 3 ? "fight for a best-3rd place spot" : "need points to stay alive";

  if (homeNeed === awayNeed) {
    return `Both teams ${homeNeed}`;
  }
  return `${match.homeTeam.code} ${homeNeed}; ${match.awayTeam.code} ${awayNeed}`;
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
