"use client";

import Script from "next/script";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type AdConsentLevel,
  hasAdConsent,
  readAdConsent,
  writeAdConsent,
} from "@/lib/ad-consent";
import {
  adsEnabled,
  adsPlacementsLive,
  adProvider,
  adsenseClientId,
  isAdsStackConfigured,
  nitroSiteId,
} from "@/lib/ads-config";

interface AdConsentContextValue {
  consent: AdConsentLevel | null;
  adsAllowed: boolean;
  acceptAll: () => void;
  acceptEssentialOnly: () => void;
}

const AdConsentContext = createContext<AdConsentContextValue | null>(null);

function pushConsentUpdate(granted: boolean): void {
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push([
    "consent",
    "update",
    {
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
      analytics_storage: granted ? "denied" : "denied",
    },
  ]);
}

const ADSENSE_LOADER_ATTR = "data-motempo-adsense";

/**
 * Insert adsbygoogle.js only after Consent Mode is granted.
 * The tag is omitted entirely unless ads are on and the visitor accepted.
 */
function loadAdsenseAfterConsent(clientId: string): void {
  if (document.querySelector(`script[${ADSENSE_LOADER_ATTR}]`)) return;

  const w = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer ?? [];
  const granted = {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "denied",
  };
  if (typeof w.gtag === "function") {
    w.gtag("consent", "update", granted);
  } else {
    w.dataLayer.push(["consent", "update", granted]);
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  script.crossOrigin = "anonymous";
  script.setAttribute(ADSENSE_LOADER_ATTR, "true");
  document.head.appendChild(script);
}

export function AdProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<AdConsentLevel | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConsent(readAdConsent());
    setHydrated(true);
  }, []);

  const acceptAll = useCallback(() => {
    writeAdConsent("all");
    setConsent("all");
    pushConsentUpdate(true);
  }, []);

  const acceptEssentialOnly = useCallback(() => {
    writeAdConsent("essential");
    setConsent("essential");
    pushConsentUpdate(false);
  }, []);

  const adsAllowed =
    hydrated &&
    adsPlacementsLive &&
    adsEnabled &&
    isAdsStackConfigured() &&
    consent === "all";

  const value = useMemo(
    () => ({
      consent,
      adsAllowed,
      acceptAll,
      acceptEssentialOnly,
    }),
    [acceptAll, acceptEssentialOnly, adsAllowed, consent]
  );

  const showNitroScript = adsAllowed && adProvider === "nitro" && nitroSiteId;
  const showAdsenseScript = adsAllowed && adProvider === "adsense" && Boolean(adsenseClientId);

  useEffect(() => {
    if (!showAdsenseScript) return;
    loadAdsenseAfterConsent(adsenseClientId);
  }, [showAdsenseScript]);

  return (
    <AdConsentContext.Provider value={value}>
      {hydrated && consent === "all" && adsPlacementsLive && isAdsStackConfigured() && (
        <Script id="google-consent-granted" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'update', {
              ad_storage: 'granted',
              ad_user_data: 'granted',
              ad_personalization: 'granted',
              analytics_storage: 'denied'
            });
          `}
        </Script>
      )}
      {showNitroScript && (
        <Script
          id="nitro-loader"
          src={`https://s.nitropay.com/ads-${nitroSiteId}.js`}
          strategy="afterInteractive"
        />
      )}
      {children}
    </AdConsentContext.Provider>
  );
}

export function useAdConsent(): AdConsentContextValue {
  const ctx = useContext(AdConsentContext);
  if (!ctx) {
    return {
      consent: typeof window !== "undefined" ? readAdConsent() : null,
      adsAllowed:
        typeof window !== "undefined" &&
        hasAdConsent() &&
        adsPlacementsLive &&
        adsEnabled,
      acceptAll: () => writeAdConsent("all"),
      acceptEssentialOnly: () => writeAdConsent("essential"),
    };
  }
  return ctx;
}
