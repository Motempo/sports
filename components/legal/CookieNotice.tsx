"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdConsent } from "@/components/ads/AdProvider";
import { readAdConsent } from "@/lib/ad-consent";
import { adsConsentRequired } from "@/lib/ads-config";

export function CookieNotice() {
  const { acceptAll, acceptEssentialOnly } = useAdConsent();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readAdConsent() === null);
  }, []);

  if (!visible) return null;

  const showAdChoices = adsConsentRequired;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-md safe-bottom sm:px-4"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-[12px] leading-snug text-foreground/85 sm:text-[13px]">
          {showAdChoices ? (
            <>
              We use cookies for site functionality and contextual ads (sports, health, hobbies).
              See our{" "}
              <Link href="/privacy" className="text-link hover:underline">
                Privacy Policy
              </Link>
              .
            </>
          ) : (
            <>
              We use cookies for site functionality.{" "}
              <Link href="/privacy" className="text-link hover:underline">
                Privacy Policy
              </Link>
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {showAdChoices && (
            <button
              type="button"
              onClick={() => {
                acceptEssentialOnly();
                setVisible(false);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground/90 transition-colors hover:bg-surface"
            >
              Essential only
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              acceptAll();
              setVisible(false);
            }}
            className="rounded-lg bg-link px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          >
            {showAdChoices ? "Accept" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
