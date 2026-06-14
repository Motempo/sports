"use client";

import { AdSlot } from "@/components/ads/AdSlot";
import { adsPlacementsLive } from "@/lib/ads-config";

/**
 * World Cup ad placements — hidden until NEXT_PUBLIC_ADS_PLACEMENTS_LIVE=true.
 * Import this in WorldCupPageContent when AdSense is authorized.
 */
export function WorldCupAdPlacements() {
  if (!adsPlacementsLive) return null;

  return (
    <>
      <AdSlot slot="header-leaderboard" className="border-b border-border py-3 sm:py-4" />
    </>
  );
}

/** Mid-content banner between schedule and bracket. */
export function WorldCupMidAd() {
  if (!adsPlacementsLive) return null;

  return <AdSlot slot="mid-content" className="border-b border-border py-4 sm:py-5" />;
}

/** Desktop sidebar beside group standings. */
export function WorldCupStandingsAd() {
  if (!adsPlacementsLive) return null;

  return (
    <AdSlot
      slot="standings-sidebar"
      layout="sidebar"
      className="hidden lg:flex lg:sticky lg:top-20 lg:self-start"
    />
  );
}
