import { ScheduleByDay } from "@/components/bracket/ScheduleByDay";
import {
  PremierLeagueAdPlacements,
  PremierLeagueMidAd,
  PremierLeagueStandingsAd,
} from "@/components/ads/PremierLeagueAdPlacements";
import { FeaturedMatchCard } from "@/components/sports/FeaturedMatchCard";
import { NewsAndFactsSection } from "@/components/sports/NewsAndFactsSection";
import { SportHowItWorksSection } from "@/components/sports/SportHowItWorksSection";
import { SportPageShell } from "@/components/sports/SportPageShell";
import { HowPremierLeagueWorks } from "@/components/premier-league/HowPremierLeagueWorks";
import { LeagueTable } from "@/components/premier-league/LeagueTable";
import { PremierLeagueAwardsSection } from "@/components/premier-league/PremierLeagueAwardsSection";
import { PremierLeagueRail } from "@/components/premier-league/PremierLeagueRail";
import { PremierLeagueRecordsSection } from "@/components/premier-league/PremierLeagueRecordsSection";
import { RaceTracker } from "@/components/premier-league/RaceTracker";
import { formatMatchDataSource } from "@/lib/match-data-source";
import { selectFeaturedMatch } from "@/lib/match-schedule";
import { buildPremierLeagueAwards } from "@/lib/premier-league-awards";
import { fetchPremierLeagueSeason } from "@/lib/premier-league-data";
import { buildPremierLeagueRecords } from "@/lib/premier-league-records";

export const revalidate = 120;

export async function PremierLeaguePageContent() {
  const data = await fetchPremierLeagueSeason();
  const awards = await buildPremierLeagueAwards(data.standings, data.matches);
  const records = buildPremierLeagueRecords(data.matches, data.standings);
  const featuredMatch = selectFeaturedMatch(data.matches);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <SportPageShell
      activeSportSlug="premier-league"
      autoRefresh
      rail={<PremierLeagueRail phase={data.phase} seasonLabel={data.seasonLabel} />}
      headerAd={<PremierLeagueAdPlacements />}
      nextEvent={<FeaturedMatchCard match={featuredMatch} />}
      newsAndFacts={<NewsAndFactsSection sportSlug="premier-league" />}
      midAd={<PremierLeagueMidAd />}
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
              <PremierLeagueStandingsAd />
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
          <HowPremierLeagueWorks phase={data.phase} />
        </SportHowItWorksSection>
      }
      awards={<PremierLeagueAwardsSection awards={awards} />}
      records={<PremierLeagueRecordsSection records={records} seasonLabel={data.seasonLabel} />}
    />
  );
}
