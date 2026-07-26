import { cn } from "@/lib/utils";
import { getConstructorColor } from "@/lib/f1-constructor-colors";
import type { F1Award, F1AwardContender } from "@/lib/f1-awards";

interface F1AwardsSectionProps {
  awards: F1Award[];
}

function ConstructorDot({ constructorId }: { constructorId: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: getConstructorColor(constructorId) }}
      aria-hidden
    />
  );
}

function ContenderRow({ contender, leader }: { contender: F1AwardContender; leader: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5",
        leader && "bg-surface/80 ring-1 ring-border"
      )}
    >
      <span className="w-4 shrink-0 text-center text-[11px] font-bold tabular-nums text-muted">
        {contender.rank}
      </span>
      <ConstructorDot constructorId={contender.constructorId} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] font-semibold", leader && "text-foreground")}>
          {contender.label}
        </p>
        <p className="truncate text-[11px] text-muted">{contender.constructorName}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12px] font-bold tabular-nums">
          {contender.stat} {contender.statLabel}
        </p>
        <p className="text-[10px] tabular-nums text-muted">{contender.winChance}%</p>
      </div>
    </div>
  );
}

function AwardCard({ award }: { award: F1Award }) {
  const leader = award.contenders[0];

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
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
        {leader && (
          <div className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground">
            {leader.winChance}% lead
          </div>
        )}
      </div>

      <p className="mb-3 text-[12px] leading-snug text-muted">{award.description}</p>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
          <span>Season progress</span>
          <span className="tabular-nums">{award.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-link transition-all duration-500"
            style={{ width: `${award.progress}%` }}
          />
        </div>
      </div>

      <div className="mb-4 space-y-1">
        {award.contenders.slice(0, 4).map((contender) => (
          <ContenderRow
            key={`${award.id}-${contender.rank}`}
            contender={contender}
            leader={contender.rank === 1}
          />
        ))}
      </div>

      <p className="mt-auto text-[12px] leading-relaxed text-foreground/85 sm:text-[13px]">
        {award.commentary}
      </p>
    </article>
  );
}

export function F1AwardsSection({ awards }: F1AwardsSectionProps) {
  if (awards.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface/30">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-5">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Season Awards</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted sm:text-[14px]">
            Live progress toward the Drivers&apos; and Constructors&apos; Championships, race wins,
            and team victories — contenders and win chances update as the season unfolds.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {awards.map((award) => (
            <AwardCard key={award.id} award={award} />
          ))}
        </div>
      </div>
    </section>
  );
}
