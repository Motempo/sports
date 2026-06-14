const GROK_MODELS = ["grok-4.3", "grok-4.20-0309-non-reasoning", "grok-3-mini"] as const;

export function getGrokApiKey(): string | undefined {
  const candidates = [
    process.env.GROK_API_KEY,
    process.env.grok_api_key,
    process.env.XAI_API_KEY,
    process.env.xai_api_key,
  ];
  return candidates.map((v) => v?.trim()).find(Boolean);
}

export async function grokChatJson<T>(
  systemPrompt: string,
  userContent: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T | undefined> {
  const apiKey = getGrokApiKey();
  if (!apiKey) return undefined;

  for (const model of GROK_MODELS) {
    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4096,
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
      next: { revalidate: 0 },
    });

    if (!res.ok) continue;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) continue;

    const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      return JSON.parse(jsonText) as T;
    } catch {
      continue;
    }
  }

  return undefined;
}
