"use client";

import { TeamCard } from "@/components/bracket/TeamCard";
import { NextEventCard } from "@/components/ui/NextEventCard";
import { getRoundLabel } from "@/lib/bracket-constants";
import { featuredMatchParagraphs } from "@/lib/featured-match-copy";
import type { GroupStandings } from "@/lib/group-standings";
import { isMatchLive } from "@/lib/match-status";
import { formatMatchVenueLine } from "@/lib/match-venue";
import type { LeagueStandings, PremierLeagueRaceInsight } from "@/lib/premier-league-types";
import type { MatchInfo, VenueImage } from "@/lib/types";

interface FeaturedMatchCardProps {
  match: MatchInfo | null;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
  leagueStandings?: LeagueStandings;
  titleRace?: PremierLeagueRaceInsight | null;
  relegationRace?: PremierLeagueRaceInsight | null;
  venueImage?: VenueImage | null;
  /** IANA timezone for kickoff display (e.g. Europe/London for PL). */
  timeZone?: string;
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
  return team.name?.trim() || team.code;
}

function formatWhen(match: MatchInfo, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  };
  if (isMatchLive(match.status)) return "Live now";
  if (match.status === "FINISHED") {
    return new Date(match.utcDate).toLocaleDateString(undefined, opts);
  }
  return new Date(match.utcDate).toLocaleString(undefined, {
    ...opts,
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
  timeZone,
  chrome = "section",
}: FeaturedMatchCardProps) {
  if (!match) return null;

  const live = isMatchLive(match.status);
  const played = match.status === "FINISHED" || live;

  return (
    <NextEventCard
      heading={headingFor(match)}
      chrome={chrome}
      live={live}
      kicker={matchKicker(match)}
      title={`${teamLabel(match.homeTeam)} vs ${teamLabel(match.awayTeam)}`}
      whenLabel={formatWhen(match, timeZone)}
      location={formatMatchVenueLine(match)}
      paragraphs={featuredMatchParagraphs(match, {
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
            {played && match.homeScore !== null && match.awayScore !== null
              ? `${match.homeScore}–${match.awayScore}`
              : "vs"}
          </span>
          <TeamCard team={match.awayTeam} align="right" />
        </div>
      }
    />
  );
}
