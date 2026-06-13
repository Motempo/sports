import { NextRequest, NextResponse } from "next/server";
import { enrichFactWithWikipedia, getFactById, getFactsPage } from "@/lib/facts";

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (id) {
    const fact = getFactById(id);
    if (!fact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const enriched = await enrichFactWithWikipedia(fact);
    return NextResponse.json(enriched);
  }

  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(searchParams.get("limit") ?? "3", 10);
  const items = getFactsPage(offset, limit);

  return NextResponse.json({ items });
}
