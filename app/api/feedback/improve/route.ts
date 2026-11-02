import { NextRequest, NextResponse } from "next/server";
import {
  feedbackTextWithinCap,
  getFeedbackGrokApiKey,
  improveFeedbackText,
} from "@/lib/feedback-improve";
import { checkImproveRateLimit, rateLimitClientKey } from "@/lib/rate-limit";

export async function GET() {
  return NextResponse.json({ available: Boolean(getFeedbackGrokApiKey()) });
}

export async function POST(request: NextRequest) {
  const { allowed, retryAfterSec } = checkImproveRateLimit(
    `improve:${rateLimitClientKey(request)}`
  );
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as { description?: string; pageUrl?: string };
    const description = body.description?.trim() ?? "";
    if (!description) {
      return NextResponse.json(
        { error: "INVALID_BODY", message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!feedbackTextWithinCap(description)) {
      return NextResponse.json(
        {
          error: "TEXT_TOO_LARGE",
          message: "Feedback text must be 8 KB or smaller.",
        },
        { status: 413 }
      );
    }

    const apiKey = getFeedbackGrokApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "AI_UNAVAILABLE",
          message: "Could not improve your feedback right now. Try again or submit as-is.",
        },
        { status: 503 }
      );
    }

    const result = await improveFeedbackText(apiKey, description, body.pageUrl?.trim());

    if (!result) {
      return NextResponse.json(
        {
          error: "AI_UNAVAILABLE",
          message: "Could not improve your feedback right now. Try again or submit as-is.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      improvedText: result.improvedText,
      intent: result.intent,
    });
  } catch {
    return NextResponse.json(
      {
        error: "AI_UNAVAILABLE",
        message: "Could not improve your feedback right now. Try again or submit as-is.",
      },
      { status: 503 }
    );
  }
}
