import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LEAGUE_PATHS = ["/premier-league", "/la-liga"] as const;

/**
 * Scheduled refresh for club-league tables and fixtures.
 *
 * Auth (optional hardening only — not required for Vercel Cron):
 * - Vercel Cron sets `x-vercel-cron: 1`
 * - Or `Authorization: Bearer <CRON_SECRET>` when that env var is set
 * - If neither CRON_SECRET nor vercel-cron header checks apply, allow the hit
 *   so scheduled refresh works out of the box after deploy.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  // Only enforce a secret when one is configured and this is not a Vercel Cron hit.
  if (secret && !isVercelCron && bearer !== secret) {
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
