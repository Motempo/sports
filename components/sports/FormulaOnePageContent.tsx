import { ChampionshipStandings } from "@/components/f1/ChampionshipStandings";
import { F1AwardsSection } from "@/components/f1/F1AwardsSection";
import { F1RecordsSection } from "@/components/f1/F1RecordsSection";
import { FormulaOneNextEvent } from "@/components/f1/FormulaOneNextEvent";
import { HowF1Works } from "@/components/f1/HowF1Works";
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
import { buildF1Awards } from "@/lib/f1-awards";
import { computeTitleFightInsight, fetchF1SeasonData } from "@/lib/f1-data";
import { buildF1Records } from "@/lib/f1-records";
import { selectFeaturedF1Event } from "@/lib/f1-session-schedule";
import {
  detectSeasonPhase,
  getCurrentOrNextGrandPrix,
} from "@/lib/f1-phase";

export async function FormulaOnePageContent() {
  const data = await fetchF1SeasonData();
  const phase = detectSeasonPhase(data.calendar);
  const nextGp = getCurrentOrNextGrandPrix(data.calendar);
  const titleFight = computeTitleFightInsight(data.driverStandings, data.calendar);
  const awards = buildF1Awards(data);
  const records = buildF1Records(data);
  const featuredEvent = selectFeaturedF1Event(data.sessions, data.calendar);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-dvh">
      <Header activeSportSlug="formula-1" />

      <main className="text-[15px] leading-relaxed sm:text-base">
        <SeasonRail phase={phase} calendar={data.calendar} season={data.season} />

        <FormulaOneAdPlacements />

        <FormulaOneNextEvent event={featuredEvent} titleFight={titleFight} />

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
            <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
              <div className="h-full">
                <NewsWidget sportSlug="formula-1" />
              </div>
              <div className="h-full">
                <FunFactsWidget sportSlug="formula-1" />
              </div>
            </div>
          </div>
        </section>

        <FormulaOneMidAd />

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

        <WeekendSessionsByDay sessions={data.sessions} source={data.source} nextGp={nextGp} />

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
            <HowF1Works phase={phase} />
          </div>
        </section>

        <F1AwardsSection awards={awards} />
        <F1RecordsSection records={records} season={data.season} />
      </main>

      <SiteFooter />
    </div>
  );
}
