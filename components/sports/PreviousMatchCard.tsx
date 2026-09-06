"use client";

import { TeamCard } from "@/components/bracket/TeamCard";
import { NextEventCard } from "@/components/ui/NextEventCard";
import { getRoundLabel } from "@/lib/bracket-constants";
import { previousMatchParagraphs } from "@/lib/previous-match-copy";
import type { GroupStandings } from "@/lib/group-standings";
import { formatMatchVenueLine } from "@/lib/match-venue";
import type { LeagueStandings, PremierLeagueRaceInsight } from "@/lib/premier-league-types";
import type { MatchInfo, VenueImage } from "@/lib/types";

interface PreviousMatchCardProps {
  match: MatchInfo;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  leagueStandings?: LeagueStandings;
  titleRace?: PremierLeagueRaceInsight | null;
  relegationRace?: PremierLeagueRaceInsight | null;
  venueImage?: VenueImage | null;
  timeZone?: string;
}

function matchKicker(match: MatchInfo): string {
  if (match.stage === "LEAGUE") {
    return match.group?.trim() || "League match";
  }
  if (match.stage === "GROUP" && match.group) {
    return match.group.replace("GROUP_", "Group ");
  }
  return getRoundLabel(match.round);
}

function teamLabel(team: MatchInfo["homeTeam"]): string {
  return team.name?.trim() || team.code;
}

function formatWhen(match: MatchInfo, timeZone?: string): string {
  return new Date(match.utcDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
}

export function PreviousMatchCard({
  match,
  groupMatches,
  standings,
  leagueStandings,
  titleRace,
  relegationRace,
  venueImage,
  timeZone,
}: PreviousMatchCardProps) {
  return (
    <article
      data-carousel-card
      className="w-[min(92vw,42rem)] shrink-0 snap-center scroll-ml-4 first:scroll-ml-0 sm:w-[min(88vw,42rem)]"
    >
      <NextEventCard
        embedded
        kicker={matchKicker(match)}
        title={`${teamLabel(match.homeTeam)} vs ${teamLabel(match.awayTeam)}`}
        whenLabel={formatWhen(match, timeZone)}
        location={formatMatchVenueLine(match)}
        paragraphs={previousMatchParagraphs(match, {
          groupStandings: standings,
          groupMatches,
          leagueStandings,
          titleRace,
          relegationRace,
        })}
        imageUrl={venueImage?.url}
        imageAlt={venueImage?.alt ?? formatMatchVenueLine(match) ?? teamLabel(match.homeTeam)}
        emblems={
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <TeamCard team={match.homeTeam} align="left" />
            <span className="text-[13px] font-extrabold tabular-nums text-muted sm:text-[15px]">
              {match.homeScore !== null && match.awayScore !== null
                ? `${match.homeScore}–${match.awayScore}`
                : "–"}
            </span>
            <TeamCard team={match.awayTeam} align="right" />
          </div>
        }
      />
    </article>
  );
}
