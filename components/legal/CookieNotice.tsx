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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-md safe-bottom sm:px-4"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:gap-4">
        <p className="text-[12px] leading-snug text-foreground/85 sm:text-[13px]">
          We use cookies for site functionality.{" "}
          <Link href="/privacy" className="text-link hover:underline">
            Privacy Policy
          </Link>
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
          className="shrink-0 rounded-lg bg-link px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
