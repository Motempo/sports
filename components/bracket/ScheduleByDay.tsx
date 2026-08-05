"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MatchScheduleRow } from "@/components/bracket/MatchScheduleRow";
import { useColumnsPerRow } from "@/hooks/use-columns-per-row";
import {
  combineScheduleMatches,
  groupMatchesByLocalDay,
  selectScheduleMatches,
  type MatchDayGroup,
} from "@/lib/match-schedule";
import type { GroupStandings } from "@/lib/group-standings";
import type { MatchDataSource } from "@/lib/football-data";
import { formatMatchDataSource } from "@/lib/match-data-source";
import type { MatchInfo } from "@/lib/types";

interface ScheduleByDayProps {
  todayMatches: MatchInfo[];
  upcomingMatches: MatchInfo[];
  source: MatchDataSource;
  /** Matches to list in the day-grouped schedule (group stage or knockouts). */
  scheduleMatches?: MatchInfo[];
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  title?: string;
}

function DayColumn({
  group,
  groupMatches,
  standings,
}: {
  group: MatchDayGroup;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-[13px] font-semibold text-foreground sm:text-[14px]">
        {group.label}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {group.matches.length === 0 ? (
          <p className="px-3 py-4 text-[13px] text-muted sm:px-4">No matches today.</p>
        ) : (
          group.matches.map((match, index) => (
            <MatchScheduleRow
              key={match.id}
              match={match}
              showDivider={index > 0}
              groupMatches={groupMatches}
              standings={standings}
              showContext={!!groupMatches && !!standings}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function ScheduleByDay({
  todayMatches,
  upcomingMatches,
  source,
  scheduleMatches,
  groupMatches,
  standings,
  title = "Matches",
}: ScheduleByDayProps) {
  const columnsPerRow = useColumnsPerRow();
  const [visibleCount, setVisibleCount] = useState(1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const dayGroups = useMemo(() => {
    const now = new Date();
    const raw =
      scheduleMatches ??
      (groupMatches?.length
        ? groupMatches
        : combineScheduleMatches(todayMatches, upcomingMatches));
    const filtered = selectScheduleMatches(raw, now, timeZone);
    return groupMatchesByLocalDay(filtered, now, timeZone);
  }, [scheduleMatches, groupMatches, todayMatches, upcomingMatches, timeZone]);

  useEffect(() => {
    setVisibleCount(Math.max(columnsPerRow, 1));
  }, [dayGroups.length, columnsPerRow, timeZone]);

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + columnsPerRow, dayGroups.length));
  }, [columnsPerRow, dayGroups.length]);

  const visibleGroups = dayGroups.slice(0, visibleCount);
  const hasMore = visibleCount < dayGroups.length;

  useEffect(() => {
    const root = scrollerRef.current;
    const target = loadMoreRef.current;
    if (!root || !target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      {
        root,
        rootMargin: "0px 160px 0px 0px",
        threshold: 0,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, visibleCount]);

  if (dayGroups.length === 0) {
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
          <p className="mt-2 text-[14px] text-muted">
            No live or scheduled matches in the next 30 days.
            {source === "seed"
              ? " Match data is temporarily unavailable — refresh shortly or check back during the tournament."
              : ""}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {formatMatchDataSource(source)} · Times in your local timezone
            {dayGroups.length > columnsPerRow ? " · Scroll for more days" : ""}
          </p>
        </div>

        <div
          ref={scrollerRef}
          role="region"
          aria-label={`${title} by day`}
          className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-3 pb-1 touch-pan-x sm:-mx-0 sm:px-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {visibleGroups.map((group) => (
            <div
              key={group.dayKey}
              className="w-[min(100%,20rem)] shrink-0 snap-start sm:w-[22rem]"
            >
              <DayColumn
                group={group}
                groupMatches={groupMatches}
                standings={standings}
              />
            </div>
          ))}

          {hasMore && (
            <div
              ref={loadMoreRef}
              className="flex w-20 shrink-0 snap-start items-center justify-center"
              aria-hidden
            >
              <span className="text-[11px] font-medium text-muted">More…</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
