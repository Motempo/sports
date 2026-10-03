import { NextResponse } from "next/server";
import { authorizeFeedbackOps } from "@/lib/feedback-ops-auth";
import { isLinearConfigured, reopenLinearIssues } from "@/lib/linear-issues";

export async function POST(request: Request) {
  const auth = authorizeFeedbackOps(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  if (!isLinearConfigured()) {
    return NextResponse.json({ error: "LINEAR_API_KEY is not configured." }, { status: 503 });
  }

  let identifiers: string[] = [];
  try {
    const body = (await request.json()) as { identifiers?: string[] } | null;
    identifiers = body?.identifiers?.filter(Boolean) ?? [];
  } catch {
    return NextResponse.json({ error: "Expected JSON body with identifiers." }, { status: 400 });
  }

  if (identifiers.length === 0) {
    return NextResponse.json({ error: "No identifiers provided." }, { status: 400 });
  }

  const results = await reopenLinearIssues(identifiers);
  return NextResponse.json({ ok: true, results });
}
