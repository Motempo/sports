import { NextRequest, NextResponse } from "next/server";
import { createFeedbackIssue } from "@/lib/github-issues";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterSec } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      description?: string;
      screenshotBase64?: string;
      screenshotMimeType?: "image/png" | "image/jpeg" | "image/webp";
      screenshotFilename?: string;
      pageUrl?: string;
      userAgent?: string;
    };

    if (!body.description?.trim()) {
      return NextResponse.json({ error: "Feedback text is required" }, { status: 400 });
    }

    await createFeedbackIssue({
      description: body.description.trim(),
      screenshotBase64: body.screenshotBase64,
      screenshotMimeType: body.screenshotMimeType,
      screenshotFilename: body.screenshotFilename,
      pageUrl: body.pageUrl,
      userAgent: body.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit feedback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
