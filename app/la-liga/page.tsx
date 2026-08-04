import type { Metadata } from "next";
import { LaLigaPageContent } from "@/components/sports/LaLigaPageContent";
import { buildSportMetadata, getSportBySlug } from "@/lib/sports";

const sport = getSportBySlug("la-liga")!;

export const metadata: Metadata = buildSportMetadata(sport);

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function LaLigaPage() {
  return <LaLigaPageContent />;
}
