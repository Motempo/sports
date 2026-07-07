import knockoutFixtures from "@/data/wc2026-knockout-fixtures.json";
import type { BracketRound, MatchInfo } from "@/lib/types";

type FixtureEntry = { fifaMatch: number };

const fixtures = knockoutFixtures as Record<string, FixtureEntry>;

/** Official FIFA World Cup 2026 knockout pathways (outer → inner). */
export const PATHWAY_LEFT_R32 = [74, 77, 73, 75, 83, 84, 81, 82] as const;
export const PATHWAY_RIGHT_R32 = [76, 78, 79, 80, 86, 88, 85, 87] as const;
export const PATHWAY_LEFT_R16 = [89, 90, 93, 94] as const;
export const PATHWAY_RIGHT_R16 = [91, 92, 95, 96] as const;
export const PATHWAY_LEFT_QF = [97, 98] as const;
export const PATHWAY_RIGHT_QF = [99, 100] as const;
export const PATHWAY_LEFT_SF = [101] as const;
export const PATHWAY_RIGHT_SF = [102] as const;
export const PATHWAY_THIRD = 103;
export const PATHWAY_FINAL = 104;

const fifaMatchById = new Map<number, number>();
for (const [id, entry] of Object.entries(fixtures)) {
  fifaMatchById.set(Number(id), entry.fifaMatch);
}

export function getFifaMatchNumber(match: MatchInfo): number | undefined {
  return fifaMatchById.get(match.id);
}

export function indexKnockoutByFifaMatch(matches: MatchInfo[]): Map<number, MatchInfo> {
  const map = new Map<number, MatchInfo>();
  for (const match of matches) {
    const fifa = getFifaMatchNumber(match);
    if (fifa) map.set(fifa, match);
  }
  return map;
}

function resolveOrdered(
  order: readonly number[],
  byFifa: Map<number, MatchInfo>,
  fallback: MatchInfo[]
): MatchInfo[] {
  const resolved = order
    .map((n) => byFifa.get(n))
    .filter((m): m is MatchInfo => Boolean(m));

  if (resolved.length === order.length) return resolved;

  const used = new Set(resolved.map((m) => m.id));
  const remaining = fallback.filter((m) => !used.has(m.id));
  return [...resolved, ...remaining].slice(0, order.length);
}

export interface PathwayBracketLayout {
  left: {
    R32: MatchInfo[];
    R16: MatchInfo[];
    QF: MatchInfo[];
    SF: MatchInfo[];
  };
  right: {
    R32: MatchInfo[];
    R16: MatchInfo[];
    QF: MatchInfo[];
    SF: MatchInfo[];
  };
  final: MatchInfo | null;
  third: MatchInfo | null;
}

export function organizePathwayBracket(
  grouped: Record<BracketRound, MatchInfo[]>
): PathwayBracketLayout {
  const all = Object.values(grouped).flat();
  const byFifa = indexKnockoutByFifaMatch(all);

  const sortFallback = (round: BracketRound) =>
    [...(grouped[round] ?? [])].sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );

  return {
    left: {
      R32: resolveOrdered(PATHWAY_LEFT_R32, byFifa, sortFallback("R32")),
      R16: resolveOrdered(PATHWAY_LEFT_R16, byFifa, sortFallback("R16")),
      QF: resolveOrdered(PATHWAY_LEFT_QF, byFifa, sortFallback("QF")),
      SF: resolveOrdered(PATHWAY_LEFT_SF, byFifa, sortFallback("SF")),
    },
    right: {
      R32: resolveOrdered(PATHWAY_RIGHT_R32, byFifa, sortFallback("R32")),
      R16: resolveOrdered(PATHWAY_RIGHT_R16, byFifa, sortFallback("R16")),
      QF: resolveOrdered(PATHWAY_RIGHT_QF, byFifa, sortFallback("QF")),
      SF: resolveOrdered(PATHWAY_RIGHT_SF, byFifa, sortFallback("SF")),
    },
    final: byFifa.get(PATHWAY_FINAL) ?? grouped.FINAL[0] ?? null,
    third: byFifa.get(PATHWAY_THIRD) ?? grouped.THIRD[0] ?? null,
  };
}

/** Mobile / list view: FIFA match number order within each round. */
export function sortRoundByPathway(matches: MatchInfo[]): MatchInfo[] {
  return [...matches].sort((a, b) => {
    const fa = getFifaMatchNumber(a) ?? 999;
    const fb = getFifaMatchNumber(b) ?? 999;
    if (fa !== fb) return fa - fb;
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  });
}
