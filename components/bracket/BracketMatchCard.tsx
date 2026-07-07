"use client";

import { cn } from "@/lib/utils";
import type { BracketDetailLevel } from "@/lib/bracket-tree-layout";
import type { MatchInfo } from "@/lib/types";
import { formatKnockoutPlaceholder, isPlaceholderTeam } from "@/lib/match-context";
import { capForecast, FORECAST_MAX_CHARS, getMatchForecast } from "@/lib/match-forecast";
import { formatMatchVenueLine } from "@/lib/match-venue";
import { isMatchLive, isMatchPlayed } from "@/lib/match-status";
import { TeamEmblem } from "@/components/ui/TeamEmblem";

interface BracketMatchCardProps {
  match: MatchInfo;
  detailLevel: BracketDetailLevel;
  cardWidth?: number;
  highlight?: "final" | "bronze";
}

function teamEmblem(team: MatchInfo["homeTeam"], size: number) {
  if (isPlaceholderTeam(team.code, team.name)) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border border-dashed border-border/80 bg-surface text-[8px] font-medium text-muted"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }
  return <TeamEmblem team={team} size={size} />;
}

function formatKickoff(utcDate: string): { date: string; time: string } {
  const date = new Date(utcDate);
  return {
    date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    time: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function formatScore(match: MatchInfo): string {
  const live = isMatchLive(match.status);
  const played = isMatchPlayed(match.status, match.homeScore, match.awayScore);
  if (!played && !live) return "–";
  if (match.homeScore === null || match.awayScore === null) return "–";
  return `${match.homeScore}–${match.awayScore}`;
}

function truncateForecast(text: string): string {
  return capForecast(text, FORECAST_MAX_CHARS);
}

/** Compact pathway bars (reference bracket style) for zoomed-out view. */
function PathwayBars({
  match,
  detailLevel,
  homeLabel,
  awayLabel,
  homePlaceholder,
  awayPlaceholder,
  homeWinner,
  awayWinner,
  homeLoser,
  awayLoser,
  flagSize,
}: {
  match: MatchInfo;
  detailLevel: BracketDetailLevel;
  homeLabel: string;
  awayLabel: string;
  homePlaceholder: boolean;
  awayPlaceholder: boolean;
  homeWinner: boolean;
  awayWinner: boolean;
  homeLoser: boolean;
  awayLoser: boolean;
  flagSize: number;
}) {
  const showNames = detailLevel >= 2;

  const row = (
    team: MatchInfo["homeTeam"],
    label: string,
    placeholder: boolean,
    isWinner: boolean,
    isLoser: boolean,
    align: "left" | "right"
  ) => (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border border-border/70 bg-background/90 px-1 py-0.5",
        align === "right" && "flex-row-reverse",
        isWinner && "border-foreground/25 bg-foreground/[0.03] font-semibold",
        isLoser && "opacity-50"
      )}
    >
      {teamEmblem(team, flagSize)}
      {showNames && (
        <span
          className={cn(
            "max-w-[3.5rem] truncate text-[8px] font-semibold leading-none",
            placeholder ? "text-muted" : "text-foreground/90"
          )}
          title={team.name}
        >
          {label}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {row(match.homeTeam, homeLabel, homePlaceholder, homeWinner, homeLoser, "left")}
      {row(match.awayTeam, awayLabel, awayPlaceholder, awayWinner, awayLoser, "left")}
    </div>
  );
}

export function BracketMatchCard({
  match,
  detailLevel,
  cardWidth,
  highlight,
}: BracketMatchCardProps) {
  const live = isMatchLive(match.status);
  const finished = match.status === "FINISHED";
  const homeWinner = finished && match.winnerCode === match.homeTeam.code;
  const awayWinner = finished && match.winnerCode === match.awayTeam.code;
  const homeLoser = finished && !homeWinner && !!match.winnerCode;
  const awayLoser = finished && !awayWinner && !!match.winnerCode;

  const expanded = detailLevel >= 4;
  const fullAnalysis = detailLevel >= 5;

  const flagSize =
    detailLevel === 0 ? 22 : detailLevel === 1 ? 24 : detailLevel <= 3 ? 26 : expanded ? 30 : 28;

  const scoreText = formatScore(match);
  const kickoff = formatKickoff(match.utcDate);
  const venueLine = formatMatchVenueLine(match);
  const rawForecast = detailLevel >= 4 ? getMatchForecast(match) : null;
  const forecast = rawForecast ? truncateForecast(rawForecast) : null;

  const homePlaceholder = isPlaceholderTeam(match.homeTeam.code, match.homeTeam.name);
  const awayPlaceholder = isPlaceholderTeam(match.awayTeam.code, match.awayTeam.name);

  const homeLabel = homePlaceholder
    ? formatKnockoutPlaceholder(match.homeTeam.code, match.homeTeam.name)
    : detailLevel >= 3 || expanded
      ? match.homeTeam.name
      : match.homeTeam.code;
  const awayLabel = awayPlaceholder
    ? formatKnockoutPlaceholder(match.awayTeam.code, match.awayTeam.name)
    : detailLevel >= 3 || expanded
      ? match.awayTeam.name
      : match.awayTeam.code;

  const metaText = expanded ? "text-[11px]" : detailLevel >= 4 ? "text-[10px]" : "text-[9px]";
  const bodyText = fullAnalysis ? "text-[11px]" : expanded ? "text-[10px]" : "text-[9px]";
  const usePathwayBars = detailLevel <= 1;

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-xl border bg-background shadow-sm transition-shadow",
        highlight === "final"
          ? "border-foreground/25 ring-1 ring-foreground/10"
          : "border-border",
        live && detailLevel <= 1 && "ring-1 ring-link/60",
        fullAnalysis ? "overflow-visible" : "overflow-hidden",
        detailLevel === 0 ? "px-1.5 py-1" : fullAnalysis ? "px-3 py-3" : expanded ? "px-2.5 py-2.5" : "px-2 py-1.5"
      )}
    >
      {usePathwayBars ? (
        <div className="flex items-stretch gap-1">
          <div className="min-w-0 flex-1">
            <PathwayBars
              match={match}
              detailLevel={detailLevel}
              homeLabel={homeLabel}
              awayLabel={awayLabel}
              homePlaceholder={homePlaceholder}
              awayPlaceholder={awayPlaceholder}
              homeWinner={!!homeWinner}
              awayWinner={!!awayWinner}
              homeLoser={!!homeLoser}
              awayLoser={!!awayLoser}
              flagSize={flagSize}
            />
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center px-0.5">
            <span
              className={cn(
                "text-center font-extrabold tabular-nums leading-none",
                detailLevel === 0 ? "text-[11px]" : "text-[10px]",
                live && "text-link"
              )}
            >
              {scoreText}
            </span>
          </div>
        </div>
      ) : expanded ? (
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1.5",
              homeWinner && "font-bold",
              homeLoser && "opacity-50"
            )}
          >
            {teamEmblem(match.homeTeam, flagSize)}
            <span
              className={cn(
                "leading-snug",
                metaText,
                homePlaceholder ? "text-muted" : "text-foreground/90",
                fullAnalysis ? "line-clamp-2" : "truncate"
              )}
              title={match.homeTeam.name}
            >
              {homeLabel}
            </span>
          </div>

          <div className="flex shrink-0 flex-col items-center justify-center px-1 pt-0.5">
            {live && (
              <span className="mb-0.5 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
            )}
            <span
              className={cn(
                "text-center font-extrabold tabular-nums leading-none",
                fullAnalysis ? "text-[15px]" : "text-[13px]",
                live && "text-link"
              )}
            >
              {scoreText}
            </span>
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-1 items-center justify-end gap-1.5",
              awayWinner && "font-bold",
              awayLoser && "opacity-50"
            )}
          >
            <span
              className={cn(
                "text-right leading-snug",
                metaText,
                awayPlaceholder ? "text-muted" : "text-foreground/90",
                fullAnalysis ? "line-clamp-2" : "truncate"
              )}
              title={match.awayTeam.name}
            >
              {awayLabel}
            </span>
            {teamEmblem(match.awayTeam, flagSize)}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1">
          <div
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-0.5",
              homeWinner && "font-bold",
              homeLoser && "opacity-50"
            )}
          >
            <div className="flex items-center justify-center">{teamEmblem(match.homeTeam, flagSize)}</div>
            {detailLevel >= 2 && (
              <span
                className={cn(
                  "text-center font-semibold leading-snug",
                  metaText,
                  homePlaceholder ? "text-muted" : "text-foreground/90",
                  detailLevel >= 3 ? "line-clamp-2" : "max-w-full truncate"
                )}
                title={match.homeTeam.name}
              >
                {homeLabel}
              </span>
            )}
          </div>

          <div className="flex min-w-[1.75rem] shrink-0 flex-col items-center justify-center px-0.5">
            {live && detailLevel >= 2 && (
              <span className="mb-0.5 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
            )}
            <span
              className={cn(
                "text-center font-extrabold tabular-nums leading-none",
                detailLevel >= 4 ? "text-[13px]" : "text-[11px]",
                live && "text-link"
              )}
            >
              {scoreText}
            </span>
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-0.5",
              awayWinner && "font-bold",
              awayLoser && "opacity-50"
            )}
          >
            <div className="flex items-center justify-center">{teamEmblem(match.awayTeam, flagSize)}</div>
            {detailLevel >= 2 && (
              <span
                className={cn(
                  "text-center font-semibold leading-snug",
                  metaText,
                  awayPlaceholder ? "text-muted" : "text-foreground/90",
                  detailLevel >= 3 ? "line-clamp-2" : "max-w-full truncate"
                )}
                title={match.awayTeam.name}
              >
                {awayLabel}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-1 text-center">
        {live ? (
          <p className={cn("flex items-center justify-center gap-1 font-semibold text-link", metaText)}>
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
            Live
          </p>
        ) : (
          <p className={cn("tabular-nums text-muted", metaText)}>
            {detailLevel >= 2 ? (
              <>
                {kickoff.date} · {kickoff.time}
              </>
            ) : (
              <>
                <span className="block leading-tight">{kickoff.date}</span>
                <span className="block leading-tight">{kickoff.time}</span>
              </>
            )}
          </p>
        )}
      </div>

      {detailLevel >= 3 && venueLine && (
        <p className={cn("mt-1 text-center leading-snug text-muted", bodyText)}>{venueLine}</p>
      )}

      {detailLevel >= 4 && forecast && (
        <p
          className={cn(
            "mt-2 leading-relaxed text-foreground/85",
            bodyText,
            fullAnalysis ? "text-left" : "text-center"
          )}
        >
          {forecast}
        </p>
      )}

      {highlight === "bronze" && detailLevel >= 1 && (
        <p className={cn("mt-1 text-center font-medium uppercase tracking-wide text-muted", metaText)}>
          Bronze
        </p>
      )}
    </div>
  );
}
