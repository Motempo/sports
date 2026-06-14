/**
 * Family-friendly ad configuration.
 *
 * Ops: block gambling, dating, alcohol, weight loss, mature content, and sports
 * betting in the AdSense / NitroPay dashboards after approval.
 */

export type AdProviderName = "adsense" | "nitro" | "none";

export type AdSlotId =
  | "header-leaderboard"
  | "standings-sidebar"
  | "mid-content"
  | "feed-native";

export type AdSlotFormat = "responsive" | "vertical";

export interface AdSlotConfig {
  id: AdSlotId;
  label: string;
  format: AdSlotFormat;
  /** Reserved min-height to limit layout shift (px). */
  minHeight: number;
  /** Used for fixed-size vertical units (px). */
  minWidth?: number;
  adsenseUnitId: string;
  nitroPlacementId: string;
}

const truthy = (value: string | undefined): boolean => value?.trim().toLowerCase() === "true";

export const adsEnabled = truthy(process.env.NEXT_PUBLIC_ADS_ENABLED);

export const adProvider: AdProviderName =
  process.env.NEXT_PUBLIC_ADS_PROVIDER?.trim().toLowerCase() === "nitro"
    ? "nitro"
    : process.env.NEXT_PUBLIC_ADS_PROVIDER?.trim().toLowerCase() === "adsense"
      ? "adsense"
      : "none";

export const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";

export const nitroSiteId = process.env.NEXT_PUBLIC_NITRO_SITE_ID?.trim() ?? "";

export const AD_SLOTS: Record<AdSlotId, AdSlotConfig> = {
  "header-leaderboard": {
    id: "header-leaderboard",
    label: "Advertisement",
    format: "responsive",
    minHeight: 90,
    adsenseUnitId: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER?.trim() ?? "",
    nitroPlacementId: process.env.NEXT_PUBLIC_NITRO_PLACEMENT_HEADER?.trim() ?? "",
  },
  "standings-sidebar": {
    id: "standings-sidebar",
    label: "Advertisement",
    format: "vertical",
    minHeight: 600,
    minWidth: 300,
    adsenseUnitId: process.env.NEXT_PUBLIC_ADSENSE_SLOT_STANDINGS?.trim() ?? "",
    nitroPlacementId: process.env.NEXT_PUBLIC_NITRO_PLACEMENT_STANDINGS?.trim() ?? "",
  },
  "mid-content": {
    id: "mid-content",
    label: "Advertisement",
    format: "responsive",
    minHeight: 250,
    adsenseUnitId: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MID?.trim() ?? "",
    nitroPlacementId: process.env.NEXT_PUBLIC_NITRO_PLACEMENT_MID?.trim() ?? "",
  },
  "feed-native": {
    id: "feed-native",
    label: "Advertisement",
    format: "responsive",
    minHeight: 250,
    adsenseUnitId: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED?.trim() ?? "",
    nitroPlacementId: process.env.NEXT_PUBLIC_NITRO_PLACEMENT_FEED?.trim() ?? "",
  },
};

export function getAdSlot(slot: AdSlotId): AdSlotConfig {
  return AD_SLOTS[slot];
}

export function isSlotConfigured(slot: AdSlotId): boolean {
  const config = AD_SLOTS[slot];
  if (!adsEnabled || adProvider === "none") return false;

  if (adProvider === "adsense") {
    return Boolean(adsenseClientId && config.adsenseUnitId);
  }

  if (adProvider === "nitro") {
    return Boolean(nitroSiteId && config.nitroPlacementId);
  }

  return false;
}

export function isAdsStackConfigured(): boolean {
  if (!adsEnabled || adProvider === "none") return false;
  if (adProvider === "adsense") return Boolean(adsenseClientId);
  if (adProvider === "nitro") return Boolean(nitroSiteId);
  return false;
}

/** Shown in cookie banner when ads may load after consent. */
export const adsConsentRequired = adsEnabled && isAdsStackConfigured();
