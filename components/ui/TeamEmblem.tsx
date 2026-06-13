"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { cn, getFlagUrl } from "@/lib/utils";
import type { TeamInfo } from "@/lib/types";

type EmblemSource = "crest" | "flag";

interface TeamEmblemProps {
  team: Pick<TeamInfo, "code" | "name" | "iso2" | "crest">;
  size?: number;
  className?: string;
  rounded?: "full" | "md";
}

function buildSources(team: TeamEmblemProps["team"], size: number): Array<{ kind: EmblemSource; url: string }> {
  const sources: Array<{ kind: EmblemSource; url: string }> = [];
  if (team.crest?.trim()) {
    sources.push({ kind: "crest", url: team.crest.trim() });
  }
  sources.push({ kind: "flag", url: getFlagUrl(team.iso2, size) });
  return sources;
}

export function TeamEmblem({
  team,
  size = 44,
  className,
  rounded = "full",
}: TeamEmblemProps) {
  const sources = useMemo(() => buildSources(team, size), [team, size]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [team.code, team.crest, team.iso2]);

  const active = sourceIndex < sources.length ? sources[sourceIndex] : null;
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";
  const dimension = Math.round(size * (rounded === "full" ? 1 : 0.75));

  if (!active) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border-2 border-border bg-surface text-[10px] font-bold text-muted",
          radius,
          className
        )}
        style={{ width: size, height: size }}
      >
        {team.code.slice(0, 3)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border-2 border-border bg-surface shadow-sm",
        radius,
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        key={`${team.code}-${active.kind}-${active.url}`}
        src={active.url}
        alt={`${team.name} emblem`}
        width={size}
        height={dimension}
        className="h-full w-full object-cover"
        unoptimized
        onError={() => {
          setSourceIndex((current) => current + 1);
        }}
      />
    </div>
  );
}
