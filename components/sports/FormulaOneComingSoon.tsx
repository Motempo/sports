import Link from "next/link";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { CURRENT_SPORT_SLUG } from "@/lib/sports";

export function FormulaOneComingSoon() {
  return (
    <div className="min-h-dvh">
      <Header activeSportSlug="formula-1" />

      <main className="mx-auto max-w-6xl px-3 py-12 sm:px-4 sm:py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-[28px] font-extrabold sm:text-[32px]">Formula 1</h1>
          <p className="mt-2 text-[15px] text-muted">Coming soon</p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Race calendar, standings, and live session updates are on the way. For now, follow the
            FIFA World Cup 2026.
          </p>
          {CURRENT_SPORT_SLUG === "world-cup" && (
            <Link
              href="/world-cup"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-link px-5 text-[15px] font-semibold text-white transition-opacity active:opacity-80"
            >
              Go to World Cup 2026
            </Link>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
