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
  newsAndFacts: ReactNode;
  midAd?: ReactNode;
  table: ReactNode;
  matches: ReactNode;
  howItWorks: ReactNode;
  awards?: ReactNode;
  records?: ReactNode;
  /**
   * From 900px, place the featured card and the schedule side by side.
   * Callers pass `embedded` chrome so those blocks do not each take a full-width section.
   */
  pairLead?: boolean;
  /**
   * `equal` splits that row in half (Formula 1). `league` keeps the next match
   * within 20rem so three match-day columns fit beside it.
   */
  pairColumns?: "equal" | "league";
}

/** Shared returning-user layout used by every sport page. */
export function SportPageShell({
  activeSportSlug,
  autoRefresh = false,
  rail,
  headerAd,
  nextEvent,
  newsAndFacts,
  midAd,
  table,
  matches,
  howItWorks,
  awards,
  records,
  pairLead = false,
  pairColumns = "equal",
}: SportPageShellProps) {
  return (
    <div className="min-h-dvh overflow-x-clip">
      {autoRefresh ? <TournamentAutoRefresh /> : null}
      <Header activeSportSlug={activeSportSlug} />
      <main id="main-content" tabIndex={-1} className="skip-target text-[15px] leading-relaxed sm:text-base">
        {rail}
        {headerAd}
        {pairLead ? (
          <section className="border-b border-border bg-surface/30">
            <div
              className={
                pairColumns === "league"
                  ? "mx-auto grid max-w-6xl grid-cols-1 items-start gap-3 px-3 py-3 min-[900px]:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] min-[900px]:gap-4 min-[900px]:px-4 min-[900px]:py-4"
                  : "mx-auto grid max-w-6xl grid-cols-1 items-start gap-3 px-3 py-3 min-[900px]:grid-cols-2 min-[900px]:gap-4 min-[900px]:px-4 min-[900px]:py-4"
              }
            >
              <div className="min-w-0">{nextEvent}</div>
              <div className={pairColumns === "league" ? "min-w-0 @container" : "min-w-0"}>{matches}</div>
            </div>
          </section>
        ) : (
          <>
            {nextEvent}
            {matches}
          </>
        )}
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
