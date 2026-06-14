import { cn } from "@/lib/utils";
import { getMatchWatchLinks } from "@/lib/match-watch-links";
import type { MatchInfo } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface MatchWatchLinksProps {
  match: MatchInfo;
  className?: string;
  compact?: boolean;
}

export function MatchWatchLinks({ match, className, compact }: MatchWatchLinksProps) {
  const links = getMatchWatchLinks(match);

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5 sm:gap-2", className)}
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
            "inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-link transition-colors",
            "hover:border-link/30 hover:bg-link/5 active:bg-link/10 sm:text-[12px]"
          )}
        >
          <span>{link.label}</span>
          {!compact && (
            <span className="hidden text-muted sm:inline">· {link.hint}</span>
          )}
          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        </a>
      ))}
    </div>
  );
}
