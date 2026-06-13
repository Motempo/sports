import { BracketTree } from "@/components/bracket/BracketTree";
import { CurrentMatches } from "@/components/bracket/CurrentMatches";
import { ReportBugLink } from "@/components/feedback/ReportBugLink";
import { Header } from "@/components/Header";
import { FunFactsWidget } from "@/components/widgets/FunFactsWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";
import { fetchMatches, groupMatchesByRound } from "@/lib/football-data";

export const revalidate = 120;

export default async function HomePage() {
  const { matches, currentMatches, source } = await fetchMatches();
  const grouped = groupMatchesByRound(matches);
  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-dvh">
      <Header />

      <main>
        <CurrentMatches matches={currentMatches} source={source} />

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
            <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[18px] font-extrabold sm:text-[20px]">Knockout Bracket</h2>
              <p className="text-[11px] text-muted sm:text-[12px]">
                {source === "api" ? "Live data" : "Preview data"} · Updated {lastUpdated}
              </p>
            </div>
            <BracketTree grouped={grouped} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <NewsWidget />
            <FunFactsWidget />
          </div>
        </section>
      </main>

      <footer className="border-t border-border safe-bottom">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-3 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-8">
          <p className="text-center text-[13px] text-muted sm:text-left">
            © {new Date().getFullYear()} Sports by Motempo · Experiment
          </p>
          <div className="flex justify-center sm:justify-end">
            <ReportBugLink variant="footer" />
          </div>
        </div>
      </footer>
    </div>
  );
}
