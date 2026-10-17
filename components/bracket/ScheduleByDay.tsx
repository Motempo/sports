"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scheduleZoneCaption, useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { MatchScheduleRow } from "@/components/bracket/MatchScheduleRow";
import { MatchDetailModal } from "@/components/sports/MatchDetailModal";
import {
  combineScheduleMatches,
  countDayGroupMatches,
  groupMatchesByLocalDay,
  selectScheduleMatches,
  selectSeasonTailMatches,
  countMatchDays,
  sliceDayGroupsByDayCount,
  sliceDayGroupsByMatchCount,
  type MatchDayGroup,
} from "@/lib/match-schedule";
import type { GroupStandings } from "@/lib/group-standings";
import type { MatchDataSource } from "@/lib/football-data";
import { formatMatchDataSource } from "@/lib/match-data-source";
import { LiveDataUnavailableNotice } from "@/components/tournament/LiveDataUnavailableNotice";
import type { LeagueStandings, PremierLeagueRaceInsight } from "@/lib/premier-league-types";
import type { MatchInfo } from "@/lib/types";

const INITIAL_VISIBLE_MATCHES = 2;
const LOAD_MORE_MATCHES = 5;
const LEAGUE_VISIBLE_DAYS = 3;

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
  /**
   * `league` shows the next match days in a compact grid.
   * `scroll` is the horizontal day scroller used by the World Cup.
   */
  variant?: "scroll" | "league";
  /** How many match days to show before Load more. League pages default to 3. */
  initialVisibleDays?: number;
  /** Drop the page-width section so this list can sit beside the next match. */
  embedded?: boolean;
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
  compact = false,
}: {
  group: MatchDayGroup;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  onSelectMatch?: (match: MatchInfo) => void;
  timeZone?: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <h3
        className={
          compact
            ? "mb-1.5 text-[12px] font-semibold text-foreground"
            : "mb-2 text-[13px] font-semibold text-foreground sm:text-[14px]"
        }
      >
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
              compact={compact}
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
  variant = "scroll",
  initialVisibleDays = LEAGUE_VISIBLE_DAYS,
  embedded = false,
  leagueStandings,
  titleRace,
  relegationRace,
}: ScheduleByDayProps) {
  const league = variant === "league";
  const [visibleMatchCount, setVisibleMatchCount] = useState(initialVisibleMatches);
  const [visibleDayCount, setVisibleDayCount] = useState(initialVisibleDays);
  const [selectedMatch, setSelectedMatch] = useState<MatchInfo | null>(null);
  // UTC until paint, then the viewer's zone — see useViewerTimeZone.
  const { timeZone, pending } = useViewerTimeZone();

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

  const matchDayCount = useMemo(() => countMatchDays(dayGroups), [dayGroups]);

  useEffect(() => {
    setVisibleMatchCount(initialVisibleMatches);
    setVisibleDayCount(initialVisibleDays);
  }, [dayGroups, initialVisibleDays, initialVisibleMatches, timeZone]);

  const loadMore = useCallback(() => {
    if (league) {
      setVisibleDayCount((count) => Math.min(count + initialVisibleDays, Math.max(matchDayCount, count)));
      return;
    }
    setVisibleMatchCount((count) =>
      Math.min(count + loadMoreMatches, Math.max(totalMatches, count))
    );
  }, [initialVisibleDays, league, loadMoreMatches, matchDayCount, totalMatches]);

  const visibleGroups = useMemo(
    () =>
      league
        ? sliceDayGroupsByDayCount(dayGroups, visibleDayCount)
        : sliceDayGroupsByMatchCount(dayGroups, visibleMatchCount),
    [dayGroups, league, visibleDayCount, visibleMatchCount]
  );
  const hasMore = league ? visibleDayCount < matchDayCount : visibleMatchCount < totalMatches;

  const modal = (
    <MatchDetailModal
      match={selectedMatch}
      onClose={() => setSelectedMatch(null)}
      groupMatches={groupMatches}
      standings={standings}
      leagueStandings={leagueStandings}
      titleRace={titleRace}
      relegationRace={relegationRace}
    />
  );

  const heading = (
    <div
      className={
        embedded
          ? "mb-2 flex flex-col gap-0.5"
          : "mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <h2 className={embedded ? "text-[17px] font-extrabold sm:text-[18px]" : "text-[18px] font-extrabold sm:text-[20px]"}>
        {title}
      </h2>
      <p className="text-[11px] text-muted sm:text-[12px]">
        {formatMatchDataSource(source)} · {scheduleZoneCaption(timeZone, pending)}
        {hasMore ? (league ? " · Show more for later days" : " · Load more for later fixtures") : ""}
      </p>
    </div>
  );

  if (dayGroups.length === 0 || totalMatches === 0) {
    const empty = (
      <>
        <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
        {source === "seed" ? <LiveDataUnavailableNotice /> : null}
        <p className="mt-2 text-[14px] text-muted">
          No live or scheduled matches in the next 30 days.
        </p>
      </>
    );
    if (embedded) return <div className="min-w-0">{empty}</div>;
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4">{empty}</div>
      </section>
    );
  }

  const moreButton = hasMore ? (
    <div className={league ? "mt-3" : "mt-4 flex justify-center"}>
      <button
        type="button"
        onClick={loadMore}
        className="w-full rounded-full border border-border py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface sm:text-[14px]"
      >
        {league ? "Show more days" : "Load more"}
      </button>
    </div>
  ) : null;

  if (league) {
    const list = (
      <div className="@container min-w-0">
        {heading}
        {source === "seed" ? <LiveDataUnavailableNotice /> : null}
        <div
          role="region"
          aria-label={`${title} by day`}
          className="grid grid-cols-1 gap-2.5 @xl:grid-cols-2 @2xl:grid-cols-3 @xl:gap-3"
        >
          {visibleGroups.map((group) => (
            <DayColumn
              key={group.dayKey}
              group={group}
              groupMatches={groupMatches}
              standings={standings}
              onSelectMatch={setSelectedMatch}
              timeZone={timeZone}
              compact
            />
          ))}
        </div>
        {moreButton}
        {modal}
      </div>
    );
    if (embedded) return list;
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4">{list}</div>
      </section>
    );
  }

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        {heading}
        {source === "seed" ? <LiveDataUnavailableNotice /> : null}

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

        {moreButton}
      </div>
      {modal}
    </section>
  );
}
