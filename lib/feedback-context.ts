export type InferredIntent = "bug" | "feature";

export interface PageContext {
  app: string;
  path: string;
  pageUrl?: string;
}

const APP_HOSTS: Record<string, string> = {
  sports: "sports",
  ads: "ads",
  posts: "posts",
};

export function getDefaultMotempoAppId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MOTEMPO_APP_ID?.trim();
  return fromEnv || "sports";
}

export function parsePageContext(pageUrl?: string): PageContext {
  const fallbackApp = getDefaultMotempoAppId();

  if (!pageUrl?.trim()) {
    return { app: fallbackApp, path: "/", pageUrl: undefined };
  }

  try {
    const url = new URL(pageUrl);
    const host = url.hostname.toLowerCase();
    let app = fallbackApp;

    for (const [slug, label] of Object.entries(APP_HOSTS)) {
      if (host === `${slug}.motempo.com` || host.startsWith(`${slug}.`)) {
        app = label;
        break;
      }
    }

    if (app === fallbackApp && host.endsWith(".motempo.com")) {
      const sub = host.replace(/\.motempo\.com$/, "");
      if (sub && sub !== "www" && sub !== "motempo") {
        app = sub.split(".").pop() ?? fallbackApp;
      }
    }

    const path = url.pathname && url.pathname !== "" ? url.pathname : "/";
    return { app, path, pageUrl: url.toString() };
  } catch {
    return { app: fallbackApp, path: "/", pageUrl: pageUrl.trim() };
  }
}

function normalizeSummary(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function buildIssueTitle(description: string, pageUrl?: string): string {
  const { app, path } = parsePageContext(pageUrl);
  const firstLine = normalizeSummary(description.split("\n")[0] ?? "");
  const summary = firstLine.slice(0, 72) || "User feedback";
  const scope = path !== "/" ? `${app}${path}` : app;
  return `[${scope}] ${summary}`;
}

export function buildIssueBody(options: {
  description: string;
  pageUrl?: string;
  screenshotUrl?: string;
  inferredIntent?: InferredIntent | null;
}): string {
  const { description, pageUrl, screenshotUrl, inferredIntent } = options;
  const { pageUrl: normalizedUrl } = parsePageContext(pageUrl);
  const commit =
    process.env.COMMIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim()?.slice(0, 7) ||
    undefined;

  const screenshotMarkdown = screenshotUrl
    ? `\n\n![Screenshot](${screenshotUrl})`
    : "";

  const contextLines = [
    normalizedUrl ? `- Page: ${normalizedUrl}` : null,
    commit ? `- Deploy: \`${commit}\`` : null,
    `- Reported: ${new Date().toISOString()}`,
    inferredIntent ? `- Intent: ${inferredIntent} (inferred)` : null,
  ].filter(Boolean);

  return [
    description.trim(),
    screenshotMarkdown,
    "",
    "---",
    "**Context**",
    ...contextLines,
  ].join("\n");
}

export function isInferredIntent(value: unknown): value is InferredIntent {
  return value === "bug" || value === "feature";
}
