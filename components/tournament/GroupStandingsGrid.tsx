"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { GroupStandings, QualificationZone } from "@/lib/group-standings";
import { TeamEmblem } from "@/components/ui/TeamEmblem";

interface GroupStandingsGridProps {
  standings: GroupStandings[];
}

const ZONE_STYLES: Record<QualificationZone, string> = {
  QUALIFIED: "border-l-2 border-l-emerald-500",
  THIRD_BUBBLE: "border-l-2 border-l-amber-500",
  ELIMINATED: "border-l-2 border-l-transparent opacity-70",
};
function GroupCard({ group }: { group: GroupStandings }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold">{group.groupLabel}</h3>
        <span className="text-[11px] text-muted">
          MD {group.matchday}/{group.totalMatchdays}
        </span>
      </div>
      <div className="space-y-1">
        {group.rows.map((row) => (
          <div
            key={row.team.code}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5",
              ZONE_STYLES[row.zone]
            )}
          >
            <span className="w-4 shrink-0 text-[11px] font-bold text-muted">{row.position}</span>
            <TeamEmblem team={row.team} size={20} className="!h-5 !w-5 border" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{row.team.code}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted">
              {row.points}pts · {row.goalDifference >= 0 ? "+" : ""}
              {row.goalDifference}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted">
        Top 2 qualify · 3rd may advance as one of the best 8
      </p>
    </div>
  );
}

export function GroupStandingsGrid({ standings }: GroupStandingsGridProps) {
  const [activeGroup, setActiveGroup] = useState(standings[0]?.groupId ?? "GROUP_A");

  if (standings.length === 0) {
    return (
      <p className="text-[14px] text-muted">Group standings will appear when the tournament begins.</p>
    );
  }

  const active = standings.find((g) => g.groupId === activeGroup) ?? standings[0];

  return (
    <div>
      <div className="scrollbar-hide -mx-3 mb-4 flex gap-1 overflow-x-auto border-b border-border px-3 lg:hidden sm:-mx-0 sm:px-0">
        {standings.map((g) => (
          <button
            key={g.groupId}
            type="button"
            onClick={() => setActiveGroup(g.groupId)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              activeGroup === g.groupId
                ? "border-link text-foreground"
                : "border-transparent text-muted"
            )}
          >
            {g.groupLabel.replace("Group ", "")}
          </button>
        ))}
      </div>

      <div className="lg:hidden">
        <GroupCard group={active} />
      </div>

      <div className="hidden grid-cols-2 gap-3 lg:grid xl:grid-cols-3">
        {standings.map((g) => (
          <GroupCard key={g.groupId} group={g} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Top 2 — qualified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 3rd — best-8 race
        </span>
      </div>
    </div>
  );
}
