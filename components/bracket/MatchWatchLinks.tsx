"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getMatchWatchLinks } from "@/lib/match-watch-links";
import type { MatchInfo } from "@/lib/types";

interface MatchWatchLinksProps {
  match: MatchInfo;
  className?: string;
  compact?: boolean;
}

export function MatchWatchLinks({ match, className, compact }: MatchWatchLinksProps) {
  const links = getMatchWatchLinks(match);

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Watch on streaming services"
    >
      {!compact && (
        <span className="mr-0.5 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-[11px]">
          Watch
        </span>
      )}
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${link.label} (${link.hint})`}
          className={cn(
            "inline-flex items-center overflow-hidden rounded-md border border-border bg-background transition-colors",
            "hover:border-link/30 hover:bg-link/5 active:bg-link/10",
            compact ? "h-7 px-1.5" : "h-8 px-2"
          )}
        >
          <Image
            src={link.logoSrc}
            alt={link.label}
            width={compact ? 72 : 88}
            height={compact ? 14 : 16}
            className={cn("h-auto w-auto max-h-4 object-contain", !compact && "max-h-[18px]")}
            unoptimized
          />
          <span className="sr-only">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
