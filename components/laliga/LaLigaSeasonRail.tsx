import { cn } from "@/lib/utils";
import { getLaLigaGuide } from "@/lib/la-liga-guide";
import {
  buildLaLigaRailSteps,
  getActiveLaLigaRailStep,
} from "@/lib/la-liga-phase";
import type { LaLigaPhase } from "@/lib/la-liga-types";

interface LaLigaSeasonRailProps {
  phase: LaLigaPhase;
  seasonLabel: string;
}

export function LaLigaSeasonRail({ phase, seasonLabel }: LaLigaSeasonRailProps) {
  const steps = buildLaLigaRailSteps();
  const active = getActiveLaLigaRailStep(phase);
  const guide = getLaLigaGuide(phase);

  return (
    <section className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#EE334E] sm:text-[12px]">
            Spain · 20 clubs · 38 matchdays
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
            <span className="bg-gradient-to-r from-[#EE334E] via-[#F5A623] to-[#EE334E] bg-clip-text text-transparent">
              La Liga {seasonLabel}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="shrink-0 text-[12px] font-semibold text-muted sm:text-[13px]">
            Stages of the season
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
                      "flex shrink-0 flex-col items-center gap-1 rounded-full px-3 py-1.5 text-center sm:px-4",
                      isActive && "bg-[#EE334E]/15 text-foreground",
                      !isActive && !isPast && "text-muted",
                      isPast && "text-muted/70"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-2 w-2 rounded-full",
                        isActive && "bg-[#EE334E]",
                        isPast && "bg-[#EE334E]/50",
                        !isActive && !isPast && "bg-border"
                      )}
                    />
                    <span className="text-[11px] font-semibold sm:text-[12px]">
                      <span className="sm:hidden">{step.shortLabel}</span>
                      <span className="hidden sm:inline">{step.label}</span>
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
              <p
                key={section.title}
                className="text-[12px] leading-relaxed text-muted sm:text-[13px]"
              >
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
