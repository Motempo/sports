import { cn } from "@/lib/utils";
import { SeasonProgressRailScroller } from "@/components/ui/SeasonProgressRailScroller";
import { getPremierLeagueGuide } from "@/lib/premier-league-guide";
import {
  buildPremierLeagueRailSteps,
  getActivePremierLeagueRailStep,
} from "@/lib/premier-league-phase";
import type { PremierLeaguePhase } from "@/lib/premier-league-types";

interface PremierLeagueRailProps {
  phase: PremierLeaguePhase;
  seasonLabel: string;
}

export function PremierLeagueRail({ phase, seasonLabel }: PremierLeagueRailProps) {
  const steps = buildPremierLeagueRailSteps();
  const active = getActivePremierLeagueRailStep(phase);
  const guide = getPremierLeagueGuide(phase);

  return (
    <section className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00FF85] sm:text-[12px]">
            England · 20 clubs · 38 matchdays
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
            <span className="bg-gradient-to-r from-[#9B7EBD] via-[#00FF85] to-[#9B7EBD] bg-clip-text text-transparent">
              Premier League {seasonLabel}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="shrink-0 text-[12px] font-semibold text-muted sm:text-[13px]">
            Stages of the season
          </h2>
          <SeasonProgressRailScroller activeStepId={active}>
            {steps.map((step) => {
              const isActive = step.id === active;
              const stepIndex = steps.findIndex((s) => s.id === step.id);
              const activeIndex = steps.findIndex((s) => s.id === active);
              const isPast = stepIndex < activeIndex;

              return (
                <div
                  key={step.id}
                  data-rail-active={isActive ? "true" : undefined}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-1 rounded-full px-3 py-1.5 text-center sm:px-4",
                    isActive && "bg-[#37003C]/20 text-foreground dark:bg-[#00FF85]/15",
                    !isActive && !isPast && "text-muted",
                    isPast && "text-muted/70"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-2 w-2 rounded-full",
                      isActive && "bg-[#00FF85]",
                      isPast && "bg-[#00FF85]/50",
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
          </SeasonProgressRailScroller>
        </div>

        <p className="mt-3 text-[13px] leading-snug text-muted sm:text-[14px]">{guide.intro}</p>
      </div>
    </section>
  );
}
