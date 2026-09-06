"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetch server data so scores update when the page opens and while it stays open. */
export function TournamentAutoRefresh({ intervalMs = 3 * 60 * 1000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
