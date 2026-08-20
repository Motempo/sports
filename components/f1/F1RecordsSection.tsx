import { cn } from "@/lib/utils";
import { getConstructorColor } from "@/lib/f1-constructor-colors";
import type { F1Record, F1RecordMark } from "@/lib/f1-records";

interface F1RecordsSectionProps {
  records: F1Record[];
  season: number;
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

function RecordMarkCard({
  label,
  mark,
  highlighted,
}: {
  label: string;
  mark: F1RecordMark;
  highlighted?: "leading" | "all-time";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface/40 p-3",
        highlighted === "all-time" && "ring-2 ring-amber-500/60 bg-amber-500/5",
        highlighted === "leading" && "ring-1 ring-link/50 bg-link/5"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-[15px] font-extrabold tabular-nums leading-tight">{mark.value}</p>
      <div className="mt-2 flex items-center gap-2">
        {mark.constructorId && <ConstructorDot constructorId={mark.constructorId} />}
        <p className="min-w-0 truncate text-[12px] font-semibold leading-snug">{mark.holder}</p>
      </div>
      {mark.context && (
        <p className="mt-1 text-[10px] leading-snug text-muted">{mark.context}</p>
      )}
      {highlighted === "all-time" && (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          New all-time mark
        </p>
      )}
      {highlighted === "leading" && (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-link">
          Leading this season
        </p>
      )}
    </div>
  );
}

function RecordCard({ record, season }: { record: F1Record; season: number }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="mb-3">
        <p className="text-2xl leading-none" aria-hidden>
          {record.emoji}
        </p>
        <h3 className="mt-2 text-[17px] font-extrabold leading-tight sm:text-[18px]">
          {record.name}
        </h3>
      </div>

      <p className="mb-4 text-[12px] leading-snug text-muted">{record.description}</p>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <RecordMarkCard label="All-time Formula 1" mark={record.allTime} />
        <RecordMarkCard
          label={`${season} season`}
          mark={record.season}
          highlighted={record.highlightSeason ?? undefined}
        />
      </div>

      <p className="mt-auto text-[12px] leading-relaxed text-foreground/85 sm:text-[13px]">
        {record.commentary}
      </p>
    </article>
  );
}

export function F1RecordsSection({ records, season }: F1RecordsSectionProps) {
  if (records.length === 0) return null;

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-5">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Season &amp; All-Time Records</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted sm:text-[14px]">
            The stats commentators reach for on air — wins, points hauls, title gaps, and winning
            streaks — with all-time Formula 1 marks alongside what&apos;s happened in {season}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {records.map((item) => (
            <RecordCard key={item.id} record={item} season={season} />
          ))}
        </div>
      </div>
    </section>
  );
}
