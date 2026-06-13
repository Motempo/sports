import { NextRequest, NextResponse } from "next/server";
import { enrichNewsItem, fetchNewsItems } from "@/lib/news";

export const revalidate = 1800;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (id) {
    const all = await fetchNewsItems();
    const item = all.find((n) => n.id === id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const enriched = await enrichNewsItem(item);
    return NextResponse.json(enriched);
  }

  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(searchParams.get("limit") ?? "3", 10);
  const all = await fetchNewsItems();
  const items = all.slice(offset, offset + limit);

  return NextResponse.json({ items, total: all.length });
}
