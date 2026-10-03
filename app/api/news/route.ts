import { NextRequest, NextResponse } from "next/server";
import { enrichNewsItems, fetchNewsFeed, fetchNewsItems } from "@/lib/news";
import { CURRENT_SPORT_SLUG, getSportBySlug } from "@/lib/sports";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = { "Cache-Control": "no-store" };
const NEWS_LIMIT_DEFAULT = 3;
const NEWS_LIMIT_MIN = 1;
const NEWS_LIMIT_MAX = 10;

function parseNewsLimit(raw: string | null): number {
  if (raw == null || raw.trim() === "") return NEWS_LIMIT_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return NEWS_LIMIT_DEFAULT;
  return Math.min(NEWS_LIMIT_MAX, Math.max(NEWS_LIMIT_MIN, parsed));
}

function parseNewsOffset(raw: string | null): number {
  if (raw == null || raw.trim() === "") return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sport = (searchParams.get("sport") ?? CURRENT_SPORT_SLUG).trim();
  if (!getSportBySlug(sport)) {
    return NextResponse.json({ error: "Unknown sport." }, { status: 400 });
  }

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

  const offset = parseNewsOffset(searchParams.get("offset"));
  const limit = parseNewsLimit(searchParams.get("limit"));
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
