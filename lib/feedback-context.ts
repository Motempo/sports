import { attachmentMarkdown } from "@/lib/feedback-attachment-markdown";

export type InferredIntent = "bug" | "feature";

export type FeedbackCategory = "general" | "sport-request";

export interface SportRequestMetadata {
  requestedSport: string;
  currentSportSlug: string;
  availableSportSlugs: string[];
  userAgent?: string;
}

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

export function resolveAppId(explicitAppId?: string, pageUrl?: string): string {
  const explicit = explicitAppId?.trim();
  if (explicit) return explicit;
  return parsePageContext(pageUrl).app;
}

export function linearAppLabel(appId: string): string {
  return `app:${appId}`;
}

function normalizeSummary(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function buildIssueTitle(
  description: string,
  pageUrl?: string,
  options?: { category?: FeedbackCategory; requestedSport?: string; appId?: string }
): string {
  if (options?.category === "sport-request" && options.requestedSport?.trim()) {
    return `[sport-request] ${normalizeSummary(options.requestedSport).slice(0, 60)}`;
  }

  const app = resolveAppId(options?.appId, pageUrl);
  const { path } = parsePageContext(pageUrl);
  const firstLine = normalizeSummary(description.split("\n")[0] ?? "");
  const summary = firstLine.slice(0, 72) || "User feedback";
  const scope = path !== "/" ? `${app}${path}` : app;
  return `[${scope}] ${summary}`;
}

export function buildIssueBody(options: {
  description: string;
  pageUrl?: string;
  appId?: string;
  screenshotUrl?: string;
  attachmentFilename?: string;
  attachmentMimeType?: string;
  inferredIntent?: InferredIntent | null;
  category?: FeedbackCategory;
  sportRequest?: SportRequestMetadata;
}): string {
  const {
    description,
    pageUrl,
    appId: explicitAppId,
    screenshotUrl,
    attachmentFilename,
    attachmentMimeType,
    inferredIntent,
    category = "general",
    sportRequest,
  } = options;
  const { pageUrl: normalizedUrl, app: inferredApp } = parsePageContext(pageUrl);
  const appId = resolveAppId(explicitAppId, pageUrl);
  if (explicitAppId && inferredApp !== appId && process.env.NODE_ENV !== "production") {
    console.warn(`Feedback appId mismatch: explicit=${appId} hostname=${inferredApp}`);
  }
  const commit =
    process.env.COMMIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim()?.slice(0, 7) ||
    undefined;

  const attachmentBlock = screenshotUrl
    ? attachmentMarkdown(
        screenshotUrl,
        attachmentFilename ?? "attachment",
        attachmentMimeType
      )
    : "";

  const contextLines = [
    `- **App:** ${appId}`,
    `- Category: ${category}`,
    category === "sport-request" && sportRequest?.requestedSport
      ? `- Requested sport: ${sportRequest.requestedSport}`
      : null,
    category === "sport-request" && sportRequest?.currentSportSlug
      ? `- Current sport: ${sportRequest.currentSportSlug}`
      : null,
    category === "sport-request" && sportRequest?.availableSportSlugs?.length
      ? `- Available sports: ${sportRequest.availableSportSlugs.join(", ")}`
      : null,
    category === "sport-request" && sportRequest?.userAgent
      ? `- User agent: ${sportRequest.userAgent}`
      : null,
    normalizedUrl ? `- Page: ${normalizedUrl}` : null,
    commit ? `- Deploy: \`${commit}\`` : null,
    `- Reported: ${new Date().toISOString()}`,
    inferredIntent ? `- Intent: ${inferredIntent} (inferred)` : null,
  ].filter(Boolean);

  return [
    description.trim(),
    attachmentBlock,
    "",
    "---",
    "**Context**",
    ...contextLines,
  ].join("\n");
}

export function isInferredIntent(value: unknown): value is InferredIntent {
  return value === "bug" || value === "feature";
}

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return value === "general" || value === "sport-request";
}

export function isSportRequestMetadata(value: unknown): value is SportRequestMetadata {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestedSport === "string" &&
    v.requestedSport.trim().length > 0 &&
    typeof v.currentSportSlug === "string" &&
    Array.isArray(v.availableSportSlugs) &&
    v.availableSportSlugs.every((s) => typeof s === "string")
  );
}

export function formatSportRequestDescription(
  requestedSport: string,
  notes?: string
): string {
  const sport = requestedSport.trim();
  const detail = notes?.trim();
  if (!detail) {
    return `Sport request: ${sport}`;
  }
  return `Sport request: ${sport}\n\n${detail}`;
}
