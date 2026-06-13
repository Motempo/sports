"use client";

import { cn } from "@/lib/utils";
import type { MatchInfo } from "@/lib/types";
import { TeamCard } from "./TeamCard";

interface MatchCardProps {
  match: MatchInfo;
  compact?: boolean;
}

function formatScore(home: number | null, away: number | null, status: MatchInfo["status"]) {
  const isLive = status === "LIVE" || status === "IN_PLAY" || status === "PAUSED";
  const played = status === "FINISHED" || isLive;

  if (!played || home === null || away === null) {
    return { display: "–", isLive };
  }

  return { display: `${home} – ${away}`, isLive };
}

export function MatchCard({ match, compact }: MatchCardProps) {
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

  const venueLine = [match.venue, match.city].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-background transition-colors active:bg-surface sm:hover:bg-surface",
        compact ? "px-2.5 py-2 sm:px-3 sm:py-2.5" : "px-3 py-3 sm:px-4 sm:py-3.5"
      )}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        <TeamCard
          team={match.homeTeam}
          isWinner={!!homeWinner}
          isLoser={!!homeLoser}
          compact
          align="left"
        />
        <div className="flex shrink-0 flex-col items-center px-0.5 sm:px-1">
          {isLive && (
            <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-accent sm:text-[11px]">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
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
          compact
          align="right"
        />
      </div>
      <div className="mt-2 space-y-0.5 text-center text-[11px] leading-snug text-muted sm:text-[12px]">
        <p className="break-words">{venueLine}</p>
        <p>{dateStr}</p>
      </div>
    </div>
  );
}
