/** Shown when football-data and the open mirror both failed and the page is on the local seed. */
export function LiveDataUnavailableNotice() {
  return (
    <div
      role="status"
      className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
    >
      <p className="text-[14px] font-bold text-foreground sm:text-[15px]">Live data unavailable</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted sm:text-[14px]">
        Scores could not be loaded from the live feed or the community mirror. Fixtures stay
        scheduled with no score, and standings show 0 played. These tables are not match results.
      </p>
    </div>
  );
}
