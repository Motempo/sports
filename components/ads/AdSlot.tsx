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
  /** Sidebar: narrow column beside content. Banner: full content width. */
  layout?: "banner" | "sidebar";
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function AdSlot({ slot, className, layout = "banner" }: AdSlotProps) {
  const { adsAllowed } = useAdConsent();
  const pushed = useRef(false);
  const config = getAdSlot(slot);
  const configured = isSlotConfigured(slot);
  const isSidebar = layout === "sidebar" || config.format === "vertical";
  const isVertical = config.format === "vertical";

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

  const adWidth = config.minWidth ?? 300;
  const adHeight = config.minHeight;

  return (
    <aside
      aria-label={config.label}
      className={cn(
        isSidebar
          ? "mx-auto flex w-full max-w-[300px] flex-col items-center lg:mx-0 lg:shrink-0"
          : "mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-3 sm:px-4",
        className
      )}
    >
      <p
        className={cn(
          "mb-1 text-[10px] font-medium uppercase tracking-wide text-muted/70",
          isSidebar ? "w-full text-center lg:text-left" : "w-full"
        )}
      >
        {config.label}
      </p>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-surface/30",
          isSidebar ? "w-full" : "w-full"
        )}
        style={{
          minHeight: adHeight,
          ...(isVertical ? { maxWidth: adWidth, width: "100%" } : {}),
        }}
      >
        {adsAllowed && adProvider === "adsense" && (
          <ins
            className="adsbygoogle"
            style={
              isVertical
                ? {
                    display: "inline-block",
                    width: adWidth,
                    height: adHeight,
                  }
                : { display: "block", minHeight: adHeight, width: "100%" }
            }
            data-ad-client={adsenseClientId}
            data-ad-slot={config.adsenseUnitId}
            {...(isVertical
              ? { "data-full-width-responsive": "false" }
              : {
                  "data-ad-format": "auto",
                  "data-full-width-responsive": "true",
                })}
          />
        )}
        {adsAllowed && adProvider === "nitro" && (
          <div
            id={config.nitroPlacementId}
            className="nitro-ad w-full"
            style={{ minHeight: adHeight, ...(isVertical ? { maxWidth: adWidth } : {}) }}
          />
        )}
      </div>
    </aside>
  );
}
