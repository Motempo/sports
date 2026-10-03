import type { Metadata } from "next";
import { LaLigaPageContent } from "@/components/sports/LaLigaPageContent";
import { buildSportMetadata, getSportBySlug } from "@/lib/sports";

const sport = getSportBySlug("la-liga")!;

export const metadata: Metadata = buildSportMetadata(sport);

// Render on each request so the shell stays fresh. Upstream payloads use a
// short shared Data Cache (lib/sports-upstream-cache.ts), which `force-no-store`
// would skip.
export const dynamic = "force-dynamic";

export default function LaLigaPage() {
  return <LaLigaPageContent />;
}
