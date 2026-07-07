import type { Metadata } from "next";
import { WorldCupPageContent } from "@/components/sports/WorldCupPageContent";
import { buildSportMetadata, getSportBySlug } from "@/lib/sports";

const sport = getSportBySlug("world-cup")!;

export const metadata: Metadata = buildSportMetadata(sport);

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function WorldCupPage() {
  return <WorldCupPageContent />;
}
