"use client";

import { TeamEmblem } from "@/components/ui/TeamEmblem";
import { cn } from "@/lib/utils";
import { formatLocalMatchTime } from "@/lib/match-schedule";
import { getMatchdayLabel, getMatchStakes } from "@/lib/match-context";
import type { GroupStandings } from "@/lib/group-standings";
import type { MatchInfo } from "@/lib/types";

interface MatchScheduleRowProps {
  match: MatchInfo;
  showDivider?: boolean;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  showContext?: boolean;
}

function formatGroupLabel(group?: string): string | null {
  if (!group) return null;
  return group.replace("GROUP_", "Group ");
}

function formatScore(home: number | null, away: number | null, status: MatchInfo["status"]) {
  const isLive = status === "LIVE" || status === "IN_PLAY" || status === "PAUSED";
  const played = status === "FINISHED" || isLive;

  if (!played || home === null || away === null) {
    return { display: "–", isLive };
  }

  return { display: `${home}–${away}`, isLive };
}

export function MatchScheduleRow({
  match,
  showDivider,
  groupMatches,
  standings,
  showContext,
}: MatchScheduleRowProps) {
  const { display, isLive } = formatScore(match.homeScore, match.awayScore, match.status);
  const finished = match.status === "FINISHED";
  const homeWinner = finished && match.winnerCode === match.homeTeam.code;
  const awayWinner = finished && match.winnerCode === match.awayTeam.code;

  const timeLabel = isLive ? "Live" : formatLocalMatchTime(match.utcDate);
  const groupLabel = formatGroupLabel(match.group);
  const matchday = showContext && groupMatches ? getMatchdayLabel(match, groupMatches) : null;
  const stakes = showContext && standings ? getMatchStakes(match, standings) : null;
  const venueLine = [match.venue, match.city].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "px-3 py-3 sm:px-4",
        showDivider && "border-t border-border"
      )}
    >
      <div className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 sm:grid-cols-[4rem_1fr_auto]">
        <div className="text-right">
          {isLive ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-link sm:text-[12px]">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
              Live
            </span>
          ) : (
            <span className="text-[12px] font-medium tabular-nums text-muted sm:text-[13px]">
              {timeLabel}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TeamEmblem team={match.homeTeam} size={20} className="shrink-0" />
            <span
              className={cn(
                "truncate text-[13px] sm:text-[14px]",
                homeWinner && "font-semibold",
                finished && !homeWinner && match.winnerCode && "text-muted"
              )}
            >
              {match.homeTeam.name}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <TeamEmblem team={match.awayTeam} size={20} className="shrink-0" />
            <span
              className={cn(
                "truncate text-[13px] sm:text-[14px]",
                awayWinner && "font-semibold",
                finished && !awayWinner && match.winnerCode && "text-muted"
              )}
            >
              {match.awayTeam.name}
            </span>
          </div>
          {(groupLabel || matchday || stakes) && (
            <p className="mt-1.5 truncate text-[11px] text-muted sm:text-[12px]">
              {[groupLabel, matchday, stakes].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="min-w-[2.25rem] text-right text-[15px] font-extrabold tabular-nums sm:text-[16px]">
          {display}
        </div>
      </div>

      {venueLine && (
        <p className="mt-2 pl-[calc(3.25rem+0.75rem)] text-[11px] text-muted sm:pl-[calc(4rem+0.75rem)] sm:text-[12px]">
          {venueLine}
        </p>
      )}
    </div>
  );
}
