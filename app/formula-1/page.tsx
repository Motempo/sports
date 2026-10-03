import type { Metadata } from "next";
import { FormulaOnePageContent } from "@/components/sports/FormulaOnePageContent";
import { buildSportMetadata, getSportBySlug } from "@/lib/sports";

const sport = getSportBySlug("formula-1")!;

export const metadata: Metadata = buildSportMetadata(sport);

// Render on each request so the shell stays fresh. Jolpica / OpenF1 payloads
// use the same short shared Data Cache as the league pages.
export const dynamic = "force-dynamic";

export default function FormulaOnePage() {
  return <FormulaOnePageContent />;
}
