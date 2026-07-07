import { TeamEmblem } from "@/components/ui/TeamEmblem";
import type { CleanSheetRow, ScorerRow, TournamentAwards } from "@/lib/tournament-awards";

interface TournamentAwardsPanelProps {
  awards: TournamentAwards;
  source: "api" | "seed";
}

function ScorerTable({
  title,
  subtitle,
  rows,
  statLabel,
  getStat,
}: {
  title: string;
  subtitle: string;
  rows: ScorerRow[];
  statLabel: string;
  getStat: (row: ScorerRow) => number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border px-3 py-3 sm:px-4">
        <h3 className="text-[14px] font-bold sm:text-[15px]">{title}</h3>
        <p className="mt-0.5 text-[12px] text-muted sm:text-[13px]">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-[13px] text-muted sm:px-4">
          Leaderboard updates as scorers are confirmed.
        </p>
      ) : (
        <div>
          <div className="grid grid-cols-[2rem_1fr_3rem] gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[2.5rem_1fr_3.5rem] sm:px-4">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">{statLabel}</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={`${title}-${row.playerName}-${row.team.code}`}
              className={`grid grid-cols-[2rem_1fr_3rem] items-center gap-2 px-3 py-2.5 sm:grid-cols-[2.5rem_1fr_3.5rem] sm:px-4 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="text-[13px] font-bold text-muted">{row.rank}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <TeamEmblem team={row.team} size={20} className="!h-5 !w-5 border" />
                  <span className="truncate text-[14px] font-semibold">{row.playerName}</span>
                </div>
                <p className="truncate text-[11px] text-muted sm:text-[12px]">{row.team.name}</p>
              </div>
              <span className="text-right text-[13px] font-bold tabular-nums sm:text-[14px]">
                {getStat(row)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CleanSheetTable({ rows }: { rows: CleanSheetRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border px-3 py-3 sm:px-4">
        <h3 className="text-[14px] font-bold sm:text-[15px]">Golden Glove race</h3>
        <p className="mt-0.5 text-[12px] text-muted sm:text-[13px]">
          Clean sheets by national team (proxy until keeper splits are published)
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-[13px] text-muted sm:px-4">
          Clean-sheet leaders appear once shutouts are recorded.
        </p>
      ) : (
        <div>
          <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[2.5rem_1fr_3.5rem_3.5rem] sm:px-4">
            <span>#</span>
            <span>Team</span>
            <span className="text-right">CS</span>
            <span className="text-right">GA</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row.team.code}
              className={`grid grid-cols-[2rem_1fr_3rem_3rem] items-center gap-2 px-3 py-2.5 sm:grid-cols-[2.5rem_1fr_3.5rem_3.5rem] sm:px-4 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="text-[13px] font-bold text-muted">{row.rank}</span>
              <div className="flex min-w-0 items-center gap-2">
                <TeamEmblem team={row.team} size={20} className="!h-5 !w-5 border" />
                <span className="truncate text-[14px] font-semibold">{row.team.name}</span>
              </div>
              <span className="text-right text-[13px] font-bold tabular-nums sm:text-[14px]">
                {row.cleanSheets}
              </span>
              <span className="text-right text-[12px] tabular-nums text-muted sm:text-[13px]">
                {row.goalsConceded}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TournamentAwardsPanel({ awards, source }: TournamentAwardsPanelProps) {
  const hasData =
    awards.goldenBoot.length > 0 ||
    awards.playmaker.length > 0 ||
    awards.goldenGlove.length > 0 ||
    awards.youngPlayer;

  if (!hasData && awards.source === "unavailable") {
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
          <h2 className="mb-2 text-[18px] font-extrabold sm:text-[20px]">Awards</h2>
          <p className="text-[13px] text-muted sm:text-[14px]">
            Golden Boot and Golden Glove leaderboards will appear once the tournament is under way.
            {source === "seed" ? " Add FOOTBALL_DATA_API_KEY on Vercel for live scorer data." : ""}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Awards</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {awards.source === "api" ? "Live scorer data" : "Clean sheets from results"} · FIFA
            individual prizes
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ScorerTable
            title="Golden Boot"
            subtitle="Top scorers in the tournament"
            rows={awards.goldenBoot}
            statLabel="G"
            getStat={(row) => row.goals}
          />
          <ScorerTable
            title="Playmaker"
            subtitle="Most assists — the creative heartbeat"
            rows={awards.playmaker}
            statLabel="A"
            getStat={(row) => row.assists}
          />
          <CleanSheetTable rows={awards.goldenGlove} />
          {awards.youngPlayer ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="border-b border-border px-3 py-3 sm:px-4">
                <h3 className="text-[14px] font-bold sm:text-[15px]">Young Player Award</h3>
                <p className="mt-0.5 text-[12px] text-muted sm:text-[13px]">
                  Leading scorer born on or after 1 Jan 2002
                </p>
              </div>
              <div className="flex items-center gap-3 px-3 py-4 sm:px-4">
                <TeamEmblem team={awards.youngPlayer.team} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{awards.youngPlayer.playerName}</p>
                  <p className="truncate text-[12px] text-muted sm:text-[13px]">
                    {awards.youngPlayer.team.name} · {awards.youngPlayer.goals} goal
                    {awards.youngPlayer.goals === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-dashed border-border bg-surface/40 px-3 py-4 sm:px-4">
              <h3 className="text-[14px] font-bold sm:text-[15px]">Young Player Award</h3>
              <p className="mt-1 text-[12px] text-muted sm:text-[13px]">
                Watch list fills in once eligible scorers emerge.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
