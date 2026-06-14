import { randomUUID } from "node:crypto";
import {
  buildIssueBody,
  buildIssueTitle,
  type InferredIntent,
} from "@/lib/feedback-context";

type AttachmentMimeType = string;

type LinearGraphqlError = { message: string };
type LinearGraphqlResponse<T> = {
  data?: T;
  errors?: LinearGraphqlError[];
};

let cachedTeamId: string | null = null;

export interface FeedbackPayload {
  description: string;
  screenshotBase64?: string;
  screenshotMimeType?: AttachmentMimeType;
  screenshotFilename?: string;
  pageUrl?: string;
  inferredIntent?: InferredIntent | null;
}

export interface FeedbackResult {
  issueUrl: string;
  issueIdentifier: string;
}

function getApiKey(): string {
  const key = process.env.LINEAR_API_KEY?.trim();
  if (!key) {
    throw new Error("Feedback is not configured on the server.");
  }
  return key;
}

function formatLinearError(errors: LinearGraphqlError[] | undefined, fallback: string): string {
  const message = errors?.[0]?.message?.trim();
  if (!message) return fallback;
  if (/authentication|unauthorized|invalid api key/i.test(message)) {
    return "Linear API key is invalid or missing permissions.";
  }
  return message.length > 400 ? `${message.slice(0, 400)}…` : message;
}

async function linearRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getApiKey(),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Linear API error (${res.status}).`);
  }

  const json = (await res.json()) as LinearGraphqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(formatLinearError(json.errors, "Linear API error while creating an issue."));
  }
  if (!json.data) {
    throw new Error("Linear API returned an empty response.");
  }

  return json.data;
}

async function resolveTeamId(): Promise<string> {
  if (cachedTeamId) return cachedTeamId;

  const fromEnv = process.env.LINEAR_TEAM_ID?.trim();
  if (fromEnv) {
    cachedTeamId = fromEnv;
    return fromEnv;
  }

  const teamName = process.env.LINEAR_TEAM_NAME?.trim() || "motempo";
  const data = await linearRequest<{
    teams: { nodes: { id: string; name: string }[] };
  }>(
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
    throw new Error(`Linear team "${teamName}" was not found. Set LINEAR_TEAM_ID explicitly.`);
  }

  cachedTeamId = match.id;
  return match.id;
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/json": "json",
    "application/zip": "zip",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return map[mime] ?? "bin";
}

function resolveUploadFilename(mimeType: string, filename?: string): string {
  const trimmed = filename?.trim();
  if (trimmed) return trimmed;
  return `feedback-${randomUUID()}.${extFromMime(mimeType)}`;
}

async function uploadAttachment(
  fileBase64: string,
  mimeType: string,
  filename?: string
): Promise<string | undefined> {
  try {
    const contentType = mimeType.trim() || "application/octet-stream";
    const buffer = Buffer.from(fileBase64, "base64");
    const uploadFilename = resolveUploadFilename(contentType, filename);

    const data = await linearRequest<{
      fileUpload: {
        success: boolean;
        uploadFile?: {
          uploadUrl: string;
          assetUrl: string;
          headers: { key: string; value: string }[];
        };
      };
    }>(
      `mutation FileUpload($filename: String!, $contentType: String!, $size: Int!) {
        fileUpload(filename: $filename, contentType: $contentType, size: $size) {
          success
          uploadFile {
            uploadUrl
            assetUrl
            headers {
              key
              value
            }
          }
        }
      }`,
      {
        filename: uploadFilename,
        contentType,
        size: buffer.byteLength,
      }
    );

    const upload = data.fileUpload.uploadFile;
    if (!data.fileUpload.success || !upload?.uploadUrl || !upload.assetUrl) {
      return undefined;
    }

    const uploadHeaders = new Headers({ "Content-Type": contentType });
    for (const header of upload.headers ?? []) {
      uploadHeaders.set(header.key, header.value);
    }

    const putRes = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: uploadHeaders,
      body: buffer,
    });

    if (!putRes.ok) return undefined;
    return upload.assetUrl;
  } catch {
    return undefined;
  }
}

export async function createFeedbackIssue(payload: FeedbackPayload): Promise<FeedbackResult> {
  const teamId = await resolveTeamId();

  let attachmentUrl: string | undefined;
  if (payload.screenshotBase64 && payload.screenshotMimeType) {
    attachmentUrl = await uploadAttachment(
      payload.screenshotBase64,
      payload.screenshotMimeType,
      payload.screenshotFilename
    );
  }

  const data = await linearRequest<{
    issueCreate: {
      success: boolean;
      issue?: { id: string; identifier: string; url: string };
    };
  }>(
    `mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }`,
    {
      input: {
        teamId,
        title: buildIssueTitle(payload.description, payload.pageUrl),
        description: buildIssueBody({
          description: payload.description,
          pageUrl: payload.pageUrl,
          screenshotUrl: attachmentUrl,
          attachmentFilename: payload.screenshotFilename,
          attachmentMimeType: payload.screenshotMimeType,
          inferredIntent: payload.inferredIntent,
        }),
      },
    }
  );

  if (!data.issueCreate.success || !data.issueCreate.issue) {
    throw new Error("Linear could not create the issue.");
  }

  return {
    issueUrl: data.issueCreate.issue.url,
    issueIdentifier: data.issueCreate.issue.identifier,
  };
}

export function isLinearConfigured(): boolean {
  return Boolean(process.env.LINEAR_API_KEY?.trim());
}
