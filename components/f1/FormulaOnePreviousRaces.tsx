"use client";

import Image from "next/image";
import { NextEventCard } from "@/components/ui/NextEventCard";
import { PreviousEventsCarousel } from "@/components/ui/PreviousEventsCarousel";
import { previousF1RaceParagraphs } from "@/lib/f1-session-schedule";
import type { F1ConstructorStandingRow, F1GrandPrix, F1StandingRow, F1TitleFightInsight } from "@/lib/f1-types";
import type { VenueImage } from "@/lib/types";
import { getFlagUrl } from "@/lib/utils";

interface FormulaOnePreviousRacesProps {
  races: F1GrandPrix[];
  venueImages: (VenueImage | null)[];
  trackFacts?: (string | null)[];
  titleFight?: F1TitleFightInsight | null;
  driverStandings?: F1StandingRow[];
  constructorStandings?: F1ConstructorStandingRow[];
}

function CountryFlag({ code, name }: { code?: string; name: string }) {
  if (!code) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-border bg-surface text-[13px] font-bold text-muted">
        {name.slice(0, 3).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-border bg-surface shadow-sm">
      <Image
        src={getFlagUrl(code, 80)}
        alt={`${name} flag`}
        width={64}
        height={64}
        className="h-full w-full object-cover"
        unoptimized
      />
    </div>
  );
}

function formatWhen(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function FormulaOnePreviousRaces({
  races,
  venueImages,
  trackFacts = [],
  titleFight,
  driverStandings,
  constructorStandings,
}: FormulaOnePreviousRacesProps) {
  if (races.length === 0) return null;

  return (
    <section className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <h2 className="mb-3 text-[18px] font-extrabold sm:mb-4 sm:text-[20px]">Previous races</h2>
        <PreviousEventsCarousel label="previous races">
          {races.map((gp, index) => (
            <article
              key={gp.round}
              data-carousel-card
              className="w-[min(92vw,42rem)] shrink-0 snap-center scroll-ml-4 first:scroll-ml-0 sm:w-[min(88vw,42rem)]"
            >
              <NextEventCard
                embedded
                kicker={gp.isSprintWeekend ? "Sprint weekend" : "Grand Prix"}
                title={gp.name}
                whenLabel={formatWhen(gp.utcDate)}
                location={`${gp.circuit}, ${gp.country}`}
                paragraphs={previousF1RaceParagraphs(gp, {
                  titleFight,
                  driverStandings,
                  constructorStandings,
                  trackFact: trackFacts[index] ?? null,
                })}
                imageUrl={venueImages[index]?.url}
                imageAlt={venueImages[index]?.alt ?? `${gp.circuit}, ${gp.country}`}
                emblems={<CountryFlag code={gp.countryCode} name={gp.country} />}
              />
            </article>
          ))}
        </PreviousEventsCarousel>
      </div>
    </section>
  );
}
