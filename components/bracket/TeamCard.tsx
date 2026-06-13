"use client";

import Image from "next/image";
import { BadgeCheck } from "lucide-react";
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
  const isTbd = team.code === "TBD" || team.name === "TBD";
  const flagSize = compact ? 36 : 44;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
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
            compact ? "h-9 w-9" : "h-11 w-11"
          )}
        />
      ) : (
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full border-2 border-border bg-surface shadow-sm",
            compact ? "h-9 w-9" : "h-11 w-11"
          )}
        >
          <Image
            src={getFlagUrl(team.iso2, flagSize)}
            alt={`${team.name} flag`}
            width={flagSize}
            height={Math.round(flagSize * 0.75)}
            className="h-full w-full object-cover"
            unoptimized
          />
        </div>
      )}
      <div className={cn("min-w-0", align === "right" && "items-end")}>
        <p className={cn("truncate text-[13px] font-semibold", compact && "text-[12px]")}>
          {team.name}
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
