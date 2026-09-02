import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LEAGUE_PATHS = ["/premier-league", "/la-liga"] as const;

/**
 * Scheduled refresh for club-league tables and fixtures.
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (secret && bearer !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  for (const path of LEAGUE_PATHS) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidated: LEAGUE_PATHS,
    at: new Date().toISOString(),
  });
}
