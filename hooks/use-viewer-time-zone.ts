"use client";

import { useEffect, useState } from "react";
import { HYDRATION_TIME_ZONE } from "@/lib/match-timezone";

/**
 * IANA zone for kickoff clocks and day groups.
 *
 * The server render and the hydration render both use UTC, so the markup
 * matches on Vercel (UTC) and in any other viewer zone. After paint, the
 * effect stores the browser zone and schedules regroup.
 */
export function useViewerTimeZone(): { timeZone: string; pending: boolean } {
  const [timeZone, setTimeZone] = useState(HYDRATION_TIME_ZONE);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(resolved || HYDRATION_TIME_ZONE);
    setPending(false);
  }, []);

  return { timeZone, pending };
}

/** Caption that stays accurate while the hydration zone is still UTC. */
export function scheduleZoneCaption(timeZone: string, pending: boolean): string {
  if (pending || timeZone === HYDRATION_TIME_ZONE) return "Times in UTC";
  return "Times in your local timezone";
}
