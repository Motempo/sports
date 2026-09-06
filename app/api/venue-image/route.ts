import { NextRequest, NextResponse } from "next/server";
import { resolveVenueImage } from "@/lib/venue-image";

export const dynamic = "force-dynamic";

const MAX_LEN = 120;

function clip(value: string | null): string {
  return (value ?? "").trim().slice(0, MAX_LEN);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const venue = clip(searchParams.get("venue"));
  const city = clip(searchParams.get("city"));
  const home = clip(searchParams.get("home"));

  const name = venue && venue.toUpperCase() !== "TBD" ? venue.split(",")[0]!.trim() : home;
  if (!name) {
    return NextResponse.json(null, { status: 200 });
  }

  const image = await resolveVenueImage({
    kind: "stadium",
    name,
    hint: city || home || "football",
  });

  return NextResponse.json(image, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
