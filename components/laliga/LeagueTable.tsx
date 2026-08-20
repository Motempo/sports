"use client";

import { TeamEmblem } from "@/components/ui/TeamEmblem";
import { cn } from "@/lib/utils";
import type { LeagueStandingRow, LeagueStandings, LeagueZone } from "@/lib/la-liga-types";

interface LeagueTableProps {
  standings: LeagueStandings;
}

const ZONE_STYLES: Record<LeagueZone, string> = {
  CHAMPIONS_LEAGUE: "border-l-2 border-l-blue-500",
  EUROPA_LEAGUE: "border-l-2 border-l-orange-500",
  CONFERENCE_LEAGUE: "border-l-2 border-l-emerald-500",
  MID_TABLE: "border-l-2 border-l-transparent",
  RELEGATION: "border-l-2 border-l-rose-500",
};

function FormDots({ form }: { form: LeagueStandingRow["form"] }) {
  if (form.length === 0) return null;
  return (
    <div className="hidden items-center gap-0.5 sm:flex">
      {[...form].reverse().map((result, i) => (
        <span
          key={`${result}-${i}`}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold",
            result === "W" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
            result === "D" && "bg-muted/40 text-muted",
            result === "L" && "bg-rose-500/20 text-rose-600 dark:text-rose-400"
          )}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

export function LeagueTable({ standings }: LeagueTableProps) {
  if (standings.rows.length === 0) {
    return (
      <p className="text-[14px] text-muted">League table will appear when the season begins.</p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] text-muted">
        <span>
          Matchday {standings.matchday}/{standings.totalMatchdays}
        </span>
        <span className="tabular-nums">{standings.seasonLabel}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem_2.5rem_2.75rem] gap-1 border-b border-border px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3rem_5.5rem] sm:gap-2 sm:px-3 sm:text-[11px]">
          <span>#</span>
          <span>Club</span>
          <span className="text-right">P</span>
          <span className="hidden text-right sm:block">W</span>
          <span className="hidden text-right sm:block">D</span>
          <span className="hidden text-right sm:block">L</span>
          <span className="text-right">GD</span>
          <span className="text-right">Pts</span>
          <span className="hidden text-right sm:block">Form</span>
        </div>

        {standings.rows.map((row, index) => (
          <div
            key={row.team.code}
            className={cn(
              "grid grid-cols-[2rem_minmax(0,1fr)_2rem_2.5rem_2.75rem] items-center gap-1 px-2 py-2 sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3rem_5.5rem] sm:gap-2 sm:px-3 sm:py-2.5",
              ZONE_STYLES[row.zone],
              index > 0 && "border-t border-border"
            )}
          >
            <span className="text-[12px] font-bold tabular-nums text-muted sm:text-[13px]">
              {row.position}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <TeamEmblem team={row.team} size={20} rounded="md" />
              <span className="truncate text-[13px] font-semibold sm:text-[14px]">
                <span className="sm:hidden">{row.team.shortName ?? row.team.name}</span>
                <span className="hidden sm:inline">{row.team.name}</span>
              </span>
            </div>
            <span className="text-right text-[12px] tabular-nums text-muted sm:text-[13px]">
              {row.played}
            </span>
            <span className="hidden text-right text-[12px] tabular-nums text-muted sm:block sm:text-[13px]">
              {row.won}
            </span>
            <span className="hidden text-right text-[12px] tabular-nums text-muted sm:block sm:text-[13px]">
              {row.drawn}
            </span>
            <span className="hidden text-right text-[12px] tabular-nums text-muted sm:block sm:text-[13px]">
              {row.lost}
            </span>
            <span className="text-right text-[12px] tabular-nums text-muted sm:text-[13px]">
              {row.goalDifference > 0 ? "+" : ""}
              {row.goalDifference}
            </span>
            <span className="text-right text-[13px] font-extrabold tabular-nums sm:text-[14px]">
              {row.points}
            </span>
            <div className="hidden justify-end sm:flex">
              <FormDots form={row.form} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Champions League
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> Europa League
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Conference League
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Relegation
        </span>
      </div>
    </div>
  );
}
