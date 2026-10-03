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

function GroupLabel({ id, children }: { id: string; children: string }) {
  return (
    <span
      id={id}
      className="shrink-0 self-center px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:px-2.5 sm:text-[11px]"
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
      <span className="whitespace-nowrap text-[10px] font-semibold sm:text-[11px]">
        {sport.label}
        {!sport.available ? <span className="sr-only">, unavailable</span> : null}
      </span>
    </>
  );

  if (!sport.available) {
    // Non-widget: aria-disabled on a span is ignored. Expose the status as text.
    return (
      <span className={chipClass} aria-current={isActive ? "page" : undefined}>
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

function SportGroup({
  label,
  labelId,
  sports,
  activeSlug,
}: {
  label: string;
  labelId: string;
  sports: SportConfig[];
  activeSlug: string;
}) {
  if (sports.length === 0) return null;

  return (
    <div role="group" aria-labelledby={labelId} className="flex shrink-0 gap-1">
      <GroupLabel id={labelId}>{label}</GroupLabel>
      {/*
        Tailwind preflight sets list-style: none, which makes VoiceOver drop list
        semantics. The explicit role keeps the season a list.
      */}
      <ul role="list" className="m-0 flex shrink-0 list-none gap-1 p-0">
        {sports.map((sport) => (
          <li key={sport.id} className="flex shrink-0">
            <SportChip sport={sport} activeSlug={activeSlug} />
          </li>
        ))}
      </ul>
    </div>
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
          <SportGroup
            label="Current season"
            labelId="sport-group-current"
            sports={currentSports}
            activeSlug={activeSlug}
          />
          <SportGroup
            label="Last season"
            labelId="sport-group-past"
            sports={pastSports}
            activeSlug={activeSlug}
          />
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
