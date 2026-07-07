import type { TournamentRecords } from "@/lib/tournament-records";

interface TournamentRecordsPanelProps {
  records: TournamentRecords;
}

export function TournamentRecordsPanel({ records }: TournamentRecordsPanelProps) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">Records</h2>
          <p className="text-[11px] text-muted sm:text-[12px]">
            {records.finishedMatches > 0
              ? `${records.totalGoals} goals across ${records.finishedMatches} finished matches`
              : "Updates as results come in"}
          </p>
        </div>

        {records.items.length === 0 ? (
          <p className="text-[13px] text-muted sm:text-[14px]">
            Tournament records will appear once matches kick off.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {records.items.map((record) => (
              <div
                key={record.label}
                className="rounded-2xl border border-border bg-background px-3 py-3 sm:px-4 sm:py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {record.label}
                </p>
                <p className="mt-1 text-[18px] font-extrabold tabular-nums sm:text-[20px]">
                  {record.value}
                </p>
                {record.detail && (
                  <p className="mt-1 text-[12px] leading-snug text-muted sm:text-[13px]">
                    {record.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
