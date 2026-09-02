interface SeasonProgressBadgeProps {
  progress: number;
  /** Short label under the percentage, e.g. "Season" or "Tournament". */
  scopeLabel?: string;
}

/** Compact pill showing how far through a season or tournament schedule we are. */
export function SeasonProgressBadge({
  progress,
  scopeLabel = "Season",
}: SeasonProgressBadgeProps) {
  return (
    <div
      className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-center text-[11px] font-semibold tabular-nums text-foreground"
      title={`${progress}% of the ${scopeLabel.toLowerCase()} schedule complete`}
    >
      <span>{progress}%</span>
      <span className="block text-[9px] font-medium uppercase tracking-wide text-muted">
        {scopeLabel}
      </span>
    </div>
  );
}
