import { countryFlagEmoji } from "@/lib/f1-circuits";

interface CountryFlagProps {
  code?: string;
  name: string;
  /** Featured card uses a large mark. Track rows use a small one beside the country name. */
  size?: "sm" | "lg";
}

/**
 * Offline country flag. Regional-indicator emoji when the code is a real
 * ISO alpha-2; otherwise a short text badge on the large mark only.
 */
export function CountryFlag({ code, name, size = "lg" }: CountryFlagProps) {
  const emoji = countryFlagEmoji(code);
  const label = `${name} flag`;

  if (!emoji) {
    if (size === "sm") return null;
    const letters = name.trim().slice(0, 3).toUpperCase() || "—";
    return (
      <div
        className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-border bg-surface text-[13px] font-bold text-muted"
        aria-hidden
      >
        {letters}
      </div>
    );
  }

  if (size === "sm") {
    return (
      <span className="text-[16px] leading-none" role="img" aria-label={label}>
        {emoji}
      </span>
    );
  }

  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-border bg-surface shadow-sm"
      role="img"
      aria-label={label}
    >
      <span className="text-[40px] leading-none">{emoji}</span>
    </div>
  );
}
