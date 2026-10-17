"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { countryFlagSrc } from "@/lib/country-flag";
import { cn } from "@/lib/utils";
import type { TeamInfo } from "@/lib/types";

type EmblemSource = "crest" | "flag";

interface TeamEmblemProps {
  team: Pick<TeamInfo, "code" | "name" | "iso2" | "crest">;
  size?: number;
  className?: string;
  rounded?: "full" | "md";
}

function buildSources(team: TeamEmblemProps["team"]): Array<{ kind: EmblemSource; url: string }> {
  const sources: Array<{ kind: EmblemSource; url: string }> = [];
  if (team.crest?.trim()) {
    sources.push({ kind: "crest", url: team.crest.trim() });
  }
  const flag = countryFlagSrc(team.iso2);
  if (flag) sources.push({ kind: "flag", url: flag });
  return sources;
}

export function TeamEmblem({
  team,
  size = 44,
  className,
  rounded = "full",
}: TeamEmblemProps) {
  const sources = useMemo(() => buildSources(team), [team]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [team.code, team.crest, team.iso2]);

  const active = sourceIndex < sources.length ? sources[sourceIndex] : null;
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";
  const frame = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-border bg-surface shadow-sm",
    radius,
    className
  );

  if (active?.kind === "flag") {
    return (
      <div className={frame} style={{ width: size, height: size }}>
        <CountryFlag
          code={team.iso2}
          name={team.name}
          size={size >= 36 ? "md" : "sm"}
          className="h-[78%] w-[78%] border-0 shadow-none"
        />
      </div>
    );
  }

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
    <div className={frame} style={{ width: size, height: size }}>
      <Image
        key={`${team.code}-${active.kind}-${active.url}`}
        src={active.url}
        alt={`${team.name} emblem`}
        width={size}
        height={size}
        className="h-full w-full max-h-full max-w-full object-cover"
        unoptimized
        onError={() => {
          setSourceIndex((current) => current + 1);
        }}
      />
    </div>
  );
}
