import { ScheduleByDay } from "@/components/bracket/ScheduleByDay";
import {
  PremierLeagueAdPlacements,
  PremierLeagueMidAd,
  PremierLeagueStandingsAd,
} from "@/components/ads/PremierLeagueAdPlacements";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { HowPremierLeagueWorks } from "@/components/premier-league/HowPremierLeagueWorks";
import { LeagueTable } from "@/components/premier-league/LeagueTable";
import { PremierLeagueAwardsSection } from "@/components/premier-league/PremierLeagueAwardsSection";
import { PremierLeagueRail } from "@/components/premier-league/PremierLeagueRail";
import { PremierLeagueRecordsSection } from "@/components/premier-league/PremierLeagueRecordsSection";
import { RaceTracker } from "@/components/premier-league/RaceTracker";
import { TournamentAutoRefresh } from "@/components/tournament/TournamentAutoRefresh";
import { FunFactsWidget } from "@/components/widgets/FunFactsWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";
import { formatMatchDataSource } from "@/lib/match-data-source";
import { buildPremierLeagueAwards } from "@/lib/premier-league-awards";
import { fetchPremierLeagueSeason } from "@/lib/premier-league-data";
import {
  getPremierLeagueWhatsNext,
  showStandingsPrimary,
} from "@/lib/premier-league-phase";
import { buildPremierLeagueRecords } from "@/lib/premier-league-records";

export const revalidate = 120;

export async function PremierLeaguePageContent() {
  const data = await fetchPremierLeagueSeason();
  const standingsPrimary = showStandingsPrimary(data.phase);
  const whatsNext = getPremierLeagueWhatsNext(data.phase, data.standings.matchday);
  const awards = await buildPremierLeagueAwards(data.standings, data.matches);
  const records = buildPremierLeagueRecords(data.matches, data.standings);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const standingsSection = (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">League Table</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {formatMatchDataSource(data.source)} · Updated {lastUpdated}
          </p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1">
            <LeagueTable standings={data.standings} />
            <RaceTracker titleRace={data.titleRace} relegationRace={data.relegationRace} />
          </div>
          <PremierLeagueStandingsAd />
        </div>
      </div>
    </section>
  );

  const fixturesSection = (
    <ScheduleByDay
      todayMatches={data.todayMatches}
      upcomingMatches={data.upcomingMatches}
      source={data.source}
      scheduleMatches={data.matches}
      title={data.phase === "COMPLETE" ? "Final fixtures" : "Fixtures & results"}
      showSeasonTailWhenEmpty
    />
  );

  const primerSection = (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
        {whatsNext && (
          <p className="mb-4 text-[13px] text-muted">{whatsNext}</p>
        )}
        <HowPremierLeagueWorks phase={data.phase} />
      </div>
    </section>
  );

  return (
    <div className="min-h-dvh overflow-x-clip">
      <TournamentAutoRefresh />
      <Header activeSportSlug="premier-league" />

      <main className="text-[15px] leading-relaxed sm:text-base">
        <PremierLeagueRail phase={data.phase} seasonLabel={data.seasonLabel} />

        <PremierLeagueAdPlacements />

        {standingsPrimary ? (
          <>
            {standingsSection}
            {fixturesSection}
            <PremierLeagueMidAd />
            {primerSection}
          </>
        ) : (
          <>
            {fixturesSection}
            <PremierLeagueMidAd />
            {standingsSection}
            {primerSection}
          </>
        )}

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-4 sm:py-8">
          <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="h-full">
              <NewsWidget sportSlug="premier-league" />
            </div>
            <div className="h-full">
              <FunFactsWidget sportSlug="premier-league" />
            </div>
          </div>
        </section>

        <PremierLeagueAwardsSection awards={awards} />
        <PremierLeagueRecordsSection records={records} seasonLabel={data.seasonLabel} />
      </main>

      <SiteFooter />
    </div>
  );
}
