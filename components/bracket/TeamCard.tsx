"use client";

import { cn } from "@/lib/utils";
import type { TeamInfo } from "@/lib/types";
import { formatKnockoutPlaceholder, isPlaceholderTeam } from "@/lib/match-context";
import { TeamEmblem } from "@/components/ui/TeamEmblem";

interface TeamCardProps {
  team: TeamInfo;
  isWinner?: boolean;
  isLoser?: boolean;
  compact?: boolean;
  align?: "left" | "right";
}

export function TeamCard({
  team,
  isWinner,
  isLoser,
  compact,
  align = "left",
}: TeamCardProps) {
  const isPlaceholder = isPlaceholderTeam(team.code, team.name);
  const flagSize = compact ? 36 : 44;
  const displayName = isPlaceholder
    ? formatKnockoutPlaceholder(team.code, team.name)
    : compact
      ? team.code
      : team.name;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
        isWinner && "font-bold",
        isLoser && "opacity-60",
        compact ? "min-w-0 flex-1" : ""
      )}
    >
      {isPlaceholder ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface text-[9px] font-medium text-muted",
            compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-11 w-11"
          )}
        >
          ?
        </div>
      ) : (
        <TeamEmblem team={team} size={flagSize} />
      )}
      <div className={cn("min-w-0", align === "right" && "items-end")}>
        <p
          className={cn(
            "truncate font-semibold",
            compact ? "text-[11px] sm:text-[12px]" : "text-[13px]",
            isPlaceholder && "text-muted"
          )}
          title={team.name}
        >
          <span className="sm:hidden">{displayName}</span>
          <span className="hidden truncate sm:inline">{displayName}</span>
        </p>
        {!compact && !isPlaceholder && (
          <p className="text-[11px] text-muted">
            {team.confederation}
            {team.fifaRank ? ` · FIFA #${team.fifaRank}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
