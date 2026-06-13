import { Octokit } from "@octokit/rest";

function parseRepo(repo: string): { owner: string; repo: string } {
  const cleaned = repo.replace("https://github.com/", "").replace(/\.git$/, "");
  const [owner, name] = cleaned.split("/");
  return { owner, repo: name };
}

export interface FeedbackPayload {
  description: string;
  screenshotBase64?: string;
  screenshotFilename?: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface FeedbackResult {
  issueUrl: string;
  issueNumber: number;
}

export async function createFeedbackIssue(payload: FeedbackPayload): Promise<FeedbackResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("Feedback is not configured");
  }

  const repoStr = process.env.GITHUB_BUG_REPO?.trim() || "Motempo/sports";
  const { owner, repo } = parseRepo(repoStr);
  const labels = (process.env.GITHUB_BUG_LABELS || "feedback,user-report")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const octokit = new Octokit({ auth: token });

  let screenshotMarkdown = "";
  if (payload.screenshotBase64 && payload.screenshotFilename) {
    const ext = payload.screenshotFilename.split(".").pop()?.toLowerCase() ?? "png";
    const date = new Date().toISOString().slice(0, 10);
    const path = `feedback-screenshots/${date}/${crypto.randomUUID()}.${ext}`;

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `feedback screenshot ${date}`,
      content: payload.screenshotBase64,
    });

    screenshotMarkdown = `\n\n![Screenshot](https://github.com/${owner}/${repo}/blob/main/${path}?raw=true)`;
  }

  const body = [
    payload.description,
    screenshotMarkdown,
    "",
    "---",
    "**Reporter context**",
    `- Page: ${payload.pageUrl ?? "unknown"}`,
    `- User agent: ${payload.userAgent ?? "unknown"}`,
    `- Timestamp: ${new Date().toISOString()}`,
    `- Commit: ${process.env.COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown"}`,
  ].join("\n");

  const title = payload.description.split("\n")[0].slice(0, 120) || "User feedback";

  const issue = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });

  return {
    issueUrl: issue.data.html_url ?? "",
    issueNumber: issue.data.number,
  };
}
