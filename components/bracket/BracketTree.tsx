"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
          <MatchCard match={match} compact showForecast />
        </div>
      ))}
    </div>
  );
}

function BracketRoundDesktop({
  round,
  matches,
}: {
  round: BracketRound;
  matches: MatchInfo[];
}) {
  if (matches.length === 0) return null;

  // Keep all Round of 32 games visible without scrolling past a split column.
  if (round === "R32") {
    return (
      <div className="flex flex-col gap-3">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          {getRoundLabel(round)}
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {matches.map((match) => (
            <div key={match.id} className="w-full min-w-[200px] max-w-[240px]">
              <MatchCard match={match} compact showForecast />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const half = Math.ceil(matches.length / 2);
  const left = matches.slice(0, half);
  const right = matches.slice(half);

  return (
    <div className="flex gap-12">
      <BracketColumn round={round} matches={left} side="left" />
      <BracketColumn round={round} matches={right} side="right" />
    </div>
  );
}

function DesktopBracket({ grouped }: { grouped: Record<BracketRound, MatchInfo[]> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState, grouped]);

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative hidden md:block">
      {canScrollLeft && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background via-background/80 to-transparent"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 shadow-md transition-colors hover:bg-surface"
            aria-label="Scroll bracket left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}

      {canScrollRight && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background via-background/80 to-transparent"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 shadow-md transition-colors hover:bg-surface"
            aria-label="Scroll bracket right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-hide overflow-x-auto pb-4"
      >
        <div className="mx-auto flex min-w-max items-start justify-center gap-6 px-4">
          {(["R32", "R16", "QF", "SF"] as BracketRound[]).map((round) => {
            const matches = grouped[round];
            if (!matches.length) return null;

            return <BracketRoundDesktop key={round} round={round} matches={matches} />;
          })}
          <BracketColumn round="FINAL" matches={grouped.FINAL} side="center" />
        </div>
      </div>

      {(canScrollLeft || canScrollRight) && (
        <p className="mt-1 text-center text-[11px] text-muted">
          Scroll or use arrows to see later rounds
        </p>
      )}
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
    <div className="md:hidden">
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
        {grouped[activeRound].length === 0 ? (
          <p className="px-3 py-6 text-center text-[14px] text-muted">
            No matches scheduled for this round yet.
          </p>
        ) : (
          grouped[activeRound].map((match) => (
            <MatchCard key={match.id} match={match} showForecast />
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
