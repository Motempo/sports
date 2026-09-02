import { ChampionshipStandings } from "@/components/f1/ChampionshipStandings";
import { F1AwardsSection } from "@/components/f1/F1AwardsSection";
import { F1RecordsSection } from "@/components/f1/F1RecordsSection";
import { F1TrackProfilesSection } from "@/components/f1/F1TrackProfilesSection";
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
import { NewsAndFactsSection } from "@/components/sports/NewsAndFactsSection";
import { SportHowItWorksSection } from "@/components/sports/SportHowItWorksSection";
import { SportPageShell } from "@/components/sports/SportPageShell";
import { buildF1Awards } from "@/lib/f1-awards";
import { buildTrackProfiles, getCircuitTrackFact } from "@/lib/f1-circuit-facts";
import { computeTitleFightInsight, fetchF1SeasonData } from "@/lib/f1-data";
import { buildF1Records } from "@/lib/f1-records";
import { selectFeaturedF1Event } from "@/lib/f1-session-schedule";
import { resolveVenueImage } from "@/lib/venue-image";
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
  const tracks = buildTrackProfiles(data);
  const featuredEvent = selectFeaturedF1Event(data.sessions, data.calendar);
  const circuit =
    featuredEvent?.kind === "session" ? featuredEvent.session.circuit : featuredEvent?.gp.circuit;
  const circuitId =
    featuredEvent?.kind === "session"
      ? featuredEvent.session.circuitId
      : featuredEvent?.gp.circuitId;
  const country =
    featuredEvent?.kind === "session" ? featuredEvent.session.country : featuredEvent?.gp.country;
  const [venueImage, trackFact] = await Promise.all([
    circuit ? resolveVenueImage({ kind: "circuit", name: circuit, hint: country }) : null,
    circuit ? getCircuitTrackFact({ circuitId, circuitName: circuit }) : null,
  ]);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <SportPageShell
      activeSportSlug="formula-1"
      rail={<SeasonRail phase={phase} calendar={data.calendar} season={data.season} />}
      headerAd={<FormulaOneAdPlacements />}
      nextEvent={
        <FormulaOneNextEvent
          event={featuredEvent}
          titleFight={titleFight}
          driverStandings={data.driverStandings}
          constructorStandings={data.constructorStandings}
          venueImage={venueImage}
          trackFact={trackFact}
        />
      }
      newsAndFacts={<NewsAndFactsSection sportSlug="formula-1" />}
      midAd={<FormulaOneMidAd />}
      table={
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
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
      }
      matches={
        <WeekendSessionsByDay sessions={data.sessions} source={data.source} nextGp={nextGp} />
      }
      howItWorks={
        <SportHowItWorksSection>
          <HowF1Works phase={phase} />
        </SportHowItWorksSection>
      }
      awards={
        <>
          <F1TrackProfilesSection
            tracks={tracks}
            season={data.season}
            activeTrackRound={nextGp?.round}
          />
          <F1AwardsSection awards={awards} />
        </>
      }
      records={<F1RecordsSection records={records} season={data.season} />}
    />
  );
}
