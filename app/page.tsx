import { BracketTree } from "@/components/bracket/BracketTree";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { Header } from "@/components/Header";
import { FunFactsWidget } from "@/components/widgets/FunFactsWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";
import { fetchMatches, groupMatchesByRound } from "@/lib/football-data";

export const revalidate = 600;

export default async function HomePage() {
  const { matches, source } = await fetchMatches();
  const grouped = groupMatchesByRound(matches);
  const lastUpdated = new Date().toISOString();

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[20px] font-extrabold">Knockout Bracket</h2>
              <p className="text-[12px] text-muted">
                {source === "api" ? "Live data" : "Preview data"} · Updated{" "}
                {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            </div>
            <BracketTree grouped={grouped} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <NewsWidget />
            <FunFactsWidget />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 sm:flex-row sm:justify-between">
          <p className="text-[13px] text-muted">
            © {new Date().getFullYear()} Sports by Motempo · Experiment
          </p>
          <FeedbackButton />
        </div>
      </footer>
    </div>
  );
}
