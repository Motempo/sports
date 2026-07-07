"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { BracketRound, MatchInfo } from "@/lib/types";
import { getRoundLabel, getRoundShortLabel, ROUND_ORDER } from "@/lib/bracket-constants";
import { sortRoundByPathway } from "@/lib/knockout-bracket-layout";
import { BracketZoomView } from "./BracketZoomView";
import { MatchCard } from "./MatchCard";

interface BracketTreeProps {
  grouped: Record<BracketRound, MatchInfo[]>;
}

function MobileBracket({ grouped }: { grouped: Record<BracketRound, MatchInfo[]> }) {
  const sortedGrouped = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(grouped).map(([round, matches]) => [
          round,
          sortRoundByPathway(matches),
        ])
      ) as Record<BracketRound, MatchInfo[]>,
    [grouped]
  );

  const availableRounds = ROUND_ORDER.filter((r) => sortedGrouped[r].length > 0);
  const hasThird = (sortedGrouped.THIRD?.length ?? 0) > 0;
  const mobileRounds = useMemo(
    () => (hasThird ? [...availableRounds, "THIRD" as BracketRound] : availableRounds),
    [availableRounds, hasThird]
  );

  const [activeRound, setActiveRound] = useState<BracketRound>(
    () => mobileRounds[0] ?? "R32"
  );

  useEffect(() => {
    if (mobileRounds.length > 0 && !mobileRounds.includes(activeRound)) {
      setActiveRound(mobileRounds[0]);
    }
  }, [sortedGrouped, activeRound, mobileRounds]);

  return (
    <div className="lg:hidden">
      <div className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-1 overflow-x-auto border-b border-border px-3 sm:-mx-0 sm:px-4">
        {mobileRounds.map((round) => (
          <button
            key={round}
            type="button"
            onClick={() => setActiveRound(round)}
            className={cn(
              "shrink-0 snap-start border-b-2 px-4 py-3 text-[13px] font-medium transition-colors",
              "min-h-[44px] whitespace-nowrap",
              activeRound === round
                ? "border-link text-foreground"
                : "border-transparent text-muted active:text-foreground"
            )}
          >
            <span className="sm:hidden">{getRoundShortLabel(round)}</span>
            <span className="hidden sm:inline">{getRoundLabel(round)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-1 py-4 sm:px-0">
        {sortedGrouped[activeRound].length === 0 ? (
          <p className="px-3 py-6 text-center text-[14px] text-muted">
            No matches scheduled for this round yet.
          </p>
        ) : (
          sortedGrouped[activeRound].map((match) => (
            <MatchCard key={match.id} match={match} compact />
          ))
        )}
      </div>
    </div>
  );
}

export function BracketTree({ grouped }: BracketTreeProps) {
  const totalMatches = Object.values(grouped).flat().length;

  if (totalMatches === 0) {
    return (
      <p className="px-4 py-8 text-center text-[14px] text-muted">
        Bracket data will appear as the tournament approaches.
      </p>
    );
  }

  return (
    <>
      <BracketZoomView grouped={grouped} />
      <MobileBracket grouped={grouped} />
    </>
  );
}
