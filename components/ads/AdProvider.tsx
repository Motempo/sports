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

  const showAdsenseScript = adsAllowed && adProvider === "adsense" && adsenseClientId;
  const showNitroScript = adsAllowed && adProvider === "nitro" && nitroSiteId;

  return (
    <AdConsentContext.Provider value={value}>
      {hydrated && consent === "all" && isAdsStackConfigured() && (
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
      {showAdsenseScript && (
        <Script
          id="adsense-loader"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
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
      adsAllowed: typeof window !== "undefined" && hasAdConsent() && adsEnabled,
      acceptAll: () => writeAdConsent("all"),
      acceptEssentialOnly: () => writeAdConsent("essential"),
    };
  }
  return ctx;
}
