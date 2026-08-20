import { ScheduleByDay } from "@/components/bracket/ScheduleByDay";
import {
  LaLigaAdPlacements,
  LaLigaMidAd,
  LaLigaStandingsAd,
} from "@/components/ads/LaLigaAdPlacements";
import { HowLaLigaWorks } from "@/components/laliga/HowLaLigaWorks";
import { LaLigaSeasonRail } from "@/components/laliga/LaLigaSeasonRail";
import { LeagueTable } from "@/components/premier-league/LeagueTable";
import { RaceTracker } from "@/components/premier-league/RaceTracker";
import { FeaturedMatchCard } from "@/components/sports/FeaturedMatchCard";
import { NewsAndFactsSection } from "@/components/sports/NewsAndFactsSection";
import { SportHowItWorksSection } from "@/components/sports/SportHowItWorksSection";
import { SportPageShell } from "@/components/sports/SportPageShell";
import { fetchLaLigaSeason } from "@/lib/la-liga-data";
import { formatMatchDataSource } from "@/lib/match-data-source";
import { selectFeaturedMatch } from "@/lib/match-schedule";

export const revalidate = 120;

export async function LaLigaPageContent() {
  const data = await fetchLaLigaSeason();
  const featuredMatch = selectFeaturedMatch(data.matches);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <SportPageShell
      activeSportSlug="la-liga"
      autoRefresh
      rail={<LaLigaSeasonRail phase={data.phase} seasonLabel={data.seasonLabel} />}
      headerAd={<LaLigaAdPlacements />}
      nextEvent={
        <FeaturedMatchCard
          match={featuredMatch}
          leagueStandings={data.standings}
          titleRace={data.titleRace}
          relegationRace={data.relegationRace}
        />
      }
      newsAndFacts={<NewsAndFactsSection sportSlug="la-liga" />}
      midAd={<LaLigaMidAd />}
      table={
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
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
      }
      matches={
        <ScheduleByDay
          todayMatches={data.todayMatches}
          upcomingMatches={data.upcomingMatches}
          source={data.source}
          scheduleMatches={data.matches}
          title="Matches"
          showSeasonTailWhenEmpty
        />
      }
      howItWorks={
        <SportHowItWorksSection>
          <HowLaLigaWorks phase={data.phase} />
        </SportHowItWorksSection>
      }
    />
  );
}
