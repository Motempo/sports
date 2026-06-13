"use client";

import Image from "next/image";
import { cn, getFlagUrl } from "@/lib/utils";
import type { TeamInfo } from "@/lib/types";

interface TeamCardProps {
  team: TeamInfo;
  isWinner?: boolean;
  isLoser?: boolean;
  compact?: boolean;
}

export function TeamCard({ team, isWinner, isLoser, compact }: TeamCardProps) {
  const isTbd = team.code === "TBD" || team.name === "TBD";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isWinner && "font-bold",
        isLoser && "text-muted",
        compact ? "min-w-0 flex-1" : ""
      )}
    >
      {isTbd ? (
        <div className="h-8 w-8 shrink-0 rounded-full bg-border" />
      ) : (
        <Image
          src={team.crest ?? getFlagUrl(team.iso2, 32)}
          alt={`${team.name} flag`}
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          unoptimized
        />
      )}
      <div className="min-w-0">
        <p className={cn("truncate text-[13px]", compact && "text-[12px]")}>
          {team.shortName ?? team.name}
        </p>
        {!compact && team.fifaRank && (
          <p className="text-[11px] text-muted">FIFA #{team.fifaRank}</p>
        )}
      </div>
    </div>
  );
}
