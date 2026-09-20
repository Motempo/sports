import { NextRequest, NextResponse } from "next/server";
import { enrichNewsItems, fetchNewsFeed, fetchNewsItems } from "@/lib/news";
import { CURRENT_SPORT_SLUG } from "@/lib/sports";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sport = searchParams.get("sport") ?? CURRENT_SPORT_SLUG;
  const id = searchParams.get("id");

  if (id) {
    const all = await fetchNewsItems(sport);
    const item = all.find((n) => n.id === id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [enriched] = await enrichNewsItems([item], { includeVideo: true });
    return NextResponse.json(enriched, { headers: NO_CACHE_HEADERS });
  }

  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(searchParams.get("limit") ?? "3", 10);
  const feed = await fetchNewsFeed(sport);
  const items = await enrichNewsItems(feed.items.slice(offset, offset + limit));

  return NextResponse.json(
    {
      items,
      total: feed.items.length,
      sport,
      provider: feed.provider,
      ...(feed.xSkipReason ? { xSkipReason: feed.xSkipReason } : {}),
    },
    { headers: NO_CACHE_HEADERS }
  );
}
