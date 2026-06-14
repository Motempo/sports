"use client";

import { useEffect, useRef } from "react";
import { useAdConsent } from "@/components/ads/AdProvider";
import {
  adProvider,
  adsenseClientId,
  getAdSlot,
  isSlotConfigured,
  type AdSlotId,
} from "@/lib/ads-config";
import { cn } from "@/lib/utils";

interface AdSlotProps {
  slot: AdSlotId;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function AdSlot({ slot, className }: AdSlotProps) {
  const { adsAllowed } = useAdConsent();
  const pushed = useRef(false);
  const config = getAdSlot(slot);
  const configured = isSlotConfigured(slot);

  useEffect(() => {
    if (!adsAllowed || !configured || adProvider !== "adsense" || pushed.current) return;

    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // Ad blockers or script load failures — leave reserved space empty.
    }
  }, [adsAllowed, configured]);

  if (!configured) return null;

  return (
    <aside
      aria-label={config.label}
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-3 sm:px-4",
        className
      )}
    >
      <p className="mb-1 w-full text-[10px] font-medium uppercase tracking-wide text-muted/70">
        {config.label}
      </p>
      <div
        className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-surface/30"
        style={{ minHeight: config.minHeight }}
      >
        {adsAllowed && adProvider === "adsense" && (
          <ins
            className="adsbygoogle block w-full"
            style={{ display: "block", minHeight: config.minHeight }}
            data-ad-client={adsenseClientId}
            data-ad-slot={config.adsenseUnitId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
        {adsAllowed && adProvider === "nitro" && (
          <div
            id={config.nitroPlacementId}
            className="nitro-ad w-full"
            style={{ minHeight: config.minHeight }}
          />
        )}
      </div>
    </aside>
  );
}
