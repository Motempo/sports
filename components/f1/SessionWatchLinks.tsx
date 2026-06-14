"use client";

import { cn } from "@/lib/utils";
import type { F1WatchLink } from "@/lib/f1-watch-links";

interface SessionWatchLinksProps {
  links: F1WatchLink[];
  className?: string;
  compact?: boolean;
}

export function SessionWatchLinks({ links, className, compact }: SessionWatchLinksProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Watch on streaming services"
    >
      {!compact && (
        <span className="mr-0.5 text-[11px] font-medium uppercase tracking-wide text-muted sm:text-[12px]">
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
            "hover:border-[#E10600]/30 hover:bg-[#E10600]/5 active:bg-[#E10600]/10",
            compact ? "h-8 px-2" : "h-9 px-2.5"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.logoSrc}
            alt={link.label}
            width={compact ? 80 : 96}
            height={20}
            className="h-5 w-auto max-w-[96px] object-contain"
            loading="lazy"
          />
          <span className="sr-only">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
