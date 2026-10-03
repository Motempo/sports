"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionScheduleRow } from "@/components/f1/SessionScheduleRow";
import { scheduleZoneCaption, useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { useColumnsPerRow } from "@/hooks/use-columns-per-row";
import {
  groupSessionsByLocalDay,
  selectWeekendSessions,
  type F1SessionDayGroup,
} from "@/lib/f1-session-schedule";
import type { F1GrandPrix, F1SessionInfo } from "@/lib/f1-types";
import { formatCalendarDate } from "@/lib/match-timezone";

interface WeekendSessionsByDayProps {
  sessions: F1SessionInfo[];
  source: "api" | "seed";
  nextGp?: F1GrandPrix | null;
  title?: string;
}

function DayColumn({ group, timeZone }: { group: F1SessionDayGroup; timeZone: string }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-[13px] font-semibold text-foreground sm:text-[14px]">
        {group.label}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {group.sessions.length === 0 ? (
          <p className="px-3 py-4 text-[13px] text-muted sm:px-4">No sessions today.</p>
        ) : (
          group.sessions.map((session, index) => (
            <SessionScheduleRow
              key={session.id}
              session={session}
              showDivider={index > 0}
              timeZone={timeZone}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BreakMessage({ nextGp }: { nextGp?: F1GrandPrix | null }) {
  const nextLine =
    nextGp && (nextGp.status === "upcoming" || nextGp.status === "current")
      ? ` Next up: ${nextGp.name} on ${formatCalendarDate(nextGp.date)}.`
      : "";

  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-5">
      <p className="text-[14px] font-semibold text-foreground sm:text-[15px]">
        Teams are taking a break
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted sm:text-[14px]">
        Nothing on the schedule this weekend — the paddock is between race meetings.
        {nextLine}
      </p>
    </div>
  );
}

export function WeekendSessionsByDay({
  sessions,
  source,
  nextGp = null,
  title = "This Weekend",
}: WeekendSessionsByDayProps) {
  const columnsPerRow = useColumnsPerRow();
  const [visibleRows, setVisibleRows] = useState(1);
  const { timeZone, pending } = useViewerTimeZone();
  const zoneCaption = scheduleZoneCaption(timeZone, pending);

  const dayGroups = useMemo(() => {
    const now = new Date();
    const selected = selectWeekendSessions(sessions, now, timeZone);
    return groupSessionsByLocalDay(selected, now, timeZone);
  }, [sessions, timeZone]);

  const hasSessionsToShow = dayGroups.some((group) => group.sessions.length > 0);

  useEffect(() => {
    setVisibleRows(1);
  }, [dayGroups.length]);

  if (!hasSessionsToShow) {
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
          <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
            <p className="text-[11px] text-muted sm:text-[12px]">
              {source === "api" ? "Live data" : "Preview data"} · {zoneCaption}
            </p>
          </div>
          <BreakMessage nextGp={nextGp} />
        </div>
      </section>
    );
  }

  const rows: F1SessionDayGroup[][] = [];
  for (let i = 0; i < dayGroups.length; i += columnsPerRow) {
    rows.push(dayGroups.slice(i, i + columnsPerRow));
  }

  const visible = rows.slice(0, visibleRows);
  const hasMore = visibleRows < rows.length;

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {source === "api" ? "Live data" : "Preview data"} · {zoneCaption}
          </p>
        </div>

        <div className="space-y-4">
          {visible.map((row) => (
            <div
              key={row.map((g) => g.dayKey).join("-")}
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(columnsPerRow, row.length)}, minmax(0, 1fr))`,
              }}
            >
              {row.map((group) => (
                <DayColumn key={group.dayKey} group={group} timeZone={timeZone} />
              ))}
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleRows((v) => v + 1)}
            className="mt-4 w-full rounded-full border border-border py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface active:bg-surface/80 sm:text-[14px]"
          >
            Show more days
          </button>
        )}
      </div>
    </section>
  );
}
