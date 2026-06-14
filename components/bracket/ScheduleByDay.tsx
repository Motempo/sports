"use client";

import { useEffect, useMemo, useState } from "react";
import { MatchScheduleRow } from "@/components/bracket/MatchScheduleRow";
import { useColumnsPerRow } from "@/hooks/use-columns-per-row";
import {
  combineScheduleMatches,
  groupMatchesByLocalDay,
  selectScheduleMatches,
  type MatchDayGroup,
} from "@/lib/match-schedule";
import type { GroupStandings } from "@/lib/group-standings";
import type { MatchInfo } from "@/lib/types";

interface ScheduleByDayProps {
  todayMatches: MatchInfo[];
  upcomingMatches: MatchInfo[];
  source: "api" | "seed";
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
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
  groupMatches,
  standings,
}: ScheduleByDayProps) {
  const columnsPerRow = useColumnsPerRow();
  const [visibleRows, setVisibleRows] = useState(1);
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const dayGroups = useMemo(() => {
    const now = new Date();
    const raw = groupMatches?.length
      ? groupMatches
      : combineScheduleMatches(todayMatches, upcomingMatches);
    const scheduleMatches = selectScheduleMatches(raw, now, timeZone);
    return groupMatchesByLocalDay(scheduleMatches, now, timeZone);
  }, [groupMatches, todayMatches, upcomingMatches, timeZone]);

  useEffect(() => {
    setVisibleRows(1);
  }, [dayGroups.length, timeZone]);

  const visibleCount = Math.min(visibleRows * columnsPerRow, dayGroups.length);
  const visibleGroups = dayGroups.slice(0, visibleCount);
  const hasMore = visibleCount < dayGroups.length;

  if (dayGroups.length === 0) {
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Matches</h2>
          <p className="mt-2 text-[14px] text-muted">
            No live or scheduled matches yet.
            {source === "seed" ? " Add FOOTBALL_DATA_API_KEY on Vercel for real fixtures." : ""}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Matches</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {source === "api" ? "Live data" : "Preview data"} · Times in your local timezone
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start md:gap-5 xl:grid-cols-3">
          {visibleGroups.map((group) => (
            <DayColumn
              key={group.dayKey}
              group={group}
              groupMatches={groupMatches}
              standings={standings}
            />
          ))}
        </div>

        {hasMore && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleRows((rows) => rows + 1)}
              className="min-h-[44px] rounded-xl border border-border bg-background px-5 text-[15px] font-medium text-link transition-colors hover:bg-surface active:bg-surface"
            >
              Show more games
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
