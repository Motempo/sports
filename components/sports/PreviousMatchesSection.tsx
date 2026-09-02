"use client";

import { PreviousEventsCarousel } from "@/components/ui/PreviousEventsCarousel";
import { PreviousMatchCard } from "@/components/sports/PreviousMatchCard";
import type { GroupStandings } from "@/lib/group-standings";
import type { LeagueStandings, PremierLeagueRaceInsight } from "@/lib/premier-league-types";
import type { MatchInfo, VenueImage } from "@/lib/types";

interface PreviousMatchesSectionProps {
  matches: MatchInfo[];
  venueImages: (VenueImage | null)[];
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  leagueStandings?: LeagueStandings;
  titleRace?: PremierLeagueRaceInsight | null;
  relegationRace?: PremierLeagueRaceInsight | null;
  timeZone?: string;
}

export function PreviousMatchesSection({
  matches,
  venueImages,
  groupMatches,
  standings,
  leagueStandings,
  titleRace,
  relegationRace,
  timeZone,
}: PreviousMatchesSectionProps) {
  if (matches.length === 0) return null;

  return (
    <section className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <h2 className="mb-3 text-[18px] font-extrabold sm:mb-4 sm:text-[20px]">Previous matches</h2>
        <PreviousEventsCarousel label="previous matches">
          {matches.map((match, index) => (
            <PreviousMatchCard
              key={match.id}
              match={match}
              groupMatches={groupMatches}
              standings={standings}
              leagueStandings={leagueStandings}
              titleRace={titleRace}
              relegationRace={relegationRace}
              venueImage={venueImages[index] ?? null}
              timeZone={timeZone}
            />
          ))}
        </PreviousEventsCarousel>
      </div>
    </section>
  );
}
