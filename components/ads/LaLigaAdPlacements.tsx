"use client";

import { AdSlot } from "@/components/ads/AdSlot";
import { adsPlacementsLive } from "@/lib/ads-config";

export function LaLigaAdPlacements() {
  if (!adsPlacementsLive) return null;

  return (
    <>
      <AdSlot slot="header-leaderboard" className="border-b border-border py-3 sm:py-4" />
    </>
  );
}

export function LaLigaMidAd() {
  if (!adsPlacementsLive) return null;

  return <AdSlot slot="mid-content" className="border-b border-border py-4 sm:py-5" />;
}

export function LaLigaStandingsAd() {
  if (!adsPlacementsLive) return null;

  return (
    <AdSlot
      slot="standings-sidebar"
      layout="sidebar"
      className="hidden lg:flex lg:sticky lg:top-20 lg:self-start"
    />
  );
}
