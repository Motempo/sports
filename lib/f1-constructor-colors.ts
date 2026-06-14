import colors from "@/data/f1-constructor-colors.json";

const COLOR_MAP = colors as Record<string, string>;

export function getConstructorColor(constructorId: string): string {
  const normalized = constructorId.toLowerCase().replace(/\s+/g, "_");
  return COLOR_MAP[normalized] ?? "#71767b";
}
