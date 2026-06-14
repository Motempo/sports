"use client";

import { cn } from "@/lib/utils";

export interface WatchPlatformLink {
  label: string;
  href: string;
  hint: string;
  logoSrc: string;
}

interface WatchPlatformLinksProps {
  links: WatchPlatformLink[];
  className?: string;
  accent?: "default" | "f1";
}

export function WatchPlatformLinks({
  links,
  className,
  accent = "default",
}: WatchPlatformLinksProps) {
  const hover =
    accent === "f1"
      ? "hover:border-[#E10600]/30 hover:bg-[#E10600]/5 active:bg-[#E10600]/10"
      : "hover:border-link/30 hover:bg-link/5 active:bg-link/10";

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="Watch on streaming services"
    >
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${link.label} (${link.hint})`}
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background p-1 transition-colors",
            hover
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.logoSrc}
            alt={link.label}
            width={20}
            height={20}
            className="h-4 w-4 object-contain"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
