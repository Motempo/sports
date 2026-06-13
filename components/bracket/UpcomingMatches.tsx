import { MatchesSection } from "@/components/bracket/MatchesSection";
import type { GroupStandings } from "@/lib/group-standings";
import type { MatchInfo } from "@/lib/types";

interface UpcomingMatchesProps {
  matches: MatchInfo[];
  source: "api" | "seed";
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
}

export function UpcomingMatches({ matches, source, groupMatches, standings }: UpcomingMatchesProps) {
  if (matches.length === 0) return null;

  return (
    <MatchesSection
      title="Upcoming Matches"
      matches={matches}
      source={source}
      groupMatches={groupMatches}
      standings={standings}
      emptyMessage="No upcoming matches scheduled."
      subtitle={`${source === "api" ? "Live data" : "Preview data"} · Next 30 days`}
    />
  );
}
