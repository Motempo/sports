"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function RulesPrimer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[14px] font-semibold">How the World Cup works</span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-4 py-3 text-[13px] leading-relaxed text-muted">
          <div>
            <p className="font-semibold text-foreground">Group stage</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>48 teams in 12 groups of 4 — each team plays 3 matches</li>
              <li>Win = 3 pts, draw = 1 pt, loss = 0 pts</li>
              <li>Top 2 in every group advance (24 teams)</li>
              <li>Plus the 8 best third-place teams (32 total advance)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Knockouts</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Single elimination from Round of 32 through the final</li>
              <li>Tied after 90 minutes → 30 min extra time → penalties</li>
              <li>Some bracket slots stay open until all groups finish</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
