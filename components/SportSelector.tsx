"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SPORTS = [
  { id: "fifa-wc-2026", label: "FIFA World Cup", available: true },
  { id: "more", label: "More sports soon", available: false },
] as const;

const ACTIVE_SPORT_ID = "fifa-wc-2026";

export function SportSelector() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeSport = SPORTS.find((s) => s.id === ACTIVE_SPORT_ID)!;

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
          className="absolute right-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg"
        >
          {SPORTS.map((sport) => (
            <li key={sport.id} role="option" aria-selected={sport.id === ACTIVE_SPORT_ID}>
              {sport.available ? (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex w-full items-center px-3 py-2.5 text-left text-[14px] transition-colors",
                    sport.id === ACTIVE_SPORT_ID
                      ? "bg-surface font-semibold text-foreground"
                      : "text-foreground hover:bg-surface"
                  )}
                >
                  {sport.label}
                </button>
              ) : (
                <span className="block cursor-default px-3 py-2.5 text-[13px] text-muted">
                  {sport.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
