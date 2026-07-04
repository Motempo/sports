"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTournamentGuide } from "@/lib/tournament-guide";
import type { TournamentPhase } from "@/lib/tournament-phase";

export function RulesPrimer({ phase = "GROUP" }: { phase?: TournamentPhase }) {
  const [open, setOpen] = useState(false);
  const guide = getTournamentGuide(phase);

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
        <div className="space-y-3 border-t border-border px-4 py-3 text-[13px] leading-relaxed text-muted">
          {guide.sections.map((section) => (
            <div key={section.title}>
              <p className="font-semibold text-foreground">{section.title}</p>
              <p className="mt-1">{section.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
