"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getF1Guide } from "@/lib/f1-guide";
import type { F1SeasonPhase } from "@/lib/f1-types";

interface HowF1WorksProps {
  phase: F1SeasonPhase;
}

export function HowF1Works({ phase }: HowF1WorksProps) {
  const [open, setOpen] = useState(false);
  const guide = getF1Guide(phase);

  return (
    <div className="rounded-2xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[14px] font-semibold sm:text-[15px]">How Formula 1 works</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3 text-[13px] leading-relaxed text-muted sm:text-[14px]">
          <p className="font-medium text-foreground">{guide.intro}</p>
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
