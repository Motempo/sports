import { getGroupStageStatus } from "@/lib/tournament-guide";
import type { TournamentPhase } from "@/lib/tournament-phase";

interface GroupStageStatusProps {
  phase: TournamentPhase;
}

export function GroupStageStatus({ phase }: GroupStageStatusProps) {
  const status = getGroupStageStatus(phase);
  if (!status) return null;

  return (
    <div className="mt-4 space-y-2 rounded-2xl border border-border/60 bg-surface/30 px-3 py-3 sm:px-4 sm:py-4">
      <h3 className="text-[13px] font-semibold text-foreground sm:text-[14px]">{status.heading}</h3>
      <div className="space-y-2">
        {status.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-[12px] leading-relaxed text-muted sm:text-[13px]">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
