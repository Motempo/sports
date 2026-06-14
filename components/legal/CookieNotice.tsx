"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "motempo-sports-cookie-notice";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "accepted") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 backdrop-blur-md safe-bottom sm:p-4"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-foreground/90 sm:text-[14px]">
          We use essential cookies and local storage for site functionality. If we add analytics or
          ads, we will update our{" "}
          <Link href="/privacy" className="text-link hover:underline">
            Privacy Policy
          </Link>{" "}
          and honor applicable consent requirements.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "accepted");
            } catch {
              // ignore
            }
            setVisible(false);
          }}
          className="min-h-[44px] shrink-0 rounded-xl bg-link px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
