"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MatchScheduleRow } from "@/components/bracket/MatchScheduleRow";
import { MatchDetailModal } from "@/components/sports/MatchDetailModal";
import {
  combineScheduleMatches,
  countDayGroupMatches,
  groupMatchesByLocalDay,
  selectScheduleMatches,
  selectSeasonTailMatches,
  sliceDayGroupsByMatchCount,
  type MatchDayGroup,
} from "@/lib/match-schedule";
import type { GroupStandings } from "@/lib/group-standings";
import type { MatchDataSource } from "@/lib/football-data";
import { formatMatchDataSource } from "@/lib/match-data-source";
import type { LeagueStandings, PremierLeagueRaceInsight } from "@/lib/premier-league-types";
import type { MatchInfo } from "@/lib/types";

const INITIAL_VISIBLE_MATCHES = 2;
const LOAD_MORE_MATCHES = 5;

interface ScheduleByDayProps {
  todayMatches: MatchInfo[];
  upcomingMatches: MatchInfo[];
  source: MatchDataSource;
  /** Matches to list in the day-grouped schedule (group stage or knockouts). */
  scheduleMatches?: MatchInfo[];
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  title?: string;
  /** When the forward window is empty, show the final stretch of finished matches. */
  showSeasonTailWhenEmpty?: boolean;
  /** How many fixtures to show before the first Load more click. */
  initialVisibleMatches?: number;
  /** How many additional fixtures each Load more click reveals. */
  loadMoreMatches?: number;
  leagueStandings?: LeagueStandings;
  titleRace?: PremierLeagueRaceInsight | null;
  relegationRace?: PremierLeagueRaceInsight | null;
}

function DayColumn({
  group,
  groupMatches,
  standings,
  onSelectMatch,
  timeZone,
}: {
  group: MatchDayGroup;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  onSelectMatch?: (match: MatchInfo) => void;
  timeZone?: string;
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
              onSelect={onSelectMatch}
              timeZone={timeZone}
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
  showSeasonTailWhenEmpty = false,
  initialVisibleMatches = INITIAL_VISIBLE_MATCHES,
  loadMoreMatches = LOAD_MORE_MATCHES,
  leagueStandings,
  titleRace,
  relegationRace,
}: ScheduleByDayProps) {
  const [visibleMatchCount, setVisibleMatchCount] = useState(initialVisibleMatches);
  const [selectedMatch, setSelectedMatch] = useState<MatchInfo | null>(null);
  // Always show kickoffs in the viewer's local timezone (not the league's home country).
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
    if (filtered.length > 0) {
      return groupMatchesByLocalDay(filtered, now, timeZone);
    }
    if (!showSeasonTailWhenEmpty) {
      return groupMatchesByLocalDay(filtered, now, timeZone);
    }
    const tail = selectSeasonTailMatches(raw);
    return groupMatchesByLocalDay(tail, now, timeZone, { includePastDays: true });
  }, [
    scheduleMatches,
    groupMatches,
    todayMatches,
    upcomingMatches,
    timeZone,
    showSeasonTailWhenEmpty,
  ]);

  const totalMatches = useMemo(() => countDayGroupMatches(dayGroups), [dayGroups]);

  useEffect(() => {
    setVisibleMatchCount(initialVisibleMatches);
  }, [dayGroups, initialVisibleMatches, timeZone]);

  const loadMore = useCallback(() => {
    setVisibleMatchCount((count) =>
      Math.min(count + loadMoreMatches, Math.max(totalMatches, count))
    );
  }, [loadMoreMatches, totalMatches]);

  const visibleGroups = useMemo(
    () => sliceDayGroupsByMatchCount(dayGroups, visibleMatchCount),
    [dayGroups, visibleMatchCount]
  );
  const hasMore = visibleMatchCount < totalMatches;

  if (dayGroups.length === 0 || totalMatches === 0) {
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
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {formatMatchDataSource(source)} · Times in your local timezone
            {hasMore ? " · Load more for later fixtures" : ""}
          </p>
        </div>

        <div
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
                onSelectMatch={setSelectedMatch}
                timeZone={timeZone}
              />
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              className="rounded-2xl border border-border bg-background px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface sm:text-[14px]"
            >
              Load more
            </button>
          </div>
        )}
      </div>
      <MatchDetailModal
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        groupMatches={groupMatches}
        standings={standings}
        leagueStandings={leagueStandings}
        titleRace={titleRace}
        relegationRace={relegationRace}
      />
    </section>
  );
}
