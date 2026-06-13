import { MatchCard } from "@/components/bracket/MatchCard";
import type { GroupStandings } from "@/lib/group-standings";
import type { MatchInfo } from "@/lib/types";

interface MatchesSectionProps {
  title: string;
  matches: MatchInfo[];
  source: "api" | "seed";
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  emptyMessage: string;
  subtitle?: string;
}

function formatGroupLabel(group?: string): string | null {
  if (!group) return null;
  return group.replace("GROUP_", "Group ");
}

export function MatchesSection({
  title,
  matches,
  source,
  groupMatches,
  standings,
  emptyMessage,
  subtitle,
}: MatchesSectionProps) {
  if (matches.length === 0) {
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
          <p className="mt-2 text-[14px] text-muted">{emptyMessage}</p>
        </div>
      </section>
    );
  }

  const meta =
    subtitle ??
    `${source === "api" ? "Live data" : "Preview data"} · Group stage`;

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">{meta}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <div key={match.id}>
              {match.group && (
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {formatGroupLabel(match.group)}
                </p>
              )}
              <MatchCard
                match={match}
                showContext={!!groupMatches && !!standings}
                groupMatches={groupMatches}
                standings={standings}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
