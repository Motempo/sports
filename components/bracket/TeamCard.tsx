"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, getFlagUrl } from "@/lib/utils";
import type { TeamInfo } from "@/lib/types";

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
  const [flagError, setFlagError] = useState(false);
  const isTbd = team.code === "TBD" || team.name === "TBD";
  const flagSize = compact ? 32 : 44;
  const displayName = compact && !isTbd ? team.code : team.name;

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
      {isTbd ? (
        <div
          className={cn(
            "shrink-0 rounded-full bg-border",
            compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-11 w-11"
          )}
        />
      ) : flagError ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface text-[10px] font-bold text-muted",
            compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-11 w-11"
          )}
        >
          {team.code.slice(0, 3)}
        </div>
      ) : (
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full border-2 border-border bg-surface shadow-sm",
            compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-11 w-11"
          )}
        >
          <Image
            src={getFlagUrl(team.iso2, flagSize)}
            alt={`${team.name} flag`}
            width={flagSize}
            height={Math.round(flagSize * 0.75)}
            className="h-full w-full object-cover"
            unoptimized
            onError={() => setFlagError(true)}
          />
        </div>
      )}
      <div className={cn("min-w-0", align === "right" && "items-end")}>
        <p
          className={cn(
            "truncate font-semibold",
            compact ? "text-[11px] sm:text-[12px]" : "text-[13px]"
          )}
          title={team.name}
        >
          <span className="sm:hidden">{displayName}</span>
          <span className="hidden truncate sm:inline">{team.name}</span>
        </p>
        {!compact && !isTbd && (
          <p className="text-[11px] text-muted">
            {team.confederation}
            {team.fifaRank ? ` · FIFA #${team.fifaRank}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
