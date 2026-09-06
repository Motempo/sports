"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";
import { SeasonProgressRailScroller } from "@/components/ui/SeasonProgressRailScroller";
import { CURRENT_SPORT_SLUG, SPORTS, getSportsBySeasonGroup, type SportConfig } from "@/lib/sports";
import { cn } from "@/lib/utils";

interface SportSelectorProps {
  activeSportSlug?: string;
}

function resolveActiveSlug(pathname: string, propSlug?: string): string {
  if (propSlug) return propSlug;
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment && SPORTS.some((s) => s.slug === segment) ? segment : CURRENT_SPORT_SLUG;
}

function GroupLabel({ children }: { children: string }) {
  return (
    <span
      className="shrink-0 self-center px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:px-2.5 sm:text-[11px]"
      aria-hidden
    >
      {children}
    </span>
  );
}

function SportChip({ sport, activeSlug }: { sport: SportConfig; activeSlug: string }) {
  const isActive = sport.slug === activeSlug;
  const chipClass = cn(
    "flex shrink-0 flex-col items-center gap-1 rounded-full px-2.5 py-1.5 text-center sm:px-3",
    isActive && "bg-foreground/10 text-foreground",
    !isActive && sport.available && "text-muted hover:text-foreground",
    !sport.available && "cursor-default text-muted/60"
  );

  const inner = (
    <>
      <span
        className={cn(
          "flex h-2 w-2 rounded-full",
          isActive && "bg-foreground",
          !isActive && sport.available && "bg-border",
          !sport.available && "bg-border/60"
        )}
        aria-hidden
      />
      <span className="whitespace-nowrap text-[10px] font-semibold sm:text-[11px]">{sport.label}</span>
    </>
  );

  if (!sport.available) {
    return (
      <span className={chipClass} aria-disabled>
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={`/${sport.slug}`}
      data-rail-active={isActive ? "true" : undefined}
      aria-current={isActive ? "page" : undefined}
      className={chipClass}
    >
      {inner}
    </Link>
  );
}

export function SportSelector({ activeSportSlug }: SportSelectorProps) {
  const pathname = usePathname();
  const [suggestOpen, setSuggestOpen] = useState(false);
  const activeSlug = resolveActiveSlug(pathname, activeSportSlug);
  const currentSports = getSportsBySeasonGroup("current");
  const pastSports = getSportsBySeasonGroup("past");

  return (
    <>
      <nav className="relative min-w-0 flex-1" aria-label="Choose a sport">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-background to-transparent sm:w-7"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-background to-transparent sm:w-7"
          aria-hidden
        />

        <SeasonProgressRailScroller activeStepId={activeSlug} className="px-1">
          {currentSports.length > 0 ? <GroupLabel>Current season</GroupLabel> : null}
          {currentSports.map((sport) => (
            <SportChip key={sport.id} sport={sport} activeSlug={activeSlug} />
          ))}
          {pastSports.length > 0 ? <GroupLabel>Last season</GroupLabel> : null}
          {pastSports.map((sport) => (
            <SportChip key={sport.id} sport={sport} activeSlug={activeSlug} />
          ))}
          <button
            type="button"
            onClick={() => setSuggestOpen(true)}
            className="flex shrink-0 flex-col items-center gap-1 rounded-full px-2.5 py-1.5 text-muted transition-colors hover:text-foreground sm:px-3"
            aria-label="Suggest a sport"
          >
            <span className="flex h-2 w-2 items-center justify-center text-[9px] font-bold leading-none" aria-hidden>
              +
            </span>
            <span className="whitespace-nowrap text-[10px] font-semibold sm:text-[11px]">Suggest</span>
          </button>
        </SeasonProgressRailScroller>
      </nav>

      <BugReportDialog
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        mode="sport-request"
        currentSportSlug={activeSlug}
      />
    </>
  );
}
