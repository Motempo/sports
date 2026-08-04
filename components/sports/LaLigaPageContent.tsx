import { ScheduleByDay } from "@/components/bracket/ScheduleByDay";
import {
  LaLigaAdPlacements,
  LaLigaMidAd,
  LaLigaStandingsAd,
} from "@/components/ads/LaLigaAdPlacements";
import { Header } from "@/components/Header";
import { HowLaLigaWorks } from "@/components/laliga/HowLaLigaWorks";
import { LaLigaRecordsSection } from "@/components/laliga/LaLigaRecordsSection";
import { LaLigaSeasonRail } from "@/components/laliga/LaLigaSeasonRail";
import { LeagueTable } from "@/components/laliga/LeagueTable";
import { RaceTracker } from "@/components/laliga/RaceTracker";
import { SiteFooter } from "@/components/SiteFooter";
import { TournamentAutoRefresh } from "@/components/tournament/TournamentAutoRefresh";
import { FunFactsWidget } from "@/components/widgets/FunFactsWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";
import { fetchLaLigaSeason } from "@/lib/la-liga-data";
import {
  getLaLigaWhatsNext,
  showLaLigaStandingsPrimary,
} from "@/lib/la-liga-phase";
import { buildLaLigaRecords } from "@/lib/la-liga-records";
import { formatMatchDataSource } from "@/lib/match-data-source";

export const revalidate = 120;

export async function LaLigaPageContent() {
  const data = await fetchLaLigaSeason();
  const standingsPrimary = showLaLigaStandingsPrimary(data.phase);
  const whatsNext = getLaLigaWhatsNext(data.phase, data.standings.matchday);
  const records = buildLaLigaRecords(data);
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
          <LaLigaStandingsAd />
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
    />
  );

  const primerSection = (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
        {whatsNext && <p className="mb-4 text-[13px] text-muted">{whatsNext}</p>}
        <HowLaLigaWorks phase={data.phase} />
      </div>
    </section>
  );

  return (
    <div className="min-h-dvh overflow-x-clip">
      <TournamentAutoRefresh />
      <Header activeSportSlug="la-liga" />

      <main className="text-[15px] leading-relaxed sm:text-base">
        <LaLigaSeasonRail phase={data.phase} seasonLabel={data.seasonLabel} />

        <LaLigaAdPlacements />

        {standingsPrimary ? (
          <>
            {standingsSection}
            {fixturesSection}
            <LaLigaMidAd />
            {primerSection}
          </>
        ) : (
          <>
            {fixturesSection}
            <LaLigaMidAd />
            {standingsSection}
            {primerSection}
          </>
        )}

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-4 sm:py-8">
          <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="h-full">
              <NewsWidget sportSlug="la-liga" />
            </div>
            <div className="h-full">
              <FunFactsWidget sportSlug="la-liga" />
            </div>
          </div>
        </section>

        <LaLigaRecordsSection records={records} seasonLabel={data.seasonLabel} />
      </main>

      <SiteFooter />
    </div>
  );
}
