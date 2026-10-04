"use client";

import { TeamCard } from "@/components/bracket/TeamCard";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { NextEventCard } from "@/components/ui/NextEventCard";
import { getRoundLabel } from "@/lib/bracket-constants";
import { presentTeamName, withDisplayedClubs } from "@/lib/club-display-name";
import { featuredMatchParagraphs } from "@/lib/featured-match-copy";
import type { GroupStandings } from "@/lib/group-standings";
import { isMatchLive } from "@/lib/match-status";
import { formatMatchVenueLine } from "@/lib/match-venue";
import type { LeagueStandings, PremierLeagueRaceInsight } from "@/lib/premier-league-types";
import { formatViewerDateTime } from "@/lib/match-timezone";
import type { MatchInfo, VenueImage } from "@/lib/types";

interface FeaturedMatchCardProps {
  match: MatchInfo | null;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  leagueStandings?: LeagueStandings;
  titleRace?: PremierLeagueRaceInsight | null;
  relegationRace?: PremierLeagueRaceInsight | null;
  venueImage?: VenueImage | null;
  chrome?: "section" | "card";
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
  return presentTeamName(team);
}

function formatWhen(match: MatchInfo, timeZone: string): string {
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  if (isMatchLive(match.status)) return "Live now";
  if (match.status === "FINISHED") {
    return formatViewerDateTime(match.utcDate, timeZone, dateOptions);
  }
  return formatViewerDateTime(match.utcDate, timeZone, {
    ...dateOptions,
    hour: "numeric",
    minute: "2-digit",
  });
}

function headingFor(match: MatchInfo): string {
  if (isMatchLive(match.status)) return "Next match";
  if (match.status === "FINISHED") return "Last match";
  return "Next match";
}

export function FeaturedMatchCard({
  match,
  groupMatches,
  standings,
  leagueStandings,
  titleRace,
  relegationRace,
  venueImage,
  chrome = "section",
}: FeaturedMatchCardProps) {
  const { timeZone } = useViewerTimeZone();
  if (!match) return null;

  const live = isMatchLive(match.status);
  const played = match.status === "FINISHED" || live;
  const shown = withDisplayedClubs(match);

  return (
    <NextEventCard
      heading={headingFor(match)}
      chrome={chrome}
      live={live}
      kicker={matchKicker(shown)}
      title={`${teamLabel(shown.homeTeam)} vs ${teamLabel(shown.awayTeam)}`}
      whenLabel={formatWhen(shown, timeZone)}
      whenDateTime={shown.utcDate}
      location={formatMatchVenueLine(shown)}
      paragraphs={featuredMatchParagraphs(shown, {
        groupStandings: standings,
        groupMatches,
        leagueStandings,
        titleRace,
        relegationRace,
      })}
      imageUrl={venueImage?.url}
      imageAlt={venueImage?.alt ?? formatMatchVenueLine(shown) ?? teamLabel(shown.homeTeam)}
      emblems={
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
          <TeamCard team={shown.homeTeam} align="left" wrapName />
          <span className="shrink-0 text-center text-[13px] font-extrabold tabular-nums text-muted sm:text-[15px]">
            {played && shown.homeScore !== null && shown.awayScore !== null
              ? `${shown.homeScore}–${shown.awayScore}`
              : "vs"}
          </span>
          <TeamCard team={shown.awayTeam} align="right" wrapName />
        </div>
      }
    />
  );
}
