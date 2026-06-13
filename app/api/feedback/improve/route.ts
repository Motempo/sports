import { NextRequest, NextResponse } from "next/server";

const IMPROVE_PROMPT =
  "Improve this user feedback for a bug report or product suggestion. Keep the same meaning, fix grammar, and make it clearer and more actionable. Return only the improved text, no preamble.";

function getGrokApiKey(): string | undefined {
  return process.env.GROK_API_KEY?.trim() || process.env.grok_api_key?.trim();
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

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-build-0.1",
        messages: [
          { role: "system", content: IMPROVE_PROMPT },
          { role: "user", content: body.description.trim() },
        ],
        temperature: 0.3,
        max_tokens: 1024,
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

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const improvedText = data.choices?.[0]?.message?.content?.trim();

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
