import type { Metadata } from "next";
import { FormulaOnePageContent } from "@/components/sports/FormulaOnePageContent";
import { buildSportMetadata, getSportBySlug } from "@/lib/sports";

const sport = getSportBySlug("formula-1")!;

export const metadata: Metadata = buildSportMetadata(sport);

export const dynamic = "force-dynamic";

export default function FormulaOnePage() {
  return <FormulaOnePageContent />;
}
