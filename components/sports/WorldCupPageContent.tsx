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
import { TournamentRail } from "@/components/tournament/TournamentRail";
import { FunFactsWidget } from "@/components/widgets/FunFactsWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";
import { fetchMatches, groupMatchesByRound } from "@/lib/football-data";
import { computeGroupStandings, computeThirdPlaceTracker } from "@/lib/group-standings";
import {
  detectTournamentPhase,
  getWhatsNextLine,
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
  const whatsNext = getWhatsNextLine(phase);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-dvh">
      <Header activeSportSlug="world-cup" />

      <main className="text-[15px] leading-relaxed sm:text-base">
        <TournamentRail phase={phase} knockoutMatches={matches} />

        <WorldCupAdPlacements />

        {standingsPrimary ? (
          <>
            <section className="border-b border-border">
              <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
                <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-[18px] font-extrabold sm:text-[20px]">Group Standings</h2>
                  <p className="text-[11px] text-muted sm:text-[12px]">
                    {source === "api" ? "Live data" : "Preview data"} · Updated {lastUpdated}
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

            <ScheduleByDay
              todayMatches={todayMatches}
              upcomingMatches={upcomingMatches}
              source={source}
              groupMatches={groupMatches}
              standings={standings}
            />

            <WorldCupMidAd />

            <section className="border-b border-border">
              <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
                <div className="mb-3 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-3 text-[13px] text-muted">
                  Knockout bracket — slot labels show who fills each spot (e.g. 2A = Group A
                  runner-up). Teams appear as groups finish and results come in.
                </div>
                <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-[18px] font-extrabold sm:text-[20px]">Knockout Bracket</h2>
                </div>
                <BracketTree grouped={grouped} />
              </div>
            </section>

            <section className="border-b border-border">
              <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
                <RulesPrimer />
              </div>
            </section>
          </>
        ) : (
          <>
            <ScheduleByDay
              todayMatches={todayMatches}
              upcomingMatches={upcomingMatches}
              source={source}
              groupMatches={groupMatches}
              standings={standings}
            />

            <WorldCupMidAd />

            <section className="border-b border-border">
              <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
                <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-[18px] font-extrabold sm:text-[20px]">Knockout Bracket</h2>
                  <p className="text-[11px] text-muted sm:text-[12px]">
                    {source === "api" ? "Live data" : "Preview data"} · Updated {lastUpdated}
                  </p>
                </div>
                {whatsNext && (
                  <p className="mb-4 text-[13px] text-muted">{whatsNext}</p>
                )}
                <BracketTree grouped={grouped} />
              </div>
            </section>

            {standings.length > 0 && (
              <section className="border-b border-border">
                <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
                  <h2 className="mb-4 text-[18px] font-extrabold sm:text-[20px]">Final Group Standings</h2>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                    <div className="min-w-0 flex-1">
                      <GroupStandingsGrid standings={standings} />
                    </div>
                    <WorldCupStandingsAd />
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="h-full">
              <NewsWidget sportSlug="world-cup" />
            </div>
            <div className="h-full">
              <FunFactsWidget sportSlug="world-cup" />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
