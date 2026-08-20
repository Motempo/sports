import { NextResponse, type NextRequest } from "next/server";
import {
  LAST_SPORT_COOKIE,
  LAST_SPORT_COOKIE_MAX_AGE,
  isRememberableSportSlug,
  resolveHomeSportSlug,
} from "@/lib/last-sport";
import { SPORTS } from "@/lib/sports";

const SPORT_SLUGS = new Set(SPORTS.filter((s) => s.available).map((s) => s.slug));

function lastSportCookieOptions() {
  return {
    path: "/",
    maxAge: LAST_SPORT_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const remembered = request.cookies.get(LAST_SPORT_COOKIE)?.value;
    const target = resolveHomeSportSlug(remembered);
    return NextResponse.redirect(new URL(`/${target}`, request.url));
  }

  const segment = pathname.split("/").filter(Boolean)[0];
  if (
    segment &&
    SPORT_SLUGS.has(segment) &&
    (pathname === `/${segment}` || pathname === `/${segment}/`)
  ) {
    const response = NextResponse.next();
    if (isRememberableSportSlug(segment)) {
      // Refresh on every visit so the preference does not expire while they are active.
      response.cookies.set(LAST_SPORT_COOKIE, segment, lastSportCookieOptions());
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on home + sport pages only. Skip API, static assets, images, legal.
     */
    "/",
    "/formula-1",
    "/formula-1/",
    "/world-cup",
    "/world-cup/",
    "/premier-league",
    "/premier-league/",
    "/la-liga",
    "/la-liga/",
  ],
};
