import { NextRequest, NextResponse } from "next/server";
import { MAX_ATTACHMENT_BYTES } from "@/lib/feedback-attachment-markdown";
import {
  isFeedbackCategory,
  isInferredIntent,
  isSportRequestMetadata,
} from "@/lib/feedback-context";
import { createFeedbackIssue } from "@/lib/linear-issues";
import { checkRateLimit, rateLimitClientKey } from "@/lib/rate-limit";
import { allowedScreenshotMimeType } from "@/lib/screenshot-mime";

const GENERIC_SUBMIT_ERROR = "Failed to submit feedback.";

export async function POST(request: NextRequest) {
  const { allowed, retryAfterSec } = checkRateLimit(
    `feedback:${rateLimitClientKey(request)}`
  );
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

    let screenshotMimeType: string | undefined;
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

      screenshotMimeType = allowedScreenshotMimeType(body.screenshotMimeType);
      if (!screenshotMimeType) {
        return NextResponse.json(
          {
            error:
              "Screenshot must be a PNG, JPEG, WebP, GIF, AVIF, HEIC, BMP, or TIFF image.",
          },
          { status: 400 }
        );
      }
    }

    const inferredIntent = isInferredIntent(body.inferredIntent) ? body.inferredIntent : null;

    await createFeedbackIssue({
      appId: body.appId,
      description: body.description.trim(),
      screenshotBase64: body.screenshotBase64,
      screenshotMimeType,
      screenshotFilename: body.screenshotFilename,
      pageUrl: body.pageUrl,
      inferredIntent,
      feedbackCategory,
      sportRequest,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback submission failed:", err);
    return NextResponse.json({ error: GENERIC_SUBMIT_ERROR }, { status: 500 });
  }
}
