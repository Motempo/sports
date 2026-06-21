import { NextRequest, NextResponse } from "next/server";
import { MAX_ATTACHMENT_BYTES } from "@/lib/feedback-attachment-markdown";
import {
  isFeedbackCategory,
  isInferredIntent,
  isSportRequestMetadata,
} from "@/lib/feedback-context";
import { createFeedbackIssue } from "@/lib/linear-issues";
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
      appId?: string;
      description?: string;
      screenshotBase64?: string;
      screenshotMimeType?: string;
      screenshotFilename?: string;
      pageUrl?: string;
      inferredIntent?: unknown;
      feedbackCategory?: unknown;
      sportRequest?: unknown;
    };

    const feedbackCategory = isFeedbackCategory(body.feedbackCategory)
      ? body.feedbackCategory
      : "general";
    const sportRequest =
      feedbackCategory === "sport-request" && isSportRequestMetadata(body.sportRequest)
        ? body.sportRequest
        : undefined;

    if (feedbackCategory === "sport-request" && !sportRequest) {
      return NextResponse.json(
        { error: "Sport request metadata is required for sport-request feedback." },
        { status: 400 }
      );
    }

    if (!body.description?.trim()) {
      return NextResponse.json({ error: "Feedback text is required" }, { status: 400 });
    }

    if (body.screenshotBase64) {
      const attachmentBytes = Buffer.byteLength(body.screenshotBase64, "base64");
      if (attachmentBytes > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          {
            error: "Attachment is too large. Try a smaller file or submit without an attachment.",
          },
          { status: 413 }
        );
      }
    }

    const inferredIntent = isInferredIntent(body.inferredIntent) ? body.inferredIntent : null;

    await createFeedbackIssue({
      appId: body.appId,
      description: body.description.trim(),
      screenshotBase64: body.screenshotBase64,
      screenshotMimeType: body.screenshotMimeType,
      screenshotFilename: body.screenshotFilename,
      pageUrl: body.pageUrl,
      inferredIntent,
      feedbackCategory,
      sportRequest,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit feedback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
