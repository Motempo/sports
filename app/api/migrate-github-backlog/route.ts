import { NextResponse } from "next/server";

type LinearGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

const MIGRATIONS = [
  {
    gh: 2,
    title: "[sports] Add Formula 1 page",
    description: `Build out a full Formula 1 section/page for Motempo Sports.

---
**Context**
- Page: https://sports.motempo.com/
- Intent: feature (migrated)
- Migrated from: GitHub Motempo/sports#2
- Reported: 2026-06-13T05:27:22Z`,
  },
  {
    gh: 8,
    title: "[sports] Use authoritative sources for news and fun facts",
    description: `Research the most knowledgeable and authoritative resources on the sport, then use those sources for:
- News in the news widget
- Fun facts in the fun facts widget

---
**Context**
- Page: https://sports.motempo.com/
- Intent: feature (migrated)
- Migrated from: GitHub Motempo/sports#8
- Reported: 2026-06-13T13:23:16Z`,
  },
  {
    gh: 9,
    title: "[sports] Research privacy policy and terms of service needs",
    description: `Research similar sports applications and recommend whether Motempo Sports needs Terms of Service and a Privacy Policy.

---
**Context**
- Page: https://sports.motempo.com/
- Intent: feature (migrated)
- Migrated from: GitHub Motempo/sports#9
- Reported: 2026-06-13T13:23:41Z`,
  },
] as const;

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

async function resolveTeamId(apiKey: string): Promise<string> {
  const fromEnv = process.env.LINEAR_TEAM_ID?.trim();
  if (fromEnv) return fromEnv;

  const teamName = process.env.LINEAR_TEAM_NAME?.trim() || "motempo";
  const data = await linearRequest<{ teams: { nodes: { id: string; name: string }[] } }>(
    apiKey,
    `query Teams {
      teams {
        nodes {
          id
          name
        }
      }
    }`
  );

  const match = data.teams.nodes.find(
    (team) => team.name.trim().toLowerCase() === teamName.toLowerCase()
  );
  if (!match) {
    throw new Error(`Linear team "${teamName}" was not found.`);
  }

  return match.id;
}

async function findExistingIssue(apiKey: string, title: string) {
  const data = await linearRequest<{
    issues: { nodes: { identifier: string; url: string }[] };
  }>(
    apiKey,
    `query Issues($title: String!) {
      issues(filter: { title: { eq: $title } }, first: 1) {
        nodes {
          identifier
          url
        }
      }
    }`,
    { title }
  );

  return data.issues.nodes[0];
}

export async function POST() {
  const apiKey = process.env.LINEAR_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "LINEAR_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const teamId = await resolveTeamId(apiKey);
    const results: Array<{
      github: number;
      identifier: string;
      url: string;
      created: boolean;
    }> = [];

    for (const migration of MIGRATIONS) {
      const existing = await findExistingIssue(apiKey, migration.title);
      if (existing) {
        results.push({
          github: migration.gh,
          identifier: existing.identifier,
          url: existing.url,
          created: false,
        });
        continue;
      }

      const data = await linearRequest<{
        issueCreate: {
          success: boolean;
          issue?: { identifier: string; url: string };
        };
      }>(
        apiKey,
        `mutation IssueCreate($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              identifier
              url
            }
          }
        }`,
        {
          input: {
            teamId,
            title: migration.title,
            description: migration.description,
          },
        }
      );

      if (!data.issueCreate.success || !data.issueCreate.issue) {
        throw new Error(`Failed to migrate GitHub issue #${migration.gh}.`);
      }

      results.push({
        github: migration.gh,
        identifier: data.issueCreate.issue.identifier,
        url: data.issueCreate.issue.url,
        created: true,
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Migration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
