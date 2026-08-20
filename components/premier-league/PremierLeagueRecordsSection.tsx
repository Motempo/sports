import { TeamEmblem } from "@/components/ui/TeamEmblem";
import type { PremierLeagueRecord } from "@/lib/premier-league-records";
import { buildClubTeamInfo } from "@/lib/league-standings";

interface PremierLeagueRecordsSectionProps {
  records: PremierLeagueRecord[];
  seasonLabel: string;
}

export function PremierLeagueRecordsSection({
  records,
  seasonLabel,
}: PremierLeagueRecordsSectionProps) {
  if (records.length === 0) return null;

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-4 sm:py-8">
        <div className="mb-4">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Season marks</h2>
          <p className="mt-1 text-[13px] text-muted">
            Blowouts, streaks, clean sheets, and other standout numbers from {seasonLabel}.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {records.map((record) => {
            const team = record.mark.teamCode
              ? buildClubTeamInfo(record.mark.teamCode, record.mark.holder, record.mark.crest)
              : null;
            return (
              <article
                key={record.id}
                className="flex h-full flex-col rounded-2xl border border-border bg-background p-4"
              >
                <p className="text-2xl leading-none" aria-hidden>
                  {record.emoji}
                </p>
                <h3 className="mt-2 text-[16px] font-extrabold leading-tight">{record.name}</h3>
                <p className="mt-1 text-[12px] text-muted">{record.description}</p>
                <div className="mt-4 rounded-xl border border-border bg-surface/40 p-3">
                  <p className="text-[20px] font-extrabold tabular-nums leading-tight">
                    {record.mark.value}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {team && <TeamEmblem team={team} size={18} rounded="md" />}
                    <p className="min-w-0 truncate text-[13px] font-semibold">
                      {record.mark.holder}
                    </p>
                  </div>
                  {record.mark.context && (
                    <p className="mt-1 text-[11px] text-muted">{record.mark.context}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
