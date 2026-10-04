"use client";

import type { ReactNode } from "react";
import { TeamEmblem } from "@/components/ui/TeamEmblem";
import { cn } from "@/lib/utils";
import { formatLocalMatchTime } from "@/lib/match-schedule";
import { getRoundLabel } from "@/lib/bracket-constants";
import { getMatchdayLabel, getMatchStakes } from "@/lib/match-context";
import type { GroupStandings } from "@/lib/group-standings";
import { presentTeamName, withDisplayedClubs } from "@/lib/club-display-name";
import { formatMatchVenueLine } from "@/lib/match-venue";
import { isMatchLive, isMatchPlayed } from "@/lib/match-status";
import type { MatchInfo } from "@/lib/types";

interface MatchScheduleRowProps {
  match: MatchInfo;
  showDivider?: boolean;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  showContext?: boolean;
  onSelect?: (match: MatchInfo) => void;
  timeZone?: string;
}

function formatGroupLabel(group?: string): string | null {
  if (!group) return null;
  return group.replace("GROUP_", "Group ");
}

function formatScore(home: number | null, away: number | null, status: MatchInfo["status"]) {
  const live = isMatchLive(status);
  const played = isMatchPlayed(status, home, away);

  if (!played) {
    return { display: "–", isLive: live };
  }

  return { display: `${home}–${away}`, isLive: live };
}

export function MatchScheduleRow({
  match,
  showDivider,
  groupMatches,
  standings,
  showContext,
  onSelect,
  timeZone,
}: MatchScheduleRowProps) {
  const shown = withDisplayedClubs(match);
  const homeName = presentTeamName(shown.homeTeam);
  const awayName = presentTeamName(shown.awayTeam);
  const { display, isLive } = formatScore(shown.homeScore, shown.awayScore, shown.status);
  const finished = shown.status === "FINISHED";
  const homeWinner = finished && shown.winnerCode === shown.homeTeam.code;
  const awayWinner = finished && shown.winnerCode === shown.awayTeam.code;
  const cancelled = shown.status === "CANCELLED" || shown.status === "POSTPONED";
  const interactive = !cancelled && !!onSelect;

  const timeLabel = isLive ? "Live" : formatLocalMatchTime(shown.utcDate, timeZone);
  const groupLabel = formatGroupLabel(shown.group);
  const roundLabel =
    shown.stage !== "GROUP" && shown.stage !== "LEAGUE" ? getRoundLabel(shown.round) : null;
  const matchday = showContext && groupMatches ? getMatchdayLabel(shown, groupMatches) : null;
  const stakes =
    showContext && standings ? getMatchStakes(shown, standings, groupMatches) : null;
  const venueLine = formatMatchVenueLine(shown);

  const inner: ReactNode = (
    <div className="grid grid-cols-[4.75rem_1fr_auto] items-center gap-3 sm:grid-cols-[5rem_1fr_auto]">
      <div className="text-right">
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-link sm:text-[13px]">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
            Live
          </span>
        ) : (
          <time
            dateTime={shown.utcDate}
            className="whitespace-nowrap text-[13px] font-medium tabular-nums text-muted sm:text-[14px]"
          >
            {timeLabel}
          </time>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <TeamEmblem team={shown.homeTeam} size={20} className="shrink-0" />
          <span
            className={cn(
              "truncate text-[14px] sm:text-[15px]",
              homeWinner && "font-semibold",
              finished && !homeWinner && shown.winnerCode && "text-muted"
            )}
            title={homeName}
          >
            {homeName}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <TeamEmblem team={shown.awayTeam} size={20} className="shrink-0" />
          <span
            className={cn(
              "truncate text-[14px] sm:text-[15px]",
              awayWinner && "font-semibold",
              finished && !awayWinner && shown.winnerCode && "text-muted"
            )}
            title={awayName}
          >
            {awayName}
          </span>
        </div>
        {(roundLabel || groupLabel || matchday) && (
          <p className="mt-1.5 truncate text-[12px] text-muted sm:text-[13px]">
            {[roundLabel, groupLabel, matchday].filter(Boolean).join(" · ")}
          </p>
        )}
        {stakes && (
          <p className="mt-1 text-[14px] font-bold leading-snug text-foreground sm:text-[15px]">
            {stakes}
          </p>
        )}
        {venueLine && (
          <p className="mt-1 text-[12px] text-muted sm:text-[13px]">{venueLine}</p>
        )}
      </div>

      <div className="min-w-[2.25rem] text-right text-[16px] font-extrabold tabular-nums sm:text-[17px]">
        {display}
      </div>
    </div>
  );

  const frameClass = cn(
    "w-full px-3 py-3 text-left sm:px-4",
    showDivider && "border-t border-border",
    interactive &&
      "cursor-pointer transition-colors hover:bg-surface active:bg-surface"
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={frameClass}
        onClick={() => onSelect?.(match)}
        aria-haspopup="dialog"
        aria-label={`Open details for ${homeName} vs ${awayName}`}
      >
        {inner}
      </button>
    );
  }

  return <div className={frameClass}>{inner}</div>;
}
