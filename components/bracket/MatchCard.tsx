"use client";

import { cn } from "@/lib/utils";
import type { MatchInfo } from "@/lib/types";
import {
  formatKnockoutPlaceholder,
  getMatchdayLabel,
  getMatchStakes,
  isKnockoutSlotCode,
  isPlaceholderTeam,
} from "@/lib/match-context";
import { getMatchForecast } from "@/lib/match-forecast";
import { MatchWatchLinks } from "@/components/bracket/MatchWatchLinks";
import { TeamEmblem } from "@/components/ui/TeamEmblem";
import { formatMatchVenueLine } from "@/lib/match-venue";
import type { GroupStandings } from "@/lib/group-standings";
import { TeamCard } from "./TeamCard";

interface MatchCardProps {
  match: MatchInfo;
  compact?: boolean;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  showContext?: boolean;
  showForecast?: boolean;
}

function getBracketTeamLabel(team: MatchInfo["homeTeam"]): string {
  if (isPlaceholderTeam(team.code, team.name)) {
    return formatKnockoutPlaceholder(team.code, team.name);
  }
  return team.code;
}

function formatScore(home: number | null, away: number | null, status: MatchInfo["status"]) {
  const isLive = status === "LIVE" || status === "IN_PLAY" || status === "PAUSED";
  const played = status === "FINISHED" || isLive;

  if (!played || home === null || away === null) {
    return { display: "–", isLive };
  }

  return { display: `${home} – ${away}`, isLive };
}

export function MatchCard({
  match,
  compact,
  groupMatches,
  standings,
  showContext,
  showForecast,
}: MatchCardProps) {
  const { display, isLive } = formatScore(match.homeScore, match.awayScore, match.status);
  const finished = match.status === "FINISHED";
  const homeWinner = finished && match.winnerCode === match.homeTeam.code;
  const awayWinner = finished && match.winnerCode === match.awayTeam.code;
  const homeLoser = finished && !homeWinner && match.winnerCode;
  const awayLoser = finished && !awayWinner && match.winnerCode;

  const date = new Date(match.utcDate);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const venueLine = formatMatchVenueLine(match);
  const matchday =
    showContext && groupMatches ? getMatchdayLabel(match, groupMatches) : null;
  const stakes =
    showContext && standings ? getMatchStakes(match, standings) : null;
  const forecast = showForecast ? getMatchForecast(match) : null;

  const homeLabel = getBracketTeamLabel(match.homeTeam);
  const awayLabel = getBracketTeamLabel(match.awayTeam);
  const homePlaceholder = isPlaceholderTeam(match.homeTeam.code, match.homeTeam.name);
  const awayPlaceholder = isPlaceholderTeam(match.awayTeam.code, match.awayTeam.name);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-background transition-colors active:bg-surface sm:hover:bg-surface",
        compact ? "px-2.5 py-2 sm:px-3 sm:py-2.5" : "px-3 py-3 sm:px-4 sm:py-3.5"
      )}
    >
      {compact ? (
        <div className="flex items-center justify-between gap-1">
          <div
            className={cn(
              "flex shrink-0 items-center gap-1",
              homeWinner && "font-bold",
              homeLoser && "opacity-60"
            )}
          >
            {homePlaceholder ? (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface text-[9px] font-medium text-muted">
                ?
              </div>
            ) : (
              <TeamEmblem team={match.homeTeam} size={28} />
            )}
            <span
              className={cn(
                "whitespace-nowrap text-[12px] font-semibold tabular-nums",
                homePlaceholder &&
                  !isKnockoutSlotCode(match.homeTeam.code) &&
                  "max-w-[4.5rem] truncate text-muted",
                homePlaceholder && isKnockoutSlotCode(match.homeTeam.code) && "text-muted"
              )}
              title={match.homeTeam.name}
            >
              {homeLabel}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-center px-0.5">
            {isLive && (
              <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-link">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
                Live
              </span>
            )}
            <span className="min-w-[2rem] text-center text-[15px] font-extrabold tabular-nums">
              {display}
            </span>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center gap-1",
              awayWinner && "font-bold",
              awayLoser && "opacity-60"
            )}
          >
            <span
              className={cn(
                "whitespace-nowrap text-[12px] font-semibold tabular-nums",
                awayPlaceholder &&
                  !isKnockoutSlotCode(match.awayTeam.code) &&
                  "max-w-[4.5rem] truncate text-muted",
                awayPlaceholder && isKnockoutSlotCode(match.awayTeam.code) && "text-muted"
              )}
              title={match.awayTeam.name}
            >
              {awayLabel}
            </span>
            {awayPlaceholder ? (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface text-[9px] font-medium text-muted">
                ?
              </div>
            ) : (
              <TeamEmblem team={match.awayTeam} size={28} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          <TeamCard
            team={match.homeTeam}
            isWinner={!!homeWinner}
            isLoser={!!homeLoser}
            align="left"
          />
          <div className="flex shrink-0 flex-col items-center px-0.5 sm:px-1">
            {isLive && (
              <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-link sm:text-[11px]">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
                Live
              </span>
            )}
            <span className="min-w-[2.5rem] text-center text-[16px] font-extrabold tabular-nums sm:min-w-[3rem] sm:text-[17px]">
              {display}
            </span>
          </div>
          <TeamCard
            team={match.awayTeam}
            isWinner={!!awayWinner}
            isLoser={!!awayLoser}
            align="right"
          />
        </div>
      )}
      <div className="mt-2 space-y-0.5 text-center text-[11px] leading-snug text-muted sm:text-[12px]">
        {matchday && <p className="font-medium text-foreground/80">{matchday}</p>}
        {stakes && (
          <p className="text-[13px] font-bold leading-snug text-foreground sm:text-[14px]">{stakes}</p>
        )}
        {forecast && (
          <p className="text-[11px] leading-snug text-foreground/80 sm:text-[12px]">{forecast}</p>
        )}
        {venueLine && <p className="break-words">{venueLine}</p>}
        {match.status !== "CANCELLED" && (
          <div className="flex justify-center pt-0.5">
            <MatchWatchLinks match={match} compact />
          </div>
        )}
        <p>{dateStr}</p>
      </div>
    </div>
  );
}
