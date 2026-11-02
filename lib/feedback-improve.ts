import { isInferredIntent, type InferredIntent } from "@/lib/feedback-context";

/** Cheapest model first; grok-4.3 is the only fallback. */
export const FEEDBACK_GROK_MODELS = ["grok-3-mini", "grok-4.3"] as const;

/** 8 KB of feedback text, measured as UTF-8 bytes. */
export const FEEDBACK_TEXT_MAX_BYTES = 8 * 1024;

const IMPROVE_PROMPT = `Improve this user feedback for a Motempo web app. Keep the same meaning, fix grammar, and make it clearer and more actionable.

Classify intent only when reasonably clear:
- "bug" if something is broken, wrong, or failing
- "feature" if they want something new or improved
- null if unclear

Respond with JSON only, no markdown fences:
{"text":"improved feedback here","intent":"bug"|"feature"|null}`;

const CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";

export function feedbackTextByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

export function feedbackTextWithinCap(text: string): boolean {
  return feedbackTextByteLength(text) <= FEEDBACK_TEXT_MAX_BYTES;
}

/**
 * Feedback Improve key order: optional dedicated key, then the shared Grok key,
 * then the aliases this app already accepted.
 */
export function getFeedbackGrokApiKey(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  const candidates = [
    env.XAI_API_KEY_SPORTS_FEEDBACK,
    env.GROK_API_KEY,
    env.grok_api_key,
    env.XAI_API_KEY,
    env.xai_api_key,
  ];
  return candidates.map((value) => value?.trim()).find(Boolean);
}

export function parseImproveResponse(raw: string): {
  improvedText: string;
  intent: InferredIntent | null;
} {
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

export async function improveFeedbackText(
  apiKey: string,
  description: string,
  pageUrl?: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ improvedText: string; intent: InferredIntent | null } | undefined> {
  const userContent = pageUrl
    ? `Page: ${pageUrl}\n\nFeedback:\n${description}`
    : description;

  for (const model of FEEDBACK_GROK_MODELS) {
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

    const res = await fetchImpl(CHAT_COMPLETIONS_URL, {
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
