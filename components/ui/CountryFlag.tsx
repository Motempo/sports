import Image from "next/image";
import { countryFlagSrc } from "@/lib/country-flag";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  code?: string | null;
  /** Country or nationality, used in the accessible name ("Japan flag"). */
  name: string;
  /** Featured cards use `lg`. Inline rows use `sm`. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: { width: 20, height: 15, className: "h-[15px] w-5" },
  md: { width: 28, height: 21, className: "h-[21px] w-7" },
  lg: { width: 52, height: 39, className: "h-[39px] w-[52px]" },
} as const;

/**
 * Same-origin country flag. SVGs are the MIT-licensed flag-icons set in
 * `public/flags`, so a browser without emoji flags still draws a real flag.
 */
export function CountryFlag({ code, name, size = "md", className }: CountryFlagProps) {
  const src = countryFlagSrc(code);
  const label = `${name.trim() || "Country"} flag`;
  const dims = SIZE[size];

  if (!src) {
    if (size === "sm") return null;
    const letters = (code?.replace(/[^a-z]/gi, "") || name).trim().slice(0, 2).toUpperCase() || "—";
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded-[2px] border border-border bg-surface font-bold text-muted",
          size === "lg" ? "h-[39px] w-[52px] text-[12px]" : "h-[21px] w-7 text-[9px]",
          className
        )}
      >
        {letters}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={label}
      width={dims.width}
      height={dims.height}
      unoptimized
      className={cn(
        "inline-block rounded-[2px] border border-border/80 object-cover shadow-sm",
        dims.className,
        className
      )}
    />
  );
}
