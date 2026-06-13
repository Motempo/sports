import funFactsData from "@/data/fun-facts.json";
import { FACT_SOURCES, getSourceByHandle } from "@/lib/x-sources";
import type { FunFact } from "@/lib/types";

const SOURCE_HANDLES = [
  "OptaJoe",
  "FIFAcom",
  "BBCSport",
  "guardian_sport",
  "SkySports",
];

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

const facts = (funFactsData as FunFactSeed[]).map((fact, i) => {
  const handle = fact.sourceHandle ?? SOURCE_HANDLES[i % SOURCE_HANDLES.length];
  const source = getSourceByHandle(handle);
  return {
    ...fact,
    sourceHandle: handle,
    sourceName: source?.name ?? handle,
    xProfileUrl: source?.profileUrl ?? `https://x.com/${handle}`,
    verified: source?.verified ?? true,
  } satisfies FunFact;
});

export function getAllFacts(): FunFact[] {
  return facts;
}

export function getFactsPage(offset: number, limit = 3): FunFact[] {
  if (facts.length === 0) return [];
  const start = offset % facts.length;
  const result: FunFact[] = [];
  for (let i = 0; i < limit; i++) {
    result.push(facts[(start + i) % facts.length]);
  }
  return result;
}

export function getFactById(id: string): FunFact | undefined {
  return facts.find((f) => f.id === id);
}

export function getFactSourceAvatar(handle: string): string {
  return getSourceByHandle(handle)?.avatarUrl ?? `https://unavatar.io/x/${handle}`;
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

export { FACT_SOURCES };
