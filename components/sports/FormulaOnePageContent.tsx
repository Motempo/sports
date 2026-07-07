import { ChampionshipStandings } from "@/components/f1/ChampionshipStandings";
import { HowF1Works } from "@/components/f1/HowF1Works";
import { LastRaceHighlight, SeasonCalendar } from "@/components/f1/SeasonCalendar";
import { SeasonRail } from "@/components/f1/SeasonRail";
import { TitleFightTracker } from "@/components/f1/TitleFightTracker";
import { WeekendSessionsByDay } from "@/components/f1/WeekendSessionsByDay";
import {
  FormulaOneAdPlacements,
  FormulaOneMidAd,
  FormulaOneStandingsAd,
} from "@/components/ads/FormulaOneAdPlacements";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { FunFactsWidget } from "@/components/widgets/FunFactsWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";
import { computeTitleFightInsight, fetchF1SeasonData } from "@/lib/f1-data";
import {
  detectSeasonPhase,
  getActiveGrandPrix,
  getCurrentOrNextGrandPrix,
  getWhatsNextLine,
  showStandingsPrimary,
} from "@/lib/f1-phase";

export async function FormulaOnePageContent() {
  const data = await fetchF1SeasonData();
  const phase = detectSeasonPhase(data.calendar);
  const standingsPrimary = showStandingsPrimary(phase);
  const nextGp = getCurrentOrNextGrandPrix(data.calendar);
  const activeGp = getActiveGrandPrix(data.calendar);
  const whatsNext = getWhatsNextLine(phase, nextGp);
  const titleFight = computeTitleFightInsight(data.driverStandings, data.calendar);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const highlightRound = activeGp?.round ?? nextGp?.round;
  const lastRaceGp = data.lastRaceResults[0]?.gpName;

  const standingsSection = (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Championship Standings</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {data.source === "api" ? "Live data" : "Preview data"} · Updated {lastUpdated}
          </p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1">
            <ChampionshipStandings
              driverStandings={data.driverStandings}
              constructorStandings={data.constructorStandings}
            />
            <TitleFightTracker insight={titleFight} />
          </div>
          <FormulaOneStandingsAd />
        </div>
      </div>
    </section>
  );

  const weekendSection = (
    <WeekendSessionsByDay sessions={data.sessions} source={data.source} />
  );

  const calendarSection = (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Season Calendar</h2>
          {whatsNext && (
            <p className="text-[11px] text-muted sm:text-[12px]">{whatsNext}</p>
          )}
        </div>
        {lastRaceGp && data.lastRaceResults.length > 0 && (
          <LastRaceHighlight gpName={lastRaceGp} results={data.lastRaceResults} />
        )}
        <SeasonCalendar calendar={data.calendar} highlightRound={highlightRound} />
      </div>
    </section>
  );

  const primerSection = (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <HowF1Works phase={phase} />
      </div>
    </section>
  );

  return (
    <div className="min-h-dvh">
      <Header activeSportSlug="formula-1" />

      <main className="text-[15px] leading-relaxed sm:text-base">
        <SeasonRail phase={phase} calendar={data.calendar} season={data.season} />

        <FormulaOneAdPlacements />

        {standingsPrimary ? (
          <>
            {standingsSection}
            {weekendSection}
            <FormulaOneMidAd />
            {calendarSection}
            {primerSection}
          </>
        ) : (
          <>
            {calendarSection}
            <FormulaOneMidAd />
            {standingsSection}
            {weekendSection}
            {primerSection}
          </>
        )}

        <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="h-full">
              <NewsWidget sportSlug="formula-1" />
            </div>
            <div className="h-full">
              <FunFactsWidget sportSlug="formula-1" />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
