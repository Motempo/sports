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

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background transition-colors hover:bg-surface",
        compact ? "px-3 py-2" : "px-4 py-3"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <TeamCard
          team={match.homeTeam}
          isWinner={!!homeWinner}
          isLoser={!!homeLoser}
          compact
        />
        <div className="flex shrink-0 flex-col items-center px-2">
          {isLive && (
            <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-accent">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
              Live
            </span>
          )}
          <span className="text-[15px] font-bold tabular-nums">{display}</span>
        </div>
        <TeamCard
          team={match.awayTeam}
          isWinner={!!awayWinner}
          isLoser={!!awayLoser}
          compact
        />
      </div>
      <p className="mt-1.5 text-center text-[12px] text-muted">
        {match.venue}
        {match.city ? ` · ${match.city}` : ""} · {dateStr}
      </p>
    </div>
  );
}
