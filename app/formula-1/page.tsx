import type { Metadata } from "next";
import { FormulaOneComingSoon } from "@/components/sports/FormulaOneComingSoon";
import { buildSportMetadata, getSportBySlug } from "@/lib/sports";

const sport = getSportBySlug("formula-1")!;

export const metadata: Metadata = {
  ...buildSportMetadata(sport),
  robots: {
    index: true,
    follow: true,
  },
};

export default function FormulaOnePage() {
  return <FormulaOneComingSoon />;
}
