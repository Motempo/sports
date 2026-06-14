"use client";

import { WatchPlatformLinks } from "@/components/watch/WatchPlatformLinks";
import { cn } from "@/lib/utils";
import { getMatchWatchLinks } from "@/lib/match-watch-links";
import type { MatchInfo } from "@/lib/types";

interface MatchWatchLinksProps {
  match: MatchInfo;
  className?: string;
  compact?: boolean;
}

export function MatchWatchLinks({ match, className }: MatchWatchLinksProps) {
  const links = getMatchWatchLinks(match);

  return (
    <WatchPlatformLinks links={links} className={cn(className)} accent="default" />
  );
}
