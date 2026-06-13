import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { description?: string };
    if (!body.description?.trim()) {
      return NextResponse.json(
        { error: "INVALID_BODY", message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      return NextResponse.json(
        {
          error: "AI_UNAVAILABLE",
          message: "Could not improve your feedback right now. Try again or submit as-is.",
        },
        { status: 503 }
      );
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Improve this user feedback for a bug report or product suggestion. Keep the same meaning, fix grammar, and make it clearer and more actionable. Return only the improved text, no preamble.\n\n${body.description.trim()}`,
                },
              ],
            },
          ],
        }),
      }
    );

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
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const improvedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

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
