"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLaLigaGuide } from "@/lib/la-liga-guide";
import type { LaLigaPhase } from "@/lib/la-liga-types";

export function HowLaLigaWorks({ phase = "MID" }: { phase?: LaLigaPhase }) {
  const [open, setOpen] = useState(false);
  const guide = getLaLigaGuide(phase);

  return (
    <div className="rounded-2xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[14px] font-semibold">How La Liga works</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3 text-[13px] leading-relaxed text-muted">
          <p className="text-foreground">{guide.intro}</p>
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
