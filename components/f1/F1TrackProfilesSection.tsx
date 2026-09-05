"use client";

import Image from "next/image";
import { ProfileCarousel } from "@/components/f1/ProfileCarousel";
import {
  selectActiveTrackProfile,
  trackProfileKey,
  type F1TrackProfile,
} from "@/lib/f1-profiles";
import type { F1GrandPrixStatus } from "@/lib/f1-types";
import { getFlagUrl } from "@/lib/utils";

interface F1TrackProfilesSectionProps {
  tracks: F1TrackProfile[];
  season: number;
  activeTrackRound?: number;
}

function trackStatusLabel(status: F1GrandPrixStatus): string {
  switch (status) {
    case "completed":
      return "Raced";
    case "current":
      return "This weekend";
    case "cancelled":
      return "Cancelled";
    default:
      return "Upcoming";
  }
}

function TrackProfileCard({
  track,
  isActive,
}: {
  track: F1TrackProfile;
  isActive: boolean;
}) {
  const when = new Date(`${track.date}T12:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <article
      data-carousel-card
      data-carousel-active={isActive ? "true" : undefined}
      className="relative flex w-[min(78vw,260px)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-background sm:w-[min(42vw,280px)] lg:w-[min(30vw,300px)]"
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[#E10600]" aria-hidden />

      <div className="flex flex-1 flex-col p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-[42px] font-black leading-none tabular-nums tracking-tight text-[#E10600] sm:text-[48px]">
            {track.round}
          </p>
          <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            {trackStatusLabel(track.status)}
          </span>
        </div>

        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted">{when}</p>
        <h3 className="mt-1 text-[18px] font-extrabold leading-tight sm:text-[20px]">{track.gpName}</h3>
        <p className="mt-1 text-[13px] font-semibold text-foreground/80">{track.circuitName}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          {track.countryCode && (
            <Image
              src={getFlagUrl(track.countryCode, 40)}
              alt=""
              width={18}
              height={12}
              className="h-3 w-[18px] rounded-[2px] object-cover"
            />
          )}
          <span>{track.country}</span>
          {track.isSprintWeekend ? (
            <span className="rounded-full bg-[#E10600]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#E10600]">
              Sprint
            </span>
          ) : null}
        </div>

        <p className="mt-4 line-clamp-4 text-[13px] leading-snug text-muted">{track.blurb}</p>

        <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Round</dt>
            <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums">{track.round}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {track.winner ? "Winner" : "Status"}
            </dt>
            <dd className="mt-0.5 truncate text-[15px] font-extrabold">
              {track.winner ?? trackStatusLabel(track.status)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function F1TrackProfilesSection({
  tracks,
  season,
  activeTrackRound,
}: F1TrackProfilesSectionProps) {
  if (tracks.length === 0) return null;

  const activeTrack =
    (activeTrackRound != null
      ? tracks.find((track) => track.round === activeTrackRound)
      : undefined) ?? selectActiveTrackProfile(tracks);
  const activeTrackId = activeTrack ? trackProfileKey(activeTrack) : undefined;

  return (
    <section className="border-t border-border bg-surface/30">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-2">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Track Profiles</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted sm:text-[14px]">
            Every {season} venue at a glance — circuit character, sprint weekends, and who took the
            flag when the race is done. Swipe or use the arrows to tour the calendar.
          </p>
        </div>

        <ProfileCarousel label="track profiles" activeCardId={activeTrackId}>
          {tracks.map((track) => (
            <TrackProfileCard
              key={trackProfileKey(track)}
              track={track}
              isActive={trackProfileKey(track) === activeTrackId}
            />
          ))}
        </ProfileCarousel>
      </div>
    </section>
  );
}
