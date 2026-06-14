"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getConstructorColor } from "@/lib/f1-constructor-colors";
import type { F1ConstructorStandingRow, F1StandingRow } from "@/lib/f1-types";

interface ChampionshipStandingsProps {
  driverStandings: F1StandingRow[];
  constructorStandings: F1ConstructorStandingRow[];
}

function ConstructorDot({ constructorId }: { constructorId: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: getConstructorColor(constructorId) }}
    />
  );
}

function DriverTable({ rows }: { rows: F1StandingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-[14px] text-muted">Standings will appear when the season begins.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="grid grid-cols-[2rem_1fr_3.5rem_2.5rem] gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[2.5rem_1fr_4rem_3rem] sm:px-4">
        <span>#</span>
        <span>Driver</span>
        <span className="text-right">Pts</span>
        <span className="text-right">W</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.driverId ?? row.driverName}
          className={cn(
            "grid grid-cols-[2rem_1fr_3.5rem_2.5rem] items-center gap-2 px-3 py-2.5 sm:grid-cols-[2.5rem_1fr_4rem_3rem] sm:px-4",
            index > 0 && "border-t border-border"
          )}
        >
          <span className="text-[13px] font-bold text-muted">{row.position}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ConstructorDot constructorId={row.constructorId} />
              <span className="truncate text-[14px] font-semibold sm:text-[15px]">
                {row.driverCode ?? row.driverName.split(" ").pop()}
              </span>
            </div>
            <p className="truncate text-[11px] text-muted sm:text-[12px]">{row.constructorName}</p>
          </div>
          <span className="text-right text-[13px] font-bold tabular-nums sm:text-[14px]">
            {row.points}
          </span>
          <span className="text-right text-[12px] tabular-nums text-muted sm:text-[13px]">
            {row.wins}
          </span>
        </div>
      ))}
    </div>
  );
}

function ConstructorTable({ rows }: { rows: F1ConstructorStandingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-[14px] text-muted">Constructor standings will appear when the season begins.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="grid grid-cols-[2rem_1fr_3.5rem_2.5rem] gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[2.5rem_1fr_4rem_3rem] sm:px-4">
        <span>#</span>
        <span>Team</span>
        <span className="text-right">Pts</span>
        <span className="text-right">W</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.constructorId}
          className={cn(
            "grid grid-cols-[2rem_1fr_3.5rem_2.5rem] items-center gap-2 px-3 py-2.5 sm:grid-cols-[2.5rem_1fr_4rem_3rem] sm:px-4",
            index > 0 && "border-t border-border"
          )}
        >
          <span className="text-[13px] font-bold text-muted">{row.position}</span>
          <div className="flex min-w-0 items-center gap-2">
            <ConstructorDot constructorId={row.constructorId} />
            <span className="truncate text-[14px] font-semibold sm:text-[15px]">
              {row.constructorName}
            </span>
          </div>
          <span className="text-right text-[13px] font-bold tabular-nums sm:text-[14px]">
            {row.points}
          </span>
          <span className="text-right text-[12px] tabular-nums text-muted sm:text-[13px]">
            {row.wins}
          </span>
        </div>
      ))}
    </div>
  );
}

function StandingsPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-[14px] font-bold sm:text-[15px]">{title}</h3>
      {children}
    </div>
  );
}

export function ChampionshipStandings({
  driverStandings,
  constructorStandings,
}: ChampionshipStandingsProps) {
  const [tab, setTab] = useState<"drivers" | "constructors">("drivers");

  return (
    <div>
      {/* Mobile: tabs */}
      <div className="mb-4 flex gap-1 border-b border-border lg:hidden">
        {(["drivers", "constructors"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "border-b-2 px-4 py-2 text-[13px] font-medium transition-colors sm:text-[14px]",
              tab === key
                ? "border-[#E10600] text-foreground"
                : "border-transparent text-muted"
            )}
          >
            {key === "drivers" ? "Drivers" : "Constructors"}
          </button>
        ))}
      </div>

      <div className="lg:hidden">
        {tab === "drivers" ? (
          <DriverTable rows={driverStandings} />
        ) : (
          <ConstructorTable rows={constructorStandings} />
        )}
      </div>

      {/* Desktop: side by side */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
        <StandingsPanel title="Drivers">
          <DriverTable rows={driverStandings} />
        </StandingsPanel>
        <StandingsPanel title="Constructors">
          <ConstructorTable rows={constructorStandings} />
        </StandingsPanel>
      </div>
    </div>
  );
}
