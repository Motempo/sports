import { ChanceAwardCard, type ChanceAwardView } from "@/components/league/ChanceAwardCard";
import { buildLaLigaClubTeamInfo } from "@/lib/la-liga-clubs";
import type { LaLigaAward } from "@/lib/la-liga-awards";

interface LaLigaAwardsSectionProps {
  awards: LaLigaAward[];
}

function toView(award: LaLigaAward): ChanceAwardView {
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
      team: buildLaLigaClubTeamInfo(contender.teamCode, contender.teamName, contender.crest),
      stat: contender.stat,
      statLabel: contender.statLabel,
      winChanceLabel: contender.winChanceLabel,
    })),
  };
}

export function LaLigaAwardsSection({ awards }: LaLigaAwardsSectionProps) {
  if (awards.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface/30">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-5">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Season Awards</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-muted sm:text-[14px]">
            Live progress toward the title, Pichichi, Zamora, Europe places, and survival. The bar
            is how much of the season is finished. The title percentage is a remaining-season proxy:
            each club can still take 3 points from every match left, and a club that cannot catch the
            leader even by winning those matches shows under 1%, not 0%. The Pichichi percentage is a
            share of goals among the scorers shown, so a player yet to score shows under 1%. Zamora,
            Europe, and survival still split today&apos;s table among the names shown. Title and
            Pichichi whole percents add up to 100. Not betting odds.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {awards.map((award) => (
            <ChanceAwardCard
              key={award.id}
              award={toView(award)}
              progressClassName="bg-[#EE334E]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
