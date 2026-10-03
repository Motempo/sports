import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { authorizeFeedbackOps } from "./feedback-ops-auth.ts";

const ORIGINAL = process.env.FEEDBACK_OPS_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.FEEDBACK_OPS_SECRET;
  } else {
    process.env.FEEDBACK_OPS_SECRET = ORIGINAL;
  }
});

describe("authorizeFeedbackOps", () => {
  test("fails closed when the secret is unset", () => {
    delete process.env.FEEDBACK_OPS_SECRET;
    assert.deepEqual(authorizeFeedbackOps("Bearer anything"), { ok: false, status: 401 });
    assert.deepEqual(authorizeFeedbackOps(null), { ok: false, status: 401 });
  });

  test("fails closed when the secret is blank", () => {
    process.env.FEEDBACK_OPS_SECRET = "   ";
    assert.deepEqual(authorizeFeedbackOps("Bearer    "), { ok: false, status: 401 });
  });

  test("rejects a missing or malformed header", () => {
    process.env.FEEDBACK_OPS_SECRET = "test-secret";
    assert.deepEqual(authorizeFeedbackOps(null), { ok: false, status: 401 });
    assert.deepEqual(authorizeFeedbackOps(""), { ok: false, status: 401 });
    assert.deepEqual(authorizeFeedbackOps("test-secret"), { ok: false, status: 401 });
    assert.deepEqual(authorizeFeedbackOps("Basic test-secret"), { ok: false, status: 401 });
  });

  test("rejects a wrong secret, including a different length", () => {
    process.env.FEEDBACK_OPS_SECRET = "test-secret";
    assert.deepEqual(authorizeFeedbackOps("Bearer wrong"), { ok: false, status: 401 });
    assert.deepEqual(authorizeFeedbackOps("Bearer test-secret-extra"), {
      ok: false,
      status: 401,
    });
    assert.deepEqual(authorizeFeedbackOps("Bearer test"), { ok: false, status: 401 });
  });

  test("accepts the exact bearer token", () => {
    process.env.FEEDBACK_OPS_SECRET = "test-secret";
    assert.deepEqual(authorizeFeedbackOps("Bearer test-secret"), { ok: true });
    assert.deepEqual(authorizeFeedbackOps("bearer test-secret"), { ok: true });
  });

  test("trims the configured secret and surrounding header whitespace", () => {
    process.env.FEEDBACK_OPS_SECRET = "  test-secret  ";
    assert.deepEqual(authorizeFeedbackOps("  Bearer   test-secret  "), { ok: true });
  });
});
