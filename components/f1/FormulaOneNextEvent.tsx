"use client";

import Image from "next/image";
import { SessionWatchLinks } from "@/components/f1/SessionWatchLinks";
import { NextEventCard } from "@/components/ui/NextEventCard";
import {
  featuredF1EventParagraphs,
  type FeaturedF1Event,
} from "@/lib/f1-session-schedule";
import type { F1ConstructorStandingRow, F1StandingRow, F1TitleFightInsight } from "@/lib/f1-types";
import { getSessionWatchLinks } from "@/lib/f1-watch-links";
import { getFlagUrl } from "@/lib/utils";

interface FormulaOneNextEventProps {
  event: FeaturedF1Event | null;
  titleFight?: F1TitleFightInsight | null;
  driverStandings?: F1StandingRow[];
  constructorStandings?: F1ConstructorStandingRow[];
}

function headingFor(event: FeaturedF1Event): string {
  if (event.status === "complete") return "Last race";
  if (event.kind === "session") return "Next session";
  return "Next race";
}

function formatWhen(utcDate: string, live: boolean, complete: boolean): string {
  if (live) return "Live now";
  const date = new Date(utcDate);
  if (complete) {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export function FormulaOneNextEvent({
  event,
  titleFight,
  driverStandings,
  constructorStandings,
}: FormulaOneNextEventProps) {
  if (!event) return null;

  const live = event.kind === "session" && event.status === "live";
  const complete = event.status === "complete";
  const countryCode =
    event.kind === "session" ? event.session.countryCode : event.gp.countryCode;
  const country = event.kind === "session" ? event.session.country : event.gp.country;
  const title = event.kind === "session" ? event.session.gpName : event.gp.name;
  const kicker =
    event.kind === "session"
      ? event.session.sessionLabel
      : event.gp.isSprintWeekend
        ? "Sprint weekend"
        : "Grand Prix";
  const utcDate = event.kind === "session" ? event.session.utcDate : event.gp.utcDate;
  const location =
    event.kind === "session"
      ? `${event.session.circuit}, ${event.session.country}`
      : `${event.gp.circuit}, ${event.gp.country}`;
  const watchQuery =
    event.kind === "session"
      ? { name: event.session.gpName, circuit: event.session.circuit }
      : { name: event.gp.name, circuit: event.gp.circuit };

  return (
    <NextEventCard
      heading={headingFor(event)}
      live={live}
      kicker={kicker}
      title={title}
      whenLabel={formatWhen(utcDate, live, complete)}
      location={location}
      paragraphs={featuredF1EventParagraphs(event, {
        titleFight,
        driverStandings,
        constructorStandings,
      })}
      watch={
        complete ? null : (
          <SessionWatchLinks links={getSessionWatchLinks(watchQuery.name, watchQuery.circuit)} />
        )
      }
      emblems={<CountryFlag code={countryCode} name={country} />}
    />
  );
}
