import { cn } from "@/lib/utils";
import type { TournamentPhase } from "@/lib/tournament-phase";
import { getActiveRailStep, getPhaseSubtitle, getRailSteps } from "@/lib/tournament-phase";
import type { MatchInfo } from "@/lib/types";

interface TournamentRailProps {
  phase: TournamentPhase;
  knockoutMatches: MatchInfo[];
}

export function TournamentRail({ phase, knockoutMatches }: TournamentRailProps) {
  const steps = getRailSteps();
  const active = getActiveRailStep(phase, knockoutMatches);
  const subtitle = getPhaseSubtitle(phase);

  return (
    <section className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
        <div className="scrollbar-hide -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
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
                  isActive && "bg-link/15 text-foreground",
                  !isActive && !isPast && "text-muted",
                  isPast && "text-muted/70"
                )}
              >
                <span
                  className={cn(
                    "flex h-2 w-2 rounded-full",
                    isActive && "bg-link",
                    isPast && "bg-link/50",
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
        <p className="mt-3 text-[13px] leading-snug text-muted sm:text-[14px]">{subtitle}</p>
      </div>
    </section>
  );
}
