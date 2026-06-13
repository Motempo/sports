import { NextResponse } from "next/server";
import { fetchMatches } from "@/lib/football-data";

export const revalidate = 120;

export async function GET() {
  try {
    const { matches, groupMatches, todayMatches, upcomingMatches, currentMatches, source } =
      await fetchMatches();
    return NextResponse.json({
      matches,
      groupMatches,
      todayMatches,
      upcomingMatches,
      currentMatches,
      source,
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
