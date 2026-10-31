import { TeamEmblem } from "@/components/ui/TeamEmblem";
import { cn } from "@/lib/utils";
import type { TeamInfo } from "@/lib/types";

export interface ChanceAwardContenderView {
  rank: number;
  label: string;
  teamName: string;
  team: TeamInfo;
  stat: number;
  statLabel: string;
  winChanceLabel: string;
}

export interface ChanceAwardView {
  id: string;
  name: string;
  sponsor: string;
  emoji: string;
  description: string;
  progress: number;
  commentary: string;
  contenders: ChanceAwardContenderView[];
}

function ContenderRow({
  contender,
  leader,
}: {
  contender: ChanceAwardContenderView;
  leader: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5",
        leader ? "bg-surface/80 ring-1 ring-border" : undefined
      )}
    >
      <span className="w-4 shrink-0 text-center text-[11px] font-bold tabular-nums text-muted">
        {contender.rank}
      </span>
      <TeamEmblem team={contender.team} size={20} rounded="md" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] font-semibold", leader ? "text-foreground" : undefined)}>
          {contender.label}
        </p>
        {contender.label !== contender.teamName ? (
          <p className="truncate text-[11px] text-muted">{contender.teamName}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12px] font-bold tabular-nums">
          {contender.stat} {contender.statLabel}
        </p>
        <p className="text-[10px] tabular-nums text-muted">{contender.winChanceLabel} chance</p>
      </div>
    </div>
  );
}

export function ChanceAwardCard({
  award,
  progressClassName,
}: {
  award: ChanceAwardView;
  progressClassName: string;
}) {
  const leader = award.contenders[0];
  const rows = award.contenders.slice(0, 5);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl leading-none" aria-hidden>
            {award.emoji}
          </p>
          <h3 className="mt-2 text-[17px] font-extrabold leading-tight sm:text-[18px]">
            {award.name}
          </h3>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {award.sponsor}
          </p>
        </div>
        {leader ? (
          <div className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground">
            {leader.winChanceLabel} chance
          </div>
        ) : null}
      </div>

      <p className="mb-3 text-[12px] leading-snug text-muted">{award.description}</p>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
          <span>Season complete</span>
          <span className="tabular-nums">{award.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressClassName)}
            style={{ width: `${award.progress}%` }}
          />
        </div>
      </div>

      <div className="mb-4 space-y-1">
        {rows.length > 0 ? (
          rows.map((contender) => (
            <ContenderRow
              key={`${award.id}-${contender.rank}-${contender.label}`}
              contender={contender}
              leader={contender.rank === 1}
            />
          ))
        ) : (
          <p className="px-2 py-3 text-[13px] text-muted">Waiting on season data…</p>
        )}
      </div>

      <p className="mt-auto text-[12px] leading-relaxed text-foreground/85 sm:text-[13px]">
        {award.commentary}
      </p>
    </article>
  );
}
