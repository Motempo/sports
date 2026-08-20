"use client";

import { MatchWatchLinks } from "@/components/bracket/MatchWatchLinks";
import { TeamCard } from "@/components/bracket/TeamCard";
import { NextEventCard } from "@/components/ui/NextEventCard";
import { getRoundLabel } from "@/lib/bracket-constants";
import type { GroupStandings } from "@/lib/group-standings";
import { getMatchForecast } from "@/lib/match-forecast";
import { getMatchStakes } from "@/lib/match-context";
import { isMatchLive } from "@/lib/match-status";
import { formatMatchVenueLine } from "@/lib/match-venue";
import type { MatchInfo } from "@/lib/types";

interface FeaturedMatchCardProps {
  match: MatchInfo | null;
  groupMatches?: MatchInfo[];
  standings?: GroupStandings[];
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

function formatWhen(match: MatchInfo): string {
  if (isMatchLive(match.status)) return "Live now";
  if (match.status === "FINISHED") {
    return new Date(match.utcDate).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return new Date(match.utcDate).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeMatch(
  match: MatchInfo,
  standings?: GroupStandings[],
  groupMatches?: MatchInfo[]
): string {
  if (match.stage !== "LEAGUE" && standings) {
    const stakes = getMatchStakes(match, standings, groupMatches);
    const forecast = getMatchForecast(match);
    if (stakes && forecast) return `${stakes} ${forecast}`;
    if (stakes) return stakes;
    if (forecast) return forecast;
  }

  const venue = formatMatchVenueLine(match);
  const home = teamLabel(match.homeTeam);
  const away = teamLabel(match.awayTeam);
  if (match.status === "FINISHED") {
    return `${home} ${match.homeScore ?? "–"}–${match.awayScore ?? "–"} ${away}${venue ? ` at ${venue}` : ""}.`;
  }
  return `${home} face ${away}${venue ? ` at ${venue}` : ""}.`;
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
}: FeaturedMatchCardProps) {
  if (!match) return null;

  const live = isMatchLive(match.status);
  const played = match.status === "FINISHED" || live;

  return (
    <NextEventCard
      heading={headingFor(match)}
      live={live}
      kicker={matchKicker(match)}
      title={`${teamLabel(match.homeTeam)} vs ${teamLabel(match.awayTeam)}`}
      whenLabel={formatWhen(match)}
      location={formatMatchVenueLine(match)}
      description={describeMatch(match, standings, groupMatches)}
      watch={match.status === "CANCELLED" ? null : <MatchWatchLinks match={match} />}
      emblems={
        <div className="flex items-center gap-3 sm:gap-4">
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
