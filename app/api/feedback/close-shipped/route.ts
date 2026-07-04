import { NextResponse } from "next/server";
import { closeLinearIssues, isLinearConfigured } from "@/lib/linear-issues";

/** Shipped work — run after deploy to close feedback tickets that are live in production. */
const SHIPPED_IDENTIFIERS = [
  "MOT-6",
  "MOT-7",
  "MOT-8",
  "MOT-9",
  "MOT-10",
  "MOT-11",
  "MOT-12",
  "MOT-13",
  "MOT-14",
  "MOT-15",
  "MOT-16",
  "MOT-17",
  "MOT-18",
  "MOT-19",
  "MOT-20",
  "MOT-21",
  "MOT-22",
  "MOT-23",
  "MOT-24",
  "MOT-25",
  "MOT-26",
  "MOT-27",
  "MOT-28",
  "MOT-29",
  "MOT-30",
  "MOT-31",
  "MOT-32",
  "MOT-33",
  "MOT-34",
  "MOT-35",
  "MOT-36",
  "MOT-37",
  "MOT-38",
] as const;

const CLOSE_COMMENT =
  "Closed automatically: fix shipped to production on sports.motempo.com. Reopen if anything still looks wrong.";

export async function POST(request: Request) {
  if (!isLinearConfigured()) {
    return NextResponse.json({ error: "LINEAR_API_KEY is not configured." }, { status: 503 });
  }

  let identifiers: string[] = [...SHIPPED_IDENTIFIERS];
  try {
    const body = (await request.json()) as { identifiers?: string[] } | null;
    if (body?.identifiers?.length) {
      identifiers = body.identifiers.filter(Boolean);
    }
  } catch {
    // Default list is fine for empty bodies.
  }

  const results = await closeLinearIssues(identifiers, CLOSE_COMMENT);
  const summary = {
    closed: results.filter((r) => r.status === "closed").length,
    alreadyClosed: results.filter((r) => r.status === "already_closed").length,
    notFound: results.filter((r) => r.status === "not_found").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  return NextResponse.json({ ok: true, summary, results });
}
