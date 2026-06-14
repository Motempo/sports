import worldCupFacts from "@/data/fun-facts/world-cup.json";
import formulaOneFacts from "@/data/fun-facts/formula-1.json";
import {
  getFactSourceHandles,
  getSourceByHandle,
  getXAvatar,
  interleavePersonOrgMix,
} from "@/lib/sport-sources";
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
};

function buildFactsForSport(sportSlug: string): FunFact[] {
  const seeds = FACTS_BY_SPORT[sportSlug] ?? [];
  const handles = getFactSourceHandles(sportSlug);

  return seeds.map((fact) => {
    const handle = fact.sourceHandle ?? handles[0] ?? (sportSlug === "formula-1" ? "F1" : "FIFAWorldCup");
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

export function getFactsPage(sportSlug: string, offset: number, limit = 3): FunFact[] {
  const facts = getSportFacts(sportSlug);
  if (facts.length === 0) return [];
  const start = offset % facts.length;
  const result: FunFact[] = [];
  for (let i = 0; i < limit; i++) {
    result.push(facts[(start + i) % facts.length]);
  }
  return result;
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
      { next: { revalidate: 604800 } }
    );
    if (!res.ok) return fact;
    const data = (await res.json()) as {
      extract?: string;
      thumbnail?: { source?: string };
    };

    return {
      ...fact,
      detail: data.extract ?? fact.detail,
      imageUrl: data.thumbnail?.source ?? fact.imageUrl,
    };
  } catch {
    return fact;
  }
}
