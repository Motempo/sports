import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { TournamentAutoRefresh } from "@/components/tournament/TournamentAutoRefresh";

interface SportPageShellProps {
  activeSportSlug: string;
  autoRefresh?: boolean;
  rail: ReactNode;
  headerAd?: ReactNode;
  nextEvent: ReactNode;
  previousEvent?: ReactNode;
  newsAndFacts: ReactNode;
  midAd?: ReactNode;
  table: ReactNode;
  matches: ReactNode;
  howItWorks: ReactNode;
  awards?: ReactNode;
  records?: ReactNode;
}

/** Shared returning-user layout used by every sport page. */
export function SportPageShell({
  activeSportSlug,
  autoRefresh = false,
  rail,
  headerAd,
  nextEvent,
  previousEvent,
  newsAndFacts,
  midAd,
  table,
  matches,
  howItWorks,
  awards,
  records,
}: SportPageShellProps) {
  return (
    <div className="min-h-dvh overflow-x-clip">
      {autoRefresh ? <TournamentAutoRefresh /> : null}
      <Header activeSportSlug={activeSportSlug} />
      <main className="text-[15px] leading-relaxed sm:text-base">
        {rail}
        {headerAd}
        {nextEvent}
        {previousEvent}
        {matches}
        {newsAndFacts}
        {midAd}
        {table}
        {howItWorks}
        {awards}
        {records}
      </main>
      <SiteFooter />
    </div>
  );
}
