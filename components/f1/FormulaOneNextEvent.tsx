"use client";

import { CountryFlag } from "@/components/f1/CountryFlag";
import { NextEventCard } from "@/components/ui/NextEventCard";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import {
  featuredF1EventParagraphs,
  type FeaturedF1Event,
} from "@/lib/f1-session-schedule";
import type { F1ConstructorStandingRow, F1StandingRow, F1TitleFightInsight } from "@/lib/f1-types";
import type { VenueImage } from "@/lib/types";
import { formatViewerDateTime } from "@/lib/match-timezone";

interface FormulaOneNextEventProps {
  event: FeaturedF1Event | null;
  titleFight?: F1TitleFightInsight | null;
  driverStandings?: F1StandingRow[];
  constructorStandings?: F1ConstructorStandingRow[];
  venueImage?: VenueImage | null;
  trackFact?: string | null;
}

function headingFor(event: FeaturedF1Event): string {
  if (event.status === "complete") return "Last race";
  if (event.kind === "session") return "Next session";
  return "Next race";
}

function formatWhen(utcDate: string, timeZone: string, live: boolean, complete: boolean): string {
  if (live) return "Live now";
  if (complete) {
    return formatViewerDateTime(utcDate, timeZone, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return formatViewerDateTime(utcDate, timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FormulaOneNextEvent({
  event,
  titleFight,
  driverStandings,
  constructorStandings,
  venueImage,
  trackFact,
}: FormulaOneNextEventProps) {
  const { timeZone } = useViewerTimeZone();
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

  return (
    <NextEventCard
      heading={headingFor(event)}
      live={live}
      kicker={kicker}
      title={title}
      whenLabel={formatWhen(utcDate, timeZone, live, complete)}
      whenDateTime={utcDate}
      location={location}
      paragraphs={featuredF1EventParagraphs(event, {
        titleFight,
        driverStandings,
        constructorStandings,
        trackFact,
      })}
      emblems={<CountryFlag code={countryCode} name={country} />}
      imageUrl={venueImage?.url}
      imageAlt={venueImage?.alt ?? location}
      imageWidth={venueImage?.width}
      imageHeight={venueImage?.height}
    />
  );
}
