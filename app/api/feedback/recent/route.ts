import { NextResponse } from "next/server";

type LinearGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function linearRequest<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as LinearGraphqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "Linear API error");
  }
  if (!json.data) {
    throw new Error("Linear API returned an empty response.");
  }

  return json.data;
}

export async function GET() {
  const apiKey = process.env.LINEAR_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "LINEAR_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const teamName = process.env.LINEAR_TEAM_NAME?.trim() || "motempo";
    const data = await linearRequest<{
      team: { issues: { nodes: Array<{
        identifier: string;
        title: string;
        url: string;
        createdAt: string;
        updatedAt: string;
        description?: string | null;
      }> } } | null;
    }>(
      apiKey,
      `query RecentIssues($teamName: String!) {
        team(filter: { name: { eqIgnoreCase: $teamName } }) {
          issues(first: 10, orderBy: updatedAt) {
            nodes {
              identifier
              title
              url
              createdAt
              updatedAt
              description
            }
          }
        }
      }`,
      { teamName }
    );

    const issues = data.team?.issues.nodes ?? [];
    return NextResponse.json({
      ok: true,
      count: issues.length,
      issues: issues.map((issue) => ({
        identifier: issue.identifier,
        title: issue.title,
        url: issue.url,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        descriptionPreview: issue.description?.split("\n")[0]?.slice(0, 160) ?? "",
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list issues.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
