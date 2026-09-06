"use client";

import { useEffect, useState } from "react";
import { FeaturedMatchCard } from "@/components/sports/FeaturedMatchCard";
import { ExpandableModal } from "@/components/ui/ExpandableModal";
import type { GroupStandings } from "@/lib/group-standings";
import { isMatchLive } from "@/lib/match-status";
import type { LeagueStandings, PremierLeagueRaceInsight } from "@/lib/premier-league-types";
import type { MatchInfo, VenueImage } from "@/lib/types";

interface MatchDetailModalProps {
  match: MatchInfo | null;
  onClose: () => void;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  leagueStandings?: LeagueStandings;
  titleRace?: PremierLeagueRaceInsight | null;
  relegationRace?: PremierLeagueRaceInsight | null;
}

function headingFor(match: MatchInfo): string {
  if (isMatchLive(match.status)) return "Next match";
  if (match.status === "FINISHED") return "Last match";
  return "Next match";
}

export function MatchDetailModal({
  match,
  onClose,
  groupMatches,
  standings,
  leagueStandings,
  titleRace,
  relegationRace,
}: MatchDetailModalProps) {
  const [venueImage, setVenueImage] = useState<VenueImage | null>(null);

  useEffect(() => {
    if (!match) {
      setVenueImage(null);
      return;
    }

    const params = new URLSearchParams();
    if (match.venue) params.set("venue", match.venue);
    if (match.city) params.set("city", match.city);
    if (match.homeTeam.name) params.set("home", match.homeTeam.name);

    let cancelled = false;
    fetch(`/api/venue-image?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VenueImage | null) => {
        if (!cancelled) setVenueImage(data);
      })
      .catch(() => {
        if (!cancelled) setVenueImage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [match]);

  const title = match ? headingFor(match) : "Match";

  return (
    <ExpandableModal
      open={!!match}
      onClose={onClose}
      title={title}
      className="sm:max-w-3xl"
    >
      {match ? (
        <FeaturedMatchCard
          match={match}
          chrome="card"
          groupMatches={groupMatches}
          standings={standings}
          leagueStandings={leagueStandings}
          titleRace={titleRace}
          relegationRace={relegationRace}
          venueImage={venueImage}
        />
      ) : null}
    </ExpandableModal>
  );
}
