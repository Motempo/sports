import { TeamEmblem } from "@/components/ui/TeamEmblem";
import { cn } from "@/lib/utils";
import type { PremierLeagueAward } from "@/lib/premier-league-awards";
import { buildClubTeamInfo } from "@/lib/league-standings";

interface PremierLeagueAwardsSectionProps {
  awards: PremierLeagueAward[];
}

export function PremierLeagueAwardsSection({ awards }: PremierLeagueAwardsSectionProps) {
  if (awards.length === 0) return null;

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-4 sm:py-8">
        <div className="mb-4">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Season races</h2>
          <p className="mt-1 text-[13px] text-muted">
            Points, attack, defence, and the Golden Boot when scorer data is available.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {awards.map((award) => {
            const leader = award.contenders[0];
            return (
              <article
                key={award.id}
                className="flex h-full flex-col rounded-2xl border border-border bg-background p-4"
              >
                <p className="text-2xl leading-none" aria-hidden>
                  {award.emoji}
                </p>
                <h3 className="mt-2 text-[16px] font-extrabold leading-tight">{award.name}</h3>
                <p className="mt-1 mb-3 text-[12px] text-muted">{award.description}</p>
                <div className="space-y-1">
                  {award.contenders.map((contender) => {
                    const team = buildClubTeamInfo(
                      contender.teamCode,
                      contender.teamName,
                      contender.crest
                    );
                    const isLeader = contender.rank === 1;
                    return (
                      <div
                        key={`${award.id}-${contender.rank}-${contender.label}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1.5",
                          isLeader && "bg-surface/80 ring-1 ring-border"
                        )}
                      >
                        <span className="w-4 shrink-0 text-center text-[11px] font-bold tabular-nums text-muted">
                          {contender.rank}
                        </span>
                        <TeamEmblem team={team} size={18} rounded="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{contender.label}</p>
                          {contender.label !== contender.teamName && (
                            <p className="truncate text-[11px] text-muted">{contender.teamName}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-[12px] font-bold tabular-nums">
                          {contender.stat} {contender.statLabel}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {leader && (
                  <p className="mt-auto pt-3 text-[11px] text-muted">
                    Leader: {leader.label}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
