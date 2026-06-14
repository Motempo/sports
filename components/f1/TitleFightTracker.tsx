import type { F1TitleFightInsight } from "@/lib/f1-types";

interface TitleFightTrackerProps {
  insight: F1TitleFightInsight | null;
}

export function TitleFightTracker({ insight }: TitleFightTrackerProps) {
  if (!insight) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-background p-3 sm:p-4">
      <h3 className="text-[13px] font-bold sm:text-[14px]">Title fight</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-muted sm:text-[13px]">
        {insight.message}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-[#E10600]/40 bg-[#E10600]/10 px-2.5 py-1 text-[11px] font-medium text-foreground">
          P1 · {insight.leaderName.split(" ").pop()} · {insight.leaderPoints} pts
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
          P2 · {insight.challengerName.split(" ").pop()} · {insight.challengerPoints} pts
        </span>
        {insight.racesRemaining > 0 && (
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
            {insight.racesRemaining} race{insight.racesRemaining !== 1 ? "s" : ""} left
          </span>
        )}
      </div>
    </div>
  );
}
