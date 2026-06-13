import type { ThirdPlaceRow } from "@/lib/group-standings";

interface ThirdPlaceTrackerProps {
  rows: ThirdPlaceRow[];
  cutlinePoints: number;
  cutlineGd: number;
}

export function ThirdPlaceTracker({ rows, cutlinePoints, cutlineGd }: ThirdPlaceTrackerProps) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-background p-3 sm:p-4">
      <h3 className="text-[13px] font-bold sm:text-[14px]">Best 8 third-place teams</h3>
      <p className="mt-1 text-[12px] text-muted">
        8 of 12 third-place teams advance. Current cut line:{" "}
        <span className="font-medium text-foreground">
          {cutlinePoints} pts, {cutlineGd >= 0 ? "+" : ""}
          {cutlineGd} GD
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.map((row) => (
          <span
            key={`${row.groupId}-${row.team.code}`}
            className={
              row.advances
                ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-foreground"
                : "rounded-full border border-border px-2.5 py-1 text-[11px] text-muted"
            }
          >
            {row.team.code} ({row.groupLabel.replace("Group ", "")}) · {row.points}pts
          </span>
        ))}
      </div>
    </div>
  );
}
