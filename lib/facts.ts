import worldCupFacts from "@/data/fun-facts/world-cup.json";
import formulaOneFacts from "@/data/fun-facts/formula-1.json";
import premierLeagueFacts from "@/data/fun-facts/premier-league.json";
import laLigaFacts from "@/data/fun-facts/la-liga.json";
import {
  getFactSourceHandles,
  getSourceByHandle,
  getXAvatar,
  interleavePersonOrgMix,
} from "@/lib/sport-sources";
import { uncachedFetch } from "@/lib/fetch-options";
import type { FunFact } from "@/lib/types";

interface FunFactSeed {
  id: string;
  title: string;
  summary: string;
  category: string;
  emoji: string;
  wikipediaTitle?: string;
  detail: string;
  imageUrl?: string;
  sourceHandle?: string;
}

const FACTS_BY_SPORT: Record<string, FunFactSeed[]> = {
  "world-cup": worldCupFacts as FunFactSeed[],
  "formula-1": formulaOneFacts as FunFactSeed[],
  "premier-league": premierLeagueFacts as FunFactSeed[],
  "la-liga": laLigaFacts as FunFactSeed[],
};

function buildFactsForSport(sportSlug: string): FunFact[] {
  const seeds = FACTS_BY_SPORT[sportSlug] ?? [];
  const handles = getFactSourceHandles(sportSlug);

  return seeds.map((fact) => {
    const handle =
      fact.sourceHandle ??
      handles[0] ??
      (sportSlug === "formula-1"
        ? "F1"
        : sportSlug === "premier-league"
          ? "premierleague"
          : sportSlug === "la-liga"
            ? "LaLigaEN"
            : "FIFAWorldCup");
    const source = getSourceByHandle(sportSlug, handle);
    return {
      ...fact,
      sourceHandle: handle,
      sourceName: source?.name ?? handle,
      xProfileUrl: source?.profileUrl ?? `https://x.com/${handle}`,
      verified: source?.verified ?? true,
    } satisfies FunFact;
  });
}

const factsCache = new Map<string, FunFact[]>();

function getSportFacts(sportSlug: string): FunFact[] {
  if (!factsCache.has(sportSlug)) {
    try {
      const built = buildFactsForSport(sportSlug);
      factsCache.set(
        sportSlug,
        interleavePersonOrgMix(built, sportSlug, (fact) => fact.sourceHandle)
      );
    } catch {
      factsCache.set(sportSlug, []);
    }
  }
  return factsCache.get(sportSlug) ?? [];
}

export function getAllFacts(sportSlug: string): FunFact[] {
  return getSportFacts(sportSlug);
}

const FACTS_ROTATION_MS = 6 * 60 * 60 * 1000;

export function getFactsRotationOffset(factCount: number, now = new Date()): number {
  if (factCount <= 0) return 0;
  return Math.floor(now.getTime() / FACTS_ROTATION_MS) % factCount;
}

export function getFactsPage(
  sportSlug: string,
  offset: number | undefined,
  limit = 3,
  exclude: string[] = []
): { items: FunFact[]; nextOffset: number; wrapped: boolean } {
  const facts = getSportFacts(sportSlug);
  if (facts.length === 0) {
    return { items: [], nextOffset: 0, wrapped: false };
  }

  const start = ((offset ?? getFactsRotationOffset(facts.length)) % facts.length + facts.length) % facts.length;
  const excludeSet = new Set(exclude);
  const items: FunFact[] = [];
  let lastIndex = start;
  const target = Math.min(limit, facts.length);

  for (let i = 0; i < facts.length && items.length < target; i++) {
    const idx = (start + i) % facts.length;
    const fact = facts[idx]!;
    if (excludeSet.has(fact.id)) continue;
    items.push(fact);
    lastIndex = idx;
  }

  let wrapped = false;
  if (items.length < target) {
    wrapped = true;
    for (let i = 0; i < facts.length && items.length < target; i++) {
      const idx = (start + i) % facts.length;
      const fact = facts[idx]!;
      if (items.some((item) => item.id === fact.id)) continue;
      items.push(fact);
      lastIndex = idx;
    }
  }

  return {
    items,
    nextOffset: (lastIndex + 1) % facts.length,
    wrapped,
  };
}

export function getFactById(sportSlug: string, id: string): FunFact | undefined {
  return getSportFacts(sportSlug).find((f) => f.id === id);
}

export function getFactSourceAvatar(sportSlug: string, handle: string): string {
  return getSourceByHandle(sportSlug, handle)?.avatarUrl ?? getXAvatar(handle);
}

export async function enrichFactWithWikipedia(fact: FunFact): Promise<FunFact> {
  if (!fact.wikipediaTitle) return fact;

  try {
    const title = encodeURIComponent(fact.wikipediaTitle.replace(/ /g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
      uncachedFetch
    );
    if (!res.ok) return fact;
    const data = (await res.json()) as {
      extract?: string;
      thumbnail?: { source?: string };
    };

    return {
      ...fact,
      detail: fact.detail.trim() ? fact.detail : (data.extract ?? fact.detail),
      imageUrl: data.thumbnail?.source ?? fact.imageUrl,
    };
  } catch {
    return fact;
  }
}
