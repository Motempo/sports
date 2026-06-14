import { cn } from "@/lib/utils";
import { getF1Guide } from "@/lib/f1-guide";
import {
  buildSeasonRailSteps,
  getActiveRailStep,
  getCurrentOrNextGrandPrix,
} from "@/lib/f1-phase";
import type { F1GrandPrix, F1SeasonPhase } from "@/lib/f1-types";

interface SeasonRailProps {
  phase: F1SeasonPhase;
  calendar: F1GrandPrix[];
  season: number;
}

export function SeasonRail({ phase, calendar, season }: SeasonRailProps) {
  const steps = buildSeasonRailSteps(calendar);
  const active = getActiveRailStep(calendar, phase);
  const guide = getF1Guide(phase);
  const nextGp = getCurrentOrNextGrandPrix(calendar);

  return (
    <section className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
        <div className="mb-4">
          {nextGp && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-link sm:text-[12px]">
              {nextGp.country} · {nextGp.circuit}
            </p>
          )}
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
            <span className="bg-gradient-to-r from-[#E10600] via-[#FF8700] to-[#E10600] bg-clip-text text-transparent">
              Formula 1 {season}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="shrink-0 text-[12px] font-semibold text-muted sm:text-[13px]">
            Season calendar
          </h2>
          <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto">
            <div className="flex gap-1 pb-1">
              {steps.map((step) => {
                const isActive = step.id === active;
                const stepIndex = steps.findIndex((s) => s.id === step.id);
                const activeIndex = steps.findIndex((s) => s.id === active);
                const isPast = stepIndex < activeIndex;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex shrink-0 flex-col items-center gap-1 rounded-full px-2.5 py-1.5 text-center sm:px-3",
                      isActive && "bg-[#E10600]/15 text-foreground",
                      !isActive && !isPast && "text-muted",
                      isPast && "text-muted/70"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-2 w-2 rounded-full",
                        isActive && "bg-[#E10600]",
                        isPast && "bg-[#E10600]/50",
                        !isActive && !isPast && "bg-border"
                      )}
                    />
                    <span className="text-[10px] font-semibold sm:text-[11px]">
                      {step.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-3 rounded-2xl border border-border/60 bg-background/50 px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-[13px] font-medium leading-snug text-foreground sm:text-[14px]">
            {guide.intro}
          </p>
          <div className="space-y-2.5">
            {guide.sections.map((section) => (
              <p key={section.title} className="text-[12px] leading-relaxed text-muted sm:text-[13px]">
                <span className="font-semibold text-foreground">{section.title}. </span>
                {section.body}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
