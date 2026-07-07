"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetch server data during the tournament so scores update without a manual reload. */
export function TournamentAutoRefresh({ intervalMs = 3 * 60 * 1000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
