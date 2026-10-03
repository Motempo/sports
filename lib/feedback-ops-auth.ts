import { createHash, timingSafeEqual } from "node:crypto";

export type FeedbackOpsAuthResult = { ok: true } | { ok: false; status: 401 };

/**
 * Fail closed. An unset or blank `FEEDBACK_OPS_SECRET` is the same 401 as a
 * missing or wrong bearer, so these routes never run without a configured secret
 * and the response does not reveal which check failed.
 */
export function authorizeFeedbackOps(authorization: string | null): FeedbackOpsAuthResult {
  const secret = process.env.FEEDBACK_OPS_SECRET?.trim() ?? "";
  if (!secret || !bearerMatchesSecret(authorization, secret)) {
    return { ok: false, status: 401 };
  }
  return { ok: true };
}

function bearerMatchesSecret(authorization: string | null, secret: string): boolean {
  const token = extractBearerToken(authorization) ?? "";
  return timingSafeEqualSha256(token, secret);
}

/** `Authorization: Bearer <token>`. Scheme is case-insensitive; the token is exact. */
function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(\S.*?)\s*$/i.exec(authorization.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/** Compare SHA-256 digests so unequal lengths still take constant time. */
function timingSafeEqualSha256(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
