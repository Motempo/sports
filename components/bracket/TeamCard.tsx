"use client";

import { cn } from "@/lib/utils";
import type { TeamInfo } from "@/lib/types";
import { presentTeamName } from "@/lib/club-display-name";
import { formatKnockoutPlaceholder, isPlaceholderTeam } from "@/lib/match-context";
import { TeamEmblem } from "@/components/ui/TeamEmblem";

interface TeamCardProps {
  team: TeamInfo;
  isWinner?: boolean;
  isLoser?: boolean;
  compact?: boolean;
  align?: "left" | "right";
  /** Keep the full name visible inside a fixed column (featured match header). */
  wrapName?: boolean;
}

export function TeamCard({
  team,
  isWinner,
  isLoser,
  compact,
  align = "left",
  wrapName = false,
}: TeamCardProps) {
  const isPlaceholder = isPlaceholderTeam(team.code, team.name);
  const flagSize = compact ? 36 : 44;
  const visibleName = presentTeamName(team);
  const displayName = isPlaceholder
    ? formatKnockoutPlaceholder(team.code, team.name)
    : compact
      ? team.code || visibleName
      : visibleName;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        wrapName && "w-full min-w-0",
        align === "right" && "flex-row-reverse text-right",
        isWinner && "font-bold",
        isLoser && "opacity-60",
        compact ? "shrink-0" : ""
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
      <div className={cn("min-w-0", wrapName && "flex-1", align === "right" && "text-right")}>
        <p
          className={cn(
            "font-semibold",
            compact
              ? "whitespace-nowrap text-[11px] sm:text-[12px]"
              : wrapName
                ? "min-w-0 whitespace-normal break-words text-[13px] leading-tight"
                : "truncate text-[13px]",
            isPlaceholder && "text-muted"
          )}
          title={visibleName}
        >
          {displayName}
        </p>
        {!compact && !isPlaceholder && (team.confederation || team.fifaRank) && (
          <p className="text-[11px] text-muted">
            {team.confederation}
            {team.fifaRank ? ` · FIFA #${team.fifaRank}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
