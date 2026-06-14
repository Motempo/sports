"use client";

import { useMemo } from "react";
import { MatchScheduleRow } from "@/components/bracket/MatchScheduleRow";
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
        {group.matches.map((match, index) => (
          <MatchScheduleRow
            key={match.id}
            match={match}
            showDivider={index > 0}
            groupMatches={groupMatches}
            standings={standings}
            showContext={!!groupMatches && !!standings}
          />
        ))}
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
  const dayGroups = useMemo(() => {
    const scheduleMatches = groupMatches?.length
      ? selectScheduleMatches(groupMatches)
      : combineScheduleMatches(todayMatches, upcomingMatches);
    return groupMatchesByLocalDay(scheduleMatches);
  }, [groupMatches, todayMatches, upcomingMatches]);

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
          {dayGroups.map((group) => (
            <DayColumn
              key={group.dayKey}
              group={group}
              groupMatches={groupMatches}
              standings={standings}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
