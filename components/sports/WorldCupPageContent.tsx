import { BracketTree } from "@/components/bracket/BracketTree";
import { ScheduleByDay } from "@/components/bracket/ScheduleByDay";
import {
  WorldCupMidAd,
  WorldCupStandingsAd,
  WorldCupAdPlacements,
} from "@/components/ads/WorldCupAdPlacements";
import { NewsAndFactsSection } from "@/components/sports/NewsAndFactsSection";
import { SportHowItWorksSection } from "@/components/sports/SportHowItWorksSection";
import { SportPageShell } from "@/components/sports/SportPageShell";
import { GroupStandingsGrid } from "@/components/tournament/GroupStandingsGrid";
import { GroupStageStatus } from "@/components/tournament/GroupStageStatus";
import { RulesPrimer } from "@/components/tournament/RulesPrimer";
import { ThirdPlaceTracker } from "@/components/tournament/ThirdPlaceTracker";
import { TournamentRail } from "@/components/tournament/TournamentRail";
import { FeaturedMatchCard } from "@/components/sports/FeaturedMatchCard";
import { PreviousMatchesSection } from "@/components/sports/PreviousMatchesSection";
import { WorldCupAwardsSection } from "@/components/tournament/WorldCupAwardsSection";
import { WorldCupRecordsSection } from "@/components/tournament/WorldCupRecordsSection";
import { fetchMatches, groupMatchesByRound } from "@/lib/football-data";
import { formatMatchDataSource } from "@/lib/match-data-source";
import { selectFeaturedMatch, selectPreviousMatches } from "@/lib/match-schedule";
import { resolveMatchVenueImage } from "@/lib/venue-image";
import { computeGroupStandings, computeThirdPlaceTracker } from "@/lib/group-standings";
import { buildWorldCupAwards } from "@/lib/world-cup-awards";
import { buildWorldCupRecords } from "@/lib/world-cup-records";
import { fetchTournamentGoalStats } from "@/lib/tournament-goal-stats";
import {
  detectTournamentPhase,
  showGroupStandingsPrimary,
} from "@/lib/tournament-phase";

export const revalidate = 120;

export async function WorldCupPageContent() {
  const { matches, groupMatches, todayMatches, upcomingMatches, source } = await fetchMatches();
  const grouped = groupMatchesByRound(matches);
  const phase = detectTournamentPhase(matches, groupMatches);
  const standingsPrimary = showGroupStandingsPrimary(phase);
  const standings = computeGroupStandings(groupMatches);
  const thirdPlace = computeThirdPlaceTracker(standings);
  const scheduleMatches = standingsPrimary ? groupMatches : undefined;
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const allMatches = [...groupMatches, ...matches];
  const featuredMatch = selectFeaturedMatch(allMatches);
  const previousMatches = selectPreviousMatches(allMatches, {
    excludeMatchId: featuredMatch?.status === "FINISHED" ? featuredMatch.id : undefined,
  });
  const [venueImage, previousVenueImages] = await Promise.all([
    resolveMatchVenueImage(featuredMatch),
    Promise.all(previousMatches.map((match) => resolveMatchVenueImage(match))),
  ]);
  const goalStats = await fetchTournamentGoalStats(allMatches);
  const awards = await buildWorldCupAwards(allMatches, goalStats);
  const records = buildWorldCupRecords(allMatches, goalStats);

  const table = standingsPrimary ? (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Group Standings</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {formatMatchDataSource(source)} · Updated {lastUpdated}
          </p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1">
            <GroupStandingsGrid standings={standings} />
            <ThirdPlaceTracker
              rows={thirdPlace.rows}
              cutlinePoints={thirdPlace.cutlinePoints}
              cutlineGd={thirdPlace.cutlineGd}
            />
            <GroupStageStatus phase={phase} />
          </div>
          <WorldCupStandingsAd />
        </div>
      </div>
    </section>
  ) : (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Knockout Bracket</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {formatMatchDataSource(source)} · Updated {lastUpdated}
          </p>
        </div>
        <div className="mb-3 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-3 text-[13px] text-muted">
          Pathways bracket — zoom out for flags &amp; scores; zoom in for stadium and match
          analysis. Drag to explore both sides of the draw.
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1">
            <BracketTree grouped={grouped} />
          </div>
          <WorldCupStandingsAd />
        </div>
      </div>
    </section>
  );

  return (
    <SportPageShell
      activeSportSlug="world-cup"
      autoRefresh
      rail={<TournamentRail phase={phase} knockoutMatches={matches} />}
      headerAd={<WorldCupAdPlacements />}
      nextEvent={
        <FeaturedMatchCard
          match={featuredMatch}
          groupMatches={groupMatches}
          standings={standings}
          venueImage={venueImage}
        />
      }
      previousEvent={
        <PreviousMatchesSection
          matches={previousMatches}
          venueImages={previousVenueImages}
          groupMatches={groupMatches}
          standings={standings}
        />
      }
      newsAndFacts={<NewsAndFactsSection sportSlug="world-cup" />}
      midAd={<WorldCupMidAd />}
      table={table}
      matches={
        <ScheduleByDay
          todayMatches={todayMatches}
          upcomingMatches={upcomingMatches}
          source={source}
          scheduleMatches={scheduleMatches}
          groupMatches={groupMatches}
          standings={standings}
        />
      }
      howItWorks={
        <SportHowItWorksSection>
          <RulesPrimer phase={phase} />
        </SportHowItWorksSection>
      }
      awards={<WorldCupAwardsSection awards={awards} />}
      records={<WorldCupRecordsSection records={records} />}
    />
  );
}
