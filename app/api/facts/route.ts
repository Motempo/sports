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

  const offsetParam = searchParams.get("offset");
  const offset =
    offsetParam == null || offsetParam === "" ? undefined : parseInt(offsetParam, 10);
  const limit = parseInt(searchParams.get("limit") ?? "3", 10);
  const exclude = (searchParams.get("exclude") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const page = getFactsPage(
    sport,
    Number.isFinite(offset) ? offset : undefined,
    limit,
    exclude
  );

  return NextResponse.json({ ...page, sport }, { headers: NO_CACHE_HEADERS });
}
