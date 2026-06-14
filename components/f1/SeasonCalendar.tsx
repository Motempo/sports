import { cn } from "@/lib/utils";
import type { F1GrandPrix } from "@/lib/f1-types";

interface SeasonCalendarProps {
  calendar: F1GrandPrix[];
  highlightRound?: number;
}

function formatGpDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: F1GrandPrix["status"]): { label: string; className: string } {
  switch (status) {
    case "completed":
      return { label: "Done", className: "bg-muted/20 text-muted" };
    case "current":
      return { label: "This week", className: "bg-[#E10600]/15 text-[#E10600]" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-muted/20 text-muted line-through" };
    default:
      return { label: "Upcoming", className: "bg-link/10 text-link" };
  }
}

export function SeasonCalendar({ calendar, highlightRound }: SeasonCalendarProps) {
  if (calendar.length === 0) {
    return (
      <p className="text-[14px] text-muted">Race calendar will appear when the season is announced.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      {calendar.map((gp, index) => {
        const badge = statusBadge(gp.status);
        const isHighlight = gp.round === highlightRound || gp.status === "current";

        return (
          <div
            key={gp.round}
            className={cn(
              "flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5",
              index > 0 && "border-t border-border",
              isHighlight && "bg-[#E10600]/5"
            )}
          >
            <span className="w-8 shrink-0 text-[12px] font-bold text-muted sm:w-10 sm:text-[13px]">
              R{gp.round}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold sm:text-[15px]">{gp.name}</p>
              <p className="truncate text-[11px] text-muted sm:text-[12px]">
                {gp.circuit} · {gp.country}
                {gp.isSprintWeekend && " · Sprint"}
              </p>
              {gp.winner && (
                <p className="mt-0.5 text-[11px] text-muted sm:text-[12px]">
                  Winner:{" "}
                  <span className="font-medium text-foreground">
                    {gp.winnerCode ?? gp.winner}
                  </span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[12px] tabular-nums text-muted sm:text-[13px]">
                {formatGpDate(gp.date)}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[11px]",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LastRaceHighlight({
  gpName,
  results,
}: {
  gpName: string;
  results: Array<{ position: number; driverCode: string; constructorName: string }>;
}) {
  if (results.length === 0) return null;

  const podium = results.filter((r) => r.position <= 3);
  return (
    <div className="mb-4 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-3">
      <p className="text-[13px] font-semibold text-foreground sm:text-[14px]">
        Last race: {gpName}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {podium.map((r) => (
          <span
            key={r.driverCode}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium"
          >
            P{r.position} · {r.driverCode}
          </span>
        ))}
      </div>
    </div>
  );
}
