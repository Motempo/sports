import worldCupSources from "@/data/sources/world-cup.json";
import formulaOneSources from "@/data/sources/formula-1.json";

export type SourceReliability = "highest" | "high" | "medium";

export interface SportSourceEntry {
  rank: number;
  handle: string;
  name: string;
  type: string;
  description: string;
  reliability: SourceReliability;
  category: string;
  rssUrl?: string;
}

export interface SupplementalFeed {
  id: string;
  name: string;
  handle: string;
  rssUrl: string;
  googleNews?: boolean;
}

export interface SportSourceConfig {
  sportSlug: string;
  newsKeywordPattern: string;
  newsHandles: string[];
  factHandles: string[];
  sources: SportSourceEntry[];
  supplementalFeeds: SupplementalFeed[];
}

export interface ResolvedSportSource extends SportSourceEntry {
  profileUrl: string;
  avatarUrl: string;
  verified: boolean;
}

const CONFIGS: Record<string, SportSourceConfig> = {
  "world-cup": worldCupSources as SportSourceConfig,
  "formula-1": formulaOneSources as SportSourceConfig,
};

export function getSportSourceConfig(sportSlug: string): SportSourceConfig | undefined {
  return CONFIGS[sportSlug];
}

export function getSportSourceConfigOrThrow(sportSlug: string): SportSourceConfig {
  const config = getSportSourceConfig(sportSlug);
  if (!config) {
    throw new Error(`No source config for sport: ${sportSlug}`);
  }
  return config;
}

function isVerified(reliability: SourceReliability): boolean {
  return reliability === "highest" || reliability === "high";
}

export function resolveSource(entry: SportSourceEntry): ResolvedSportSource {
  return {
    ...entry,
    profileUrl: `https://x.com/${entry.handle}`,
    avatarUrl: `https://unavatar.io/x/${entry.handle}`,
    verified: isVerified(entry.reliability),
  };
}

export function getSourceByHandle(
  sportSlug: string,
  handle: string
): ResolvedSportSource | undefined {
  const config = getSportSourceConfig(sportSlug);
  if (!config) return undefined;

  const normalized = handle.replace(/^@/, "");
  const entry = config.sources.find(
    (s) => s.handle.toLowerCase() === normalized.toLowerCase()
  );
  if (!entry) {
    const supplemental = config.supplementalFeeds.find(
      (f) => f.handle.toLowerCase() === normalized.toLowerCase()
    );
    if (!supplemental) return undefined;
    return {
      rank: 0,
      handle: supplemental.handle,
      name: supplemental.name,
      type: "media",
      description: supplemental.name,
      reliability: "high",
      category: "Supplemental",
      profileUrl: `https://x.com/${supplemental.handle}`,
      avatarUrl: `https://unavatar.io/x/${supplemental.handle}`,
      verified: true,
    };
  }
  return resolveSource(entry);
}

export function getNewsFeedSources(sportSlug: string): ResolvedSportSource[] {
  const config = getSportSourceConfigOrThrow(sportSlug);
  const seen = new Set<string>();

  const rssSources = config.sources
    .filter((s) => config.newsHandles.includes(s.handle) && s.rssUrl)
    .sort((a, b) => a.rank - b.rank)
    .map(resolveSource)
    .filter((s) => {
      if (seen.has(s.rssUrl!)) return false;
      seen.add(s.rssUrl!);
      return true;
    });

  const supplemental = config.supplementalFeeds.map((feed) => ({
    rank: 0,
    handle: feed.handle,
    name: feed.name,
    type: feed.googleNews ? "aggregator" : "media",
    description: feed.name,
    reliability: "high" as const,
    category: "Supplemental",
    rssUrl: feed.rssUrl,
    profileUrl: `https://x.com/${feed.handle}`,
    avatarUrl: `https://unavatar.io/x/${feed.handle}`,
    verified: true,
    googleNews: feed.googleNews,
  }));

  return [...rssSources, ...supplemental];
}

export function getFactSourceHandles(sportSlug: string): string[] {
  const config = getSportSourceConfigOrThrow(sportSlug);
  return config.factHandles;
}

export function getNewsKeywordPattern(sportSlug: string): RegExp {
  const config = getSportSourceConfigOrThrow(sportSlug);
  return new RegExp(config.newsKeywordPattern, "i");
}

/** Match Google News outlet names to configured X handles. */
export function matchOutletToHandle(sportSlug: string, outletName: string): string | undefined {
  const config = getSportSourceConfig(sportSlug);
  if (!config) return undefined;

  const normalized = outletName.toLowerCase();
  const aliases: Record<string, string> = {
    bbc: "BBCSport",
    "bbc sport": "BBCSport",
    espn: "ESPNFC",
    "espn fc": "ESPNFC",
    goal: "goal",
    "sky sports": "SkySports",
    fifa: "FIFAWorldCup",
    "the guardian": "guardian_sport",
    guardian: "guardian_sport",
    "football365": "F365",
    fox: "FOXSoccer",
    "fox sports": "FOXSoccer",
    athletic: "TheAthleticFC",
    "the athletic": "TheAthleticFC",
  };

  for (const [key, handle] of Object.entries(aliases)) {
    if (normalized.includes(key)) return handle;
  }

  const byName = config.sources.find((s) =>
    normalized.includes(s.name.toLowerCase())
  );
  return byName?.handle ?? config.newsHandles[0];
}

export function getXAvatar(handle: string): string {
  return `https://unavatar.io/x/${handle}`;
}
