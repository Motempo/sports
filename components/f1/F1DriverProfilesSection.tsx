"use client";

import Image from "next/image";
import { getConstructorColor } from "@/lib/f1-constructor-colors";
import type { F1DriverProfile } from "@/lib/f1-profiles";
import { getFlagUrl } from "@/lib/utils";
import { ProfileCarousel } from "@/components/f1/ProfileCarousel";

interface F1DriverProfilesSectionProps {
  drivers: F1DriverProfile[];
  season: number;
}

function DriverProfileCard({ driver }: { driver: F1DriverProfile }) {
  const accent = getConstructorColor(driver.constructorId);

  return (
    <article
      data-carousel-card
      className="relative flex w-[min(78vw,240px)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-background sm:w-[min(42vw,260px)] lg:w-[min(30vw,280px)]"
    >
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: accent }} aria-hidden />

      <div className="flex flex-1 flex-col p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p
            className="text-[42px] font-black leading-none tabular-nums tracking-tight sm:text-[48px]"
            style={{ color: accent }}
          >
            {driver.permanentNumber != null ? driver.permanentNumber : "—"}
          </p>
          <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            P{driver.position}
          </span>
        </div>

        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted">{driver.code}</p>
        <h3 className="mt-1 text-[20px] font-extrabold leading-tight sm:text-[22px]">
          <span className="block text-[13px] font-semibold text-muted">{driver.givenName}</span>
          {driver.familyName}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          {driver.nationalityIso2 && (
            <Image
              src={getFlagUrl(driver.nationalityIso2, 40)}
              alt=""
              width={18}
              height={12}
              className="h-3 w-[18px] rounded-[2px] object-cover"
            />
          )}
          <span>{driver.nationality ?? "Nationality TBA"}</span>
        </div>

        {(driver.age != null || driver.birthLabel) && (
          <p className="mt-1 text-[12px] text-muted">
            {driver.age != null ? `Age ${driver.age}` : null}
            {driver.age != null && driver.birthLabel ? " · " : null}
            {driver.birthLabel}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <p className="truncate text-[13px] font-semibold">{driver.constructorName}</p>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Pts</dt>
            <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums">{driver.points}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Wins</dt>
            <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums">{driver.wins}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Starts</dt>
            <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums">{driver.starts}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function F1DriverProfilesSection({ drivers, season }: F1DriverProfilesSectionProps) {
  if (drivers.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface/30">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-2">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Driver Profiles</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted sm:text-[14px]">
            Number, nationality, team, and {season} form — the quick-read cards commentators pull up
            between sessions. Swipe or use the arrows to browse the grid.
          </p>
        </div>

        <ProfileCarousel label="driver profiles">
          {drivers.map((driver) => (
            <DriverProfileCard key={driver.id} driver={driver} />
          ))}
        </ProfileCarousel>
      </div>
    </section>
  );
}
