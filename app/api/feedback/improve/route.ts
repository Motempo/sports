import { NextRequest, NextResponse } from "next/server";

const IMPROVE_PROMPT =
  "Improve this user feedback for a bug report or product suggestion. Keep the same meaning, fix grammar, and make it clearer and more actionable. Return only the improved text, no preamble.";

const GROK_MODEL = "grok-4.20-0309-non-reasoning";

function getGrokApiKey(): string | undefined {
  const candidates = [
    process.env.GROK_API_KEY,
    process.env.grok_api_key,
    process.env.XAI_API_KEY,
    process.env.xai_api_key,
  ];
  return candidates.map((v) => v?.trim()).find(Boolean);
}

function extractResponseText(data: {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}): string | undefined {
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text?.trim()) {
        return part.text.trim();
      }
    }
  }
  return undefined;
}

export async function GET() {
  return NextResponse.json({ available: Boolean(getGrokApiKey()) });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { description?: string };
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

    const res = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        instructions: IMPROVE_PROMPT,
        input: body.description.trim(),
        temperature: 0.3,
        max_output_tokens: 1024,
        store: false,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "AI_UNAVAILABLE",
          message: "Could not improve your feedback right now. Try again or submit as-is.",
        },
        { status: 503 }
      );
    }

    const data = (await res.json()) as Parameters<typeof extractResponseText>[0];
    const improvedText = extractResponseText(data);

    if (!improvedText) {
      return NextResponse.json(
        {
          error: "AI_UNAVAILABLE",
          message: "Could not improve your feedback right now. Try again or submit as-is.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ improvedText });
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
