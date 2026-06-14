"use client";

import { WatchPlatformLinks } from "@/components/watch/WatchPlatformLinks";
import { cn } from "@/lib/utils";
import type { F1WatchLink } from "@/lib/f1-watch-links";

interface SessionWatchLinksProps {
  links: F1WatchLink[];
  className?: string;
  compact?: boolean;
}

export function SessionWatchLinks({ links, className }: SessionWatchLinksProps) {
  return <WatchPlatformLinks links={links} className={cn(className)} accent="f1" />;
}
