import { NextRequest, NextResponse } from "next/server";
import { enrichFactWithWikipedia, getFactById, getFactsPage } from "@/lib/facts";
import { CURRENT_SPORT_SLUG } from "@/lib/sports";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sport = searchParams.get("sport") ?? CURRENT_SPORT_SLUG;
  const id = searchParams.get("id");

  if (id) {
    const fact = getFactById(sport, id);
    if (!fact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const enriched = await enrichFactWithWikipedia(fact);
    return NextResponse.json(enriched, { headers: NO_CACHE_HEADERS });
  }

  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(searchParams.get("limit") ?? "3", 10);
  const items = getFactsPage(sport, offset, limit);

  return NextResponse.json({ items, sport }, { headers: NO_CACHE_HEADERS });
}
