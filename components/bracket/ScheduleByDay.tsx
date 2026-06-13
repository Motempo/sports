"use client";

import { MatchScheduleRow } from "@/components/bracket/MatchScheduleRow";
import { combineScheduleMatches, groupMatchesByLocalDay } from "@/lib/match-schedule";
import type { GroupStandings } from "@/lib/group-standings";
import type { MatchInfo } from "@/lib/types";

interface ScheduleByDayProps {
  todayMatches: MatchInfo[];
  upcomingMatches: MatchInfo[];
  source: "api" | "seed";
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
}

export function ScheduleByDay({
  todayMatches,
  upcomingMatches,
  source,
  groupMatches,
  standings,
}: ScheduleByDayProps) {
  const scheduleMatches = combineScheduleMatches(todayMatches, upcomingMatches);
  const dayGroups = groupMatchesByLocalDay(scheduleMatches);

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

        <div className="space-y-6">
          {dayGroups.map((group) => (
            <div key={group.dayKey}>
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
          ))}
        </div>
      </div>
    </section>
  );
}
