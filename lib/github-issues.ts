import { Octokit } from "@octokit/rest";
import { randomUUID } from "node:crypto";

type GithubApiError = { status?: number; message?: string };
type ImageMimeType = "image/png" | "image/jpeg" | "image/webp";

function asGithubError(err: unknown): GithubApiError {
  if (err && typeof err === "object") return err as GithubApiError;
  return {};
}

function normalizeGithubRepoRef(raw: string): string {
  let s = raw.trim();
  if (!s) return "Motempo/sports";
  s = s.replace(/^https?:\/\/github\.com\//i, "");
  s = s.replace(/\.git$/i, "");
  s = s.replace(/\/+$/, "");
  return s;
}

function parseRepo(repo: string): { owner: string; repo: string } {
  const trimmed = normalizeGithubRepoRef(repo);
  const slash = trimmed.indexOf("/");
  if (slash <= 0 || slash === trimmed.length - 1) {
    throw new Error(`Invalid GITHUB_BUG_REPO: ${repo}`);
  }
  return {
    owner: trimmed.slice(0, slash),
    repo: trimmed.slice(slash + 1),
  };
}

function getBugLabels(): string[] {
  const raw = process.env.GITHUB_BUG_LABELS?.trim();
  if (raw === "") return [];
  if (raw) return raw.split(",").map((l) => l.trim()).filter(Boolean);
  return ["feedback", "user-report"];
}

function formatGithubError(err: unknown, owner: string, repo: string): string {
  const gh = asGithubError(err);
  const status = gh.status;
  const raw = gh.message?.split("\n")[0]?.trim() ?? "";

  if (status === 404) {
    return `Cannot access GitHub repo ${owner}/${repo}. Check GITHUB_BUG_REPO and token permissions.`;
  }
  if (status === 401) {
    return "GitHub token is invalid or expired.";
  }
  if (status === 403) {
    return `GitHub denied access to ${owner}/${repo}. Ensure the token can create issues.`;
  }
  if (status === 422 && /label/i.test(raw)) {
    return "GitHub could not apply issue labels. Create feedback and user-report labels on the repo.";
  }
  if (raw && !raw.includes("docs.github.com")) return raw;
  return `GitHub API error${status ? ` (${status})` : ""} while creating an issue.`;
}

function mimeToExt(mime: ImageMimeType): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function isLabelValidationError(err: unknown): boolean {
  const gh = asGithubError(err);
  return gh.status === 422 && /label/i.test(gh.message ?? "");
}

export interface FeedbackPayload {
  description: string;
  screenshotBase64?: string;
  screenshotMimeType?: ImageMimeType;
  screenshotFilename?: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface FeedbackResult {
  issueUrl: string;
  issueNumber: number;
}

async function uploadScreenshot(
  octokit: Octokit,
  owner: string,
  repo: string,
  imageBase64: string,
  imageMimeType: ImageMimeType
): Promise<string | undefined> {
  try {
    const ext = mimeToExt(imageMimeType);
    const date = new Date().toISOString().slice(0, 10);
    const path = `feedback-screenshots/${date}/${randomUUID()}.${ext}`;

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `feedback: screenshot ${path}`,
      content: Buffer.from(imageBase64, "base64").toString("base64"),
    });

    const branch = (await octokit.repos.get({ owner, repo })).data.default_branch ?? "main";
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  } catch {
    return undefined;
  }
}

async function createIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels: string[]
) {
  return octokit.issues.create({
    owner,
    repo,
    title,
    body,
    ...(labels.length > 0 ? { labels } : {}),
  });
}

export async function createFeedbackIssue(payload: FeedbackPayload): Promise<FeedbackResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("Feedback is not configured on the server.");
  }

  const repoStr = process.env.GITHUB_BUG_REPO?.trim() || "Motempo/sports";
  const { owner, repo } = parseRepo(repoStr);
  const labels = getBugLabels();
  const octokit = new Octokit({ auth: token });

  try {
    await octokit.repos.get({ owner, repo });
  } catch (err) {
    throw new Error(formatGithubError(err, owner, repo));
  }

  let screenshotUrl: string | undefined;
  if (payload.screenshotBase64 && payload.screenshotMimeType) {
    screenshotUrl = await uploadScreenshot(
      octokit,
      owner,
      repo,
      payload.screenshotBase64,
      payload.screenshotMimeType
    );
  }

  const screenshotMarkdown = screenshotUrl
    ? `\n\n## Screenshot\n\n![Screenshot](${screenshotUrl})`
    : "";

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

  let issue;
  try {
    issue = await createIssue(octokit, owner, repo, title, body, labels);
  } catch (err) {
    if (labels.length > 0 && isLabelValidationError(err)) {
      issue = await createIssue(octokit, owner, repo, title, body, []);
    } else {
      throw new Error(formatGithubError(err, owner, repo));
    }
  }

  return {
    issueUrl: issue.data.html_url ?? "",
    issueNumber: issue.data.number,
  };
}

export function isGitHubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN?.trim());
}
