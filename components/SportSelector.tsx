"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, PlusCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";
import { CURRENT_SPORT_SLUG, SPORTS } from "@/lib/sports";
import { cn } from "@/lib/utils";

interface SportSelectorProps {
  activeSportSlug?: string;
}

function resolveActiveSlug(pathname: string, propSlug?: string): string {
  if (propSlug) return propSlug;
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment && SPORTS.some((s) => s.slug === segment) ? segment : CURRENT_SPORT_SLUG;
}

export function SportSelector({ activeSportSlug }: SportSelectorProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeSlug = resolveActiveSlug(pathname, activeSportSlug);
  const activeSport = SPORTS.find((s) => s.slug === activeSlug) ?? SPORTS[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="touch-target inline-flex min-h-[44px] items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-surface active:bg-surface sm:px-3 sm:text-[14px]"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Select sport"
        >
          <span className="max-w-[140px] truncate sm:max-w-none">{activeSport.label}</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")}
          />
        </button>

        {open && (
          <ul
            role="listbox"
            aria-label="Sports"
            className="absolute right-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg"
          >
            {SPORTS.map((sport) => (
              <li key={sport.id} role="option" aria-selected={sport.slug === activeSlug}>
                {sport.available ? (
                  <Link
                    href={`/${sport.slug}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex w-full items-center px-3 py-2.5 text-left text-[14px] transition-colors",
                      sport.slug === activeSlug
                        ? "bg-surface font-semibold text-foreground"
                        : "text-foreground hover:bg-surface"
                    )}
                  >
                    {sport.label}
                  </Link>
                ) : (
                  <span className="block cursor-default px-3 py-2.5 text-[13px] text-muted">
                    {sport.label}
                  </span>
                )}
              </li>
            ))}
            <li className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSuggestOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-foreground transition-colors hover:bg-surface"
              >
                <PlusCircle className="h-4 w-4 shrink-0 text-link" />
                Suggest a sport
              </button>
            </li>
          </ul>
        )}
      </div>

      <BugReportDialog
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        mode="sport-request"
        currentSportSlug={activeSlug}
      />
    </>
  );
}
