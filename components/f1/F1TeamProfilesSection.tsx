"use client";

import Image from "next/image";
import { getConstructorColor } from "@/lib/f1-constructor-colors";
import type { F1TeamProfile } from "@/lib/f1-profiles";
import { getFlagUrl } from "@/lib/utils";
import { ProfileCarousel } from "@/components/f1/ProfileCarousel";

interface F1TeamProfilesSectionProps {
  teams: F1TeamProfile[];
  season: number;
}

function TeamProfileCard({ team }: { team: F1TeamProfile }) {
  const accent = getConstructorColor(team.id);

  return (
    <article
      data-carousel-card
      className="flex w-[min(78vw,240px)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-background sm:w-[min(42vw,260px)] lg:w-[min(30vw,280px)]"
    >
      <div className="h-2 w-full" style={{ backgroundColor: accent }} aria-hidden />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Constructor
            </p>
            <h3 className="mt-1 text-[20px] font-extrabold leading-tight sm:text-[22px]">
              {team.name.replace(/ F1 Team$/i, "")}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            P{team.position}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
          {team.nationalityIso2 && (
            <Image
              src={getFlagUrl(team.nationalityIso2, 40)}
              alt=""
              width={18}
              height={12}
              className="h-3 w-[18px] rounded-[2px] object-cover"
            />
          )}
          <span>{team.nationality ?? "Nationality TBA"}</span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Pts</dt>
            <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums">{team.points}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Wins</dt>
            <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums">{team.wins}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Gap</dt>
            <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums">
              {team.gapToLeader === 0 ? "—" : team.gapToLeader}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Driver line-up
          </p>
          <ul className="space-y-2">
            {team.drivers.length > 0 ? (
              team.drivers.map((driver) => (
                <li key={driver.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {driver.permanentNumber != null ? (
                        <span className="mr-1.5 tabular-nums text-muted">#{driver.permanentNumber}</span>
                      ) : null}
                      {driver.name.split(" ").pop()}
                    </p>
                    <p className="text-[11px] uppercase tracking-wide text-muted">{driver.code}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-[12px] font-bold">{driver.points}</span>
                </li>
              ))
            ) : (
              <li className="text-[12px] text-muted">Line-up TBA</li>
            )}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function F1TeamProfilesSection({ teams, season }: F1TeamProfilesSectionProps) {
  if (teams.length === 0) return null;

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-2">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Team Profiles</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted sm:text-[14px]">
            Constructor standings, nationality, and the current pairing — the same snapshot
            team pages open with on F1.com and ESPN. Swipe or use the arrows to browse {season}
            &apos;s grid.
          </p>
        </div>

        <ProfileCarousel label="team profiles">
          {teams.map((team) => (
            <TeamProfileCard key={team.id} team={team} />
          ))}
        </ProfileCarousel>
      </div>
    </section>
  );
}
