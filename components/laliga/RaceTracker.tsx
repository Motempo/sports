import type { LeagueRaceInsight } from "@/lib/la-liga-types";

interface RaceTrackerProps {
  titleRace: LeagueRaceInsight | null;
  relegationRace: LeagueRaceInsight | null;
}

function RaceCard({ insight }: { insight: LeagueRaceInsight }) {
  const accent =
    insight.kind === "title"
      ? "border-[#EE334E]/35 bg-[#EE334E]/5"
      : "border-rose-500/35 bg-rose-500/5";

  return (
    <div className={`rounded-2xl border bg-background p-3 sm:p-4 ${accent}`}>
      <h3 className="text-[13px] font-bold sm:text-[14px]">{insight.title}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-muted sm:text-[13px]">
        {insight.message}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground">
          {insight.leaderLabel}
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
          {insight.chaseLabel}
        </span>
        {insight.remaining > 0 && (
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
            {insight.remaining} left
          </span>
        )}
      </div>
    </div>
  );
}

export function RaceTracker({ titleRace, relegationRace }: RaceTrackerProps) {
  if (!titleRace && !relegationRace) return null;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {titleRace && <RaceCard insight={titleRace} />}
      {relegationRace && <RaceCard insight={relegationRace} />}
    </div>
  );
}
