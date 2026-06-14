"use client";

import { SessionWatchLinks } from "@/components/f1/SessionWatchLinks";
import { cn } from "@/lib/utils";
import { formatLocalSessionTime } from "@/lib/f1-session-schedule";
import { getSessionWatchLinks } from "@/lib/f1-watch-links";
import type { F1SessionInfo } from "@/lib/f1-types";

interface SessionScheduleRowProps {
  session: F1SessionInfo;
  showDivider?: boolean;
  showWatch?: boolean;
}

const SESSION_TYPE_COLORS: Record<string, string> = {
  practice: "text-muted",
  qualifying: "text-link",
  sprint_qualifying: "text-amber-500",
  sprint: "text-amber-500",
  race: "text-[#E10600] font-semibold",
};

export function SessionScheduleRow({
  session,
  showDivider,
  showWatch = true,
}: SessionScheduleRowProps) {
  const isLive = session.status === "live";
  const finished = session.status === "finished";
  const timeLabel = isLive ? "Live" : formatLocalSessionTime(session.utcDate);
  const watchLinks = getSessionWatchLinks(session.gpName, session.circuit);

  return (
    <div className={cn("px-3 py-3 sm:px-4", showDivider && "border-t border-border")}>
      <div className="grid grid-cols-[3.25rem_1fr] items-start gap-3 sm:grid-cols-[4rem_1fr]">
        <div className="text-right">
          {isLive ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#E10600] sm:text-[13px]">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#E10600]" />
              Live
            </span>
          ) : (
            <span
              className={cn(
                "text-[13px] font-medium tabular-nums sm:text-[14px]",
                finished ? "text-muted" : "text-foreground"
              )}
            >
              {timeLabel}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p
            className={cn(
              "text-[14px] sm:text-[15px]",
              SESSION_TYPE_COLORS[session.sessionType] ?? "text-foreground"
            )}
          >
            {session.sessionLabel}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-muted sm:text-[13px]">
            {session.gpName} · {session.circuit}
          </p>
          {session.isSprintWeekend && session.sessionType === "sprint" && (
            <p className="mt-1 text-[11px] text-amber-500">Sprint weekend</p>
          )}
          {showWatch && (session.sessionType === "race" || session.sessionType === "qualifying") && (
            <SessionWatchLinks links={watchLinks} className="mt-2" compact />
          )}
        </div>
      </div>
    </div>
  );
}
