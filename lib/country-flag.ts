import flagCodes from "@/data/flag-codes.json" with { type: "json" };

const CODES = new Set(flagCodes as string[]);

/** Bundled flag-icons SVG for a real code such as `us` or `gb-eng`. */
export function countryFlagSrc(iso2: string | undefined | null): string | null {
  if (!iso2) return null;
  const code = iso2.trim().toLowerCase();
  if (!/^[a-z]{2}(-[a-z0-9]+)?$/.test(code)) return null;
  if (!CODES.has(code)) return null;
  return `/flags/${code}.svg`;
}
