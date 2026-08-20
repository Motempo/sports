import { BracketTree } from "@/components/bracket/BracketTree";
import { ScheduleByDay } from "@/components/bracket/ScheduleByDay";
import {
  WorldCupMidAd,
  WorldCupStandingsAd,
  WorldCupAdPlacements,
} from "@/components/ads/WorldCupAdPlacements";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { GroupStandingsGrid } from "@/components/tournament/GroupStandingsGrid";
import { GroupStageStatus } from "@/components/tournament/GroupStageStatus";
import { RulesPrimer } from "@/components/tournament/RulesPrimer";
import { ThirdPlaceTracker } from "@/components/tournament/ThirdPlaceTracker";
import { TournamentAutoRefresh } from "@/components/tournament/TournamentAutoRefresh";
import { TournamentRail } from "@/components/tournament/TournamentRail";
import { WorldCupNextEvent } from "@/components/tournament/WorldCupNextEvent";
import { FunFactsWidget } from "@/components/widgets/FunFactsWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";
import { WorldCupAwardsSection } from "@/components/tournament/WorldCupAwardsSection";
import { WorldCupRecordsSection } from "@/components/tournament/WorldCupRecordsSection";
import { fetchMatches, groupMatchesByRound } from "@/lib/football-data";
import { formatMatchDataSource } from "@/lib/match-data-source";
import { selectFeaturedMatch } from "@/lib/match-schedule";
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
  const goalStats = await fetchTournamentGoalStats(allMatches);
  const awards = await buildWorldCupAwards(allMatches, goalStats);
  const records = buildWorldCupRecords(allMatches, goalStats);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <TournamentAutoRefresh />
      <Header activeSportSlug="world-cup" />

      <main className="text-[15px] leading-relaxed sm:text-base">
        <TournamentRail phase={phase} knockoutMatches={matches} />

        <WorldCupAdPlacements />

        <WorldCupNextEvent
          match={featuredMatch}
          groupMatches={groupMatches}
          standings={standings}
        />

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-4 sm:py-8">
            <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
              <div className="h-full">
                <NewsWidget sportSlug="world-cup" />
              </div>
              <div className="h-full">
                <FunFactsWidget sportSlug="world-cup" />
              </div>
            </div>
          </div>
        </section>

        <WorldCupMidAd />

        {standingsPrimary ? (
          <section className="border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
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
            <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
              <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[18px] font-extrabold sm:text-[20px]">Knockout Bracket</h2>
                <p className="text-[11px] text-muted sm:text-[12px]">
                  {formatMatchDataSource(source)} · Updated {lastUpdated}
                </p>
              </div>
              <div className="mb-3 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-3 text-[13px] text-muted">
                Pathways bracket — zoom out for flags &amp; scores; zoom in for stadium and
                match analysis. Drag to explore both sides of the draw.
              </div>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                <div className="min-w-0 flex-1">
                  <BracketTree grouped={grouped} />
                </div>
                <WorldCupStandingsAd />
              </div>
            </div>
          </section>
        )}

        <ScheduleByDay
          todayMatches={todayMatches}
          upcomingMatches={upcomingMatches}
          source={source}
          scheduleMatches={scheduleMatches}
          groupMatches={groupMatches}
          standings={standings}
        />

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
            <RulesPrimer phase={phase} />
          </div>
        </section>

        <WorldCupAwardsSection awards={awards} />
        <WorldCupRecordsSection records={records} />
      </main>

      <SiteFooter />
    </div>
  );
}
