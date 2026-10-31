import { ChanceAwardCard, type ChanceAwardView } from "@/components/league/ChanceAwardCard";
import { TeamEmblem } from "@/components/ui/TeamEmblem";
import { buildClubTeamInfo } from "@/lib/league-standings";
import type {
  PremierLeagueAward,
  PremierLeagueChanceAward,
} from "@/lib/premier-league-awards";
import { cn } from "@/lib/utils";

interface PremierLeagueAwardsSectionProps {
  chanceAwards: PremierLeagueChanceAward[];
  awards: PremierLeagueAward[];
}

function clubTeam(code: string, name: string, crest?: string) {
  return { ...buildClubTeamInfo(code, name, crest), iso2: "gb-eng" };
}

function toView(award: PremierLeagueChanceAward): ChanceAwardView {
  return {
    id: award.id,
    name: award.name,
    sponsor: award.sponsor,
    emoji: award.emoji,
    description: award.description,
    progress: award.progress,
    commentary: award.commentary,
    contenders: award.contenders.map((contender) => ({
      rank: contender.rank,
      label: contender.label,
      teamName: contender.teamName,
      team: clubTeam(contender.teamCode, contender.teamName, contender.crest),
      stat: contender.stat,
      statLabel: contender.statLabel,
      winChanceLabel: contender.winChanceLabel,
    })),
  };
}

export function PremierLeagueAwardsSection({
  chanceAwards,
  awards,
}: PremierLeagueAwardsSectionProps) {
  if (chanceAwards.length === 0 && awards.length === 0) return null;
  const hasScorers = chanceAwards.some((award) => award.id === "golden-boot");

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-5">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Season races</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted sm:text-[14px]">
            The title percentage projects each club&apos;s final points from its points per match,
            blended toward the league average, with a spread that tightens as the matches run out. A
            club that cannot catch the leader even by winning every match left shows under 1%, not 0%.
            {hasScorers
              ? " The Golden Boot percentage projects goals the same way, from the scoring rate and the matches the club has left."
              : " The Golden Boot card appears when scorer data is available."}{" "}
            Whole percents on each chance card add up to 100. Not betting odds.
          </p>
        </div>

        {chanceAwards.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {chanceAwards.map((award) => (
              <ChanceAwardCard
                key={award.id}
                award={toView(award)}
                progressClassName="bg-[#00FF85]"
              />
            ))}
          </div>
        ) : null}

        {awards.length > 0 ? (
          <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", chanceAwards.length > 0 && "mt-4")}>
            {awards.map((award) => (
              <article
                key={award.id}
                className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-background p-4"
              >
                <p className="text-2xl leading-none" aria-hidden>
                  {award.emoji}
                </p>
                <h3 className="mt-2 text-[16px] font-extrabold leading-tight">{award.name}</h3>
                <p className="mt-1 mb-3 text-[12px] text-muted">{award.description}</p>
                <div className="space-y-1">
                  {award.contenders.map((contender) => {
                    const team = clubTeam(contender.teamCode, contender.teamName, contender.crest);
                    const isLeader = contender.rank === 1;
                    return (
                      <div
                        key={`${award.id}-${contender.rank}-${contender.label}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1.5",
                          isLeader ? "bg-surface/80 ring-1 ring-border" : undefined
                        )}
                      >
                        <span className="w-4 shrink-0 text-center text-[11px] font-bold tabular-nums text-muted">
                          {contender.rank}
                        </span>
                        <TeamEmblem team={team} size={18} rounded="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{contender.label}</p>
                          {contender.label !== contender.teamName ? (
                            <p className="truncate text-[11px] text-muted">{contender.teamName}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-[12px] font-bold tabular-nums">
                          {contender.stat} {contender.statLabel}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
