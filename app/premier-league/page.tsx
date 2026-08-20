import type { Metadata } from "next";
import { PremierLeaguePageContent } from "@/components/sports/PremierLeaguePageContent";
import { buildSportMetadata, getSportBySlug } from "@/lib/sports";

const sport = getSportBySlug("premier-league")!;

export const metadata: Metadata = buildSportMetadata(sport);

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function PremierLeaguePage() {
  return <PremierLeaguePageContent />;
}
