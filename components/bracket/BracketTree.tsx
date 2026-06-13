"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { BracketRound, MatchInfo } from "@/lib/types";
import { getRoundLabel, getRoundShortLabel, ROUND_ORDER } from "@/lib/bracket-constants";
import { MatchCard } from "./MatchCard";

interface BracketTreeProps {
  grouped: Record<BracketRound, MatchInfo[]>;
}

function BracketColumn({
  round,
  matches,
  side,
}: {
  round: BracketRound;
  matches: MatchInfo[];
  side: "left" | "right" | "center";
}) {
  if (matches.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        side === "center" && "items-center",
        side === "left" && "items-end",
        side === "right" && "items-start"
      )}
    >
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
        {getRoundLabel(round)}
      </p>
      {matches.map((match) => (
        <div key={match.id} className="w-full min-w-[200px] max-w-[240px]">
          <MatchCard match={match} compact />
        </div>
      ))}
    </div>
  );
}

function DesktopBracket({ grouped }: { grouped: Record<BracketRound, MatchInfo[]> }) {
  const splitMatches = (matches: MatchInfo[]) => {
    const half = Math.ceil(matches.length / 2);
    return { left: matches.slice(0, half), right: matches.slice(half) };
  };

  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto pb-4">
        <div className="mx-auto flex min-w-max items-center justify-center gap-6 px-4">
          {(["R32", "R16", "QF", "SF"] as BracketRound[]).map((round) => {
            const matches = grouped[round];
            if (!matches.length) return null;
            const { left, right } = splitMatches(matches);

            return (
              <div key={round} className="flex gap-12">
                <BracketColumn round={round} matches={left} side="left" />
                <BracketColumn round={round} matches={right} side="right" />
              </div>
            );
          })}
          <BracketColumn round="FINAL" matches={grouped.FINAL} side="center" />
        </div>
      </div>
    </div>
  );
}

function MobileBracket({ grouped }: { grouped: Record<BracketRound, MatchInfo[]> }) {
  const availableRounds = ROUND_ORDER.filter((r) => grouped[r].length > 0);
  const [activeRound, setActiveRound] = useState<BracketRound>(
    () => availableRounds[0] ?? "R32"
  );

  useEffect(() => {
    if (availableRounds.length > 0 && !availableRounds.includes(activeRound)) {
      setActiveRound(availableRounds[0]);
    }
  }, [grouped, activeRound, availableRounds]);

  return (
    <div className="lg:hidden">
      <div className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-1 overflow-x-auto border-b border-border px-3 sm:-mx-0 sm:px-4">
        {availableRounds.map((round) => (
          <button
            key={round}
            type="button"
            onClick={() => setActiveRound(round)}
            className={cn(
              "shrink-0 snap-start border-b-2 px-4 py-3 text-[13px] font-medium transition-colors",
              "min-h-[44px] whitespace-nowrap",
              activeRound === round
                ? "border-accent text-foreground"
                : "border-transparent text-muted active:text-foreground"
            )}
          >
            <span className="sm:hidden">{getRoundShortLabel(round)}</span>
            <span className="hidden sm:inline">{getRoundLabel(round)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-1 py-4 sm:px-0">
        {grouped[activeRound].length === 0 ? (
          <p className="px-3 py-6 text-center text-[14px] text-muted">
            No matches scheduled for this round yet.
          </p>
        ) : (
          grouped[activeRound].map((match) => (
            <MatchCard key={match.id} match={match} />
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
      <DesktopBracket grouped={grouped} />
      <MobileBracket grouped={grouped} />
    </>
  );
}
