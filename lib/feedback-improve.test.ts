import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
  FEEDBACK_GROK_MODELS,
  FEEDBACK_TEXT_MAX_BYTES,
  feedbackTextWithinCap,
  getFeedbackGrokApiKey,
  improveFeedbackText,
} from "./feedback-improve.ts";
import { checkImproveRateLimit } from "./rate-limit.ts";

const KEY_NAMES = [
  "XAI_API_KEY_SPORTS_FEEDBACK",
  "GROK_API_KEY",
  "grok_api_key",
  "XAI_API_KEY",
  "xai_api_key",
] as const;

const previousEnv = new Map<string, string | undefined>();

function isolateKeys(values: Partial<Record<(typeof KEY_NAMES)[number], string>>) {
  for (const name of KEY_NAMES) {
    if (!previousEnv.has(name)) previousEnv.set(name, process.env[name]);
    delete process.env[name];
  }
  for (const [name, value] of Object.entries(values)) {
    process.env[name] = value;
  }
}

afterEach(() => {
  for (const [name, value] of previousEnv) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  previousEnv.clear();
});

function chatResponse(content: string | null, status = 200): Response {
  return new Response(
    JSON.stringify({
      choices: content === null ? [{ message: {} }] : [{ message: { content } }],
    }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

describe("feedback improve cost limits", () => {
  test("reads XAI_API_KEY_SPORTS_FEEDBACK before GROK_API_KEY", () => {
    isolateKeys({
      XAI_API_KEY_SPORTS_FEEDBACK: " feedback-key ",
      GROK_API_KEY: "shared-key",
      XAI_API_KEY: "xai-key",
    });
    assert.equal(getFeedbackGrokApiKey(), "feedback-key");
  });

  test("falls back to GROK_API_KEY when the dedicated key is unset or blank", () => {
    isolateKeys({ XAI_API_KEY_SPORTS_FEEDBACK: "  ", GROK_API_KEY: "shared-key" });
    assert.equal(getFeedbackGrokApiKey(), "shared-key");
  });

  test("keeps the XAI_API_KEY alias after GROK_API_KEY", () => {
    isolateKeys({ XAI_API_KEY: "xai-key" });
    assert.equal(getFeedbackGrokApiKey(), "xai-key");
  });

  test("caps feedback text at 8 KB", () => {
    assert.equal(feedbackTextWithinCap("a".repeat(FEEDBACK_TEXT_MAX_BYTES)), true);
    assert.equal(feedbackTextWithinCap("a".repeat(FEEDBACK_TEXT_MAX_BYTES + 1)), false);
    assert.equal(feedbackTextWithinCap("é".repeat(FEEDBACK_TEXT_MAX_BYTES / 2 + 1)), false);
  });

  test("tries grok-3-mini first and grok-4.3 only when that call fails", async () => {
    const models: string[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; reasoning_effort?: string };
      models.push(body.model);
      assert.equal(init?.headers && new Headers(init.headers).get("authorization"), "Bearer test-key");
      if (body.model === "grok-3-mini") {
        assert.equal(body.reasoning_effort, undefined);
        return chatResponse(null, 503);
      }
      assert.equal(body.model, "grok-4.3");
      assert.equal(body.reasoning_effort, "none");
      return chatResponse('{"text":"Clearer feedback.","intent":"bug"}');
    };

    const result = await improveFeedbackText("test-key", "button broken", "https://sports.motempo.com/f1", fetchImpl);
    assert.deepEqual(models, ["grok-3-mini", "grok-4.3"]);
    assert.deepEqual(FEEDBACK_GROK_MODELS, ["grok-3-mini", "grok-4.3"]);
    assert.equal(result?.improvedText, "Clearer feedback.");
    assert.equal(result?.intent, "bug");
  });

  test("does not call the fallback when the cheap model returns text", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return chatResponse("plain improved text");
    };
    const result = await improveFeedbackText("test-key", "needs grammar", undefined, fetchImpl);
    assert.equal(calls, 1);
    assert.equal(result?.improvedText, "plain improved text");
    assert.equal(result?.intent, null);
  });
});

describe("improve rate limit", () => {
  test("allows 5 per hour and blocks the 6th until the hour window resets", () => {
    const key = `hour-${Math.random()}`;
    const start = 1_700_000_000_000;
    for (let i = 0; i < 5; i++) {
      assert.equal(checkImproveRateLimit(key, start).allowed, true);
    }
    const blocked = checkImproveRateLimit(key, start + 1000);
    assert.equal(blocked.allowed, false);
    assert.ok((blocked.retryAfterSec ?? 0) > 0);

    const afterHour = checkImproveRateLimit(key, start + 60 * 60 * 1000 + 1);
    assert.equal(afterHour.allowed, true);
  });

  test("allows 20 per day across hours and does not count denied requests", () => {
    const key = `day-${Math.random()}`;
    const start = 1_800_000_000_000;
    for (let hour = 0; hour < 4; hour++) {
      const now = start + hour * 2 * 60 * 60 * 1000;
      for (let i = 0; i < 5; i++) {
        assert.equal(checkImproveRateLimit(key, now).allowed, true);
      }
      assert.equal(checkImproveRateLimit(key, now + 1000).allowed, false);
    }

    const nextHour = start + 4 * 2 * 60 * 60 * 1000;
    const overDay = checkImproveRateLimit(key, nextHour);
    assert.equal(overDay.allowed, false);

    const nextDay = checkImproveRateLimit(key, start + 24 * 60 * 60 * 1000 + 1);
    assert.equal(nextDay.allowed, true);
  });
});
