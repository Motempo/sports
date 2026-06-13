import { MatchCard } from "@/components/bracket/MatchCard";
import type { MatchInfo } from "@/lib/types";

interface CurrentMatchesProps {
  matches: MatchInfo[];
  source: "api" | "seed";
}

function formatGroupLabel(group?: string): string | null {
  if (!group) return null;
  return group.replace("GROUP_", "Group ");
}

export function CurrentMatches({ matches, source }: CurrentMatchesProps) {
  if (matches.length === 0) {
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Today&apos;s Matches</h2>
          <p className="mt-2 text-[14px] text-muted">
            No live or scheduled matches for today yet.
            {source === "seed" && " Add FOOTBALL_DATA_API_KEY on Vercel for real fixtures."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Today&apos;s Matches</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {source === "api" ? "Live data" : "Preview data"} · Group stage
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <div key={match.id}>
              {match.group && (
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {formatGroupLabel(match.group)}
                </p>
              )}
              <MatchCard match={match} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
