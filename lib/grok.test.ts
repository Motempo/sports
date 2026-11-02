import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { GROK_MODELS, getGrokApiKey, grokChatJson } from "./grok.ts";

const KEY_NAMES = ["GROK_API_KEY", "grok_api_key", "XAI_API_KEY", "xai_api_key", "XAI_API_KEY_SPORTS_FEEDBACK"] as const;
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

describe("venue grok model order", () => {
  test("does not use the feedback-only key", () => {
    isolateKeys({
      XAI_API_KEY_SPORTS_FEEDBACK: "feedback-only",
      GROK_API_KEY: "venue-key",
    });
    assert.equal(getGrokApiKey(), "venue-key");
  });

  test("tries grok-3-mini first and falls back only to grok-4.3", async () => {
    isolateKeys({ GROK_API_KEY: "venue-key" });
    const models: string[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; reasoning_effort?: string };
      models.push(body.model);
      if (body.model === "grok-3-mini") {
        assert.equal(body.reasoning_effort, undefined);
        return new Response("nope", { status: 429 });
      }
      assert.equal(body.reasoning_effort, "none");
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"1":{"venue":"MetLife Stadium"}}' } }] }), {
        status: 200,
      });
    };

    const parsed = await grokChatJson<Record<string, { venue: string }>>("system", "[]", { fetchImpl });
    assert.deepEqual(GROK_MODELS, ["grok-3-mini", "grok-4.3"]);
    assert.deepEqual(models, ["grok-3-mini", "grok-4.3"]);
    assert.equal(parsed?.["1"]?.venue, "MetLife Stadium");
  });

  test("stops after the cheap model succeeds", async () => {
    isolateKeys({ GROK_API_KEY: "venue-key" });
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
    };
    const parsed = await grokChatJson<{ ok: boolean }>("system", "{}", { fetchImpl });
    assert.equal(calls, 1);
    assert.equal(parsed?.ok, true);
  });
});
