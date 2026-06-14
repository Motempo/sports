export const LEGACY_NOTICE_KEY = "motempo-sports-cookie-notice";
export const CONSENT_STORAGE_KEY = "motempo-sports-cookie-consent";

export type AdConsentLevel = "all" | "essential";

export function readAdConsent(): AdConsentLevel | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "all" || stored === "essential") return stored;

    // Migrate single-button dismiss from the pre-ads banner.
    if (localStorage.getItem(LEGACY_NOTICE_KEY) === "accepted") {
      return "essential";
    }
  } catch {
    return null;
  }

  return null;
}

export function writeAdConsent(level: AdConsentLevel): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, level);
  try {
    localStorage.setItem(LEGACY_NOTICE_KEY, "accepted");
  } catch {
    // ignore
  }
}

export function hasAdConsent(): boolean {
  return readAdConsent() === "all";
}
