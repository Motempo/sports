import type { MatchDataSource } from "@/lib/football-data";

export function formatMatchDataSource(source: MatchDataSource): string {
  switch (source) {
    case "api":
      return "Live data · football-data.org";
    case "openfootball":
      return "Community feed · auto-refresh";
    case "seed":
      return "Preview data";
  }
}

export function isLiveMatchSource(source: MatchDataSource): boolean {
  return source === "api" || source === "openfootball";
}
