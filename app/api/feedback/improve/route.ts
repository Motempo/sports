import { NextRequest, NextResponse } from "next/server";
import { isInferredIntent, type InferredIntent } from "@/lib/feedback-context";

const IMPROVE_PROMPT = `Improve this user feedback for a Motempo web app. Keep the same meaning, fix grammar, and make it clearer and more actionable.

Classify intent only when reasonably clear:
- "bug" if something is broken, wrong, or failing
- "feature" if they want something new or improved
- null if unclear

Respond with JSON only, no markdown fences:
{"text":"improved feedback here","intent":"bug"|"feature"|null}`;

const GROK_MODELS = ["grok-4.3", "grok-4.20-0309-non-reasoning", "grok-3-mini"] as const;

function getGrokApiKey(): string | undefined {
  const candidates = [
    process.env.GROK_API_KEY,
    process.env.grok_api_key,
    process.env.XAI_API_KEY,
    process.env.xai_api_key,
  ];
  return candidates.map((v) => v?.trim()).find(Boolean);
}

function parseImproveResponse(raw: string): { improvedText: string; intent: InferredIntent | null } {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as { text?: string; intent?: unknown };
    const improvedText = parsed.text?.trim();
    if (!improvedText) throw new Error("missing text");
    const intent = isInferredIntent(parsed.intent) ? parsed.intent : null;
    return { improvedText, intent };
  } catch {
    return { improvedText: trimmed, intent: null };
  }
}

async function improveWithGrok(
  apiKey: string,
  description: string,
  pageUrl?: string
): Promise<{ improvedText: string; intent: InferredIntent | null } | undefined> {
  const userContent = pageUrl
    ? `Page: ${pageUrl}\n\nFeedback:\n${description}`
    : description;

  for (const model of GROK_MODELS) {
    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: IMPROVE_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    };
    if (model === "grok-4.3") {
      payload.reasoning_effort = "none";
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) continue;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) return parseImproveResponse(content);
  }

  return undefined;
}

export async function GET() {
  return NextResponse.json({ available: Boolean(getGrokApiKey()) });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { description?: string; pageUrl?: string };
    if (!body.description?.trim()) {
      return NextResponse.json(
        { error: "INVALID_BODY", message: "Invalid request body." },
        { status: 400 }
      );
    }

    const apiKey = getGrokApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "AI_UNAVAILABLE",
          message: "Could not improve your feedback right now. Try again or submit as-is.",
        },
        { status: 503 }
      );
    }

    const result = await improveWithGrok(apiKey, body.description.trim(), body.pageUrl?.trim());

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
