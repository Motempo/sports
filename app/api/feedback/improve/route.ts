import { NextRequest, NextResponse } from "next/server";

const IMPROVE_PROMPT =
  "Improve this user feedback for a bug report or product suggestion. Keep the same meaning, fix grammar, and make it clearer and more actionable. Return only the improved text, no preamble.";

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

async function improveWithGrok(apiKey: string, description: string): Promise<string | undefined> {
  for (const model of GROK_MODELS) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: IMPROVE_PROMPT },
          { role: "user", content: description },
        ],
        reasoning_effort: "none",
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) continue;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const improvedText = data.choices?.[0]?.message?.content?.trim();
    if (improvedText) return improvedText;
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

    const improvedText = await improveWithGrok(apiKey, body.description.trim());

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
