import { NextRequest, NextResponse } from "next/server";
import { fetchNewsItems } from "@/lib/news";
import { CURRENT_SPORT_SLUG } from "@/lib/sports";

export const revalidate = 1800;

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
    return NextResponse.json(item);
  }

  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(searchParams.get("limit") ?? "3", 10);
  const all = await fetchNewsItems(sport);
  const items = all.slice(offset, offset + limit);

  return NextResponse.json({ items, total: all.length, sport });
}
