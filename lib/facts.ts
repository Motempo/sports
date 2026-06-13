import funFactsData from "@/data/fun-facts.json";
import type { FunFact } from "@/lib/types";

const facts = funFactsData as FunFact[];

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
