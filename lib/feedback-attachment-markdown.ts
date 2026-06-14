export function isImageMimeType(mime: string): boolean {
  return mime.startsWith("image/");
}

export function attachmentMarkdown(
  url: string,
  filename: string,
  mimeType?: string
): string {
  const label = filename.trim() || "attachment";
  if (mimeType && isImageMimeType(mimeType)) {
    return `\n\n![${label}](${url})`;
  }
  return `\n\n**Attachment:** [${label}](${url})`;
}

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateAttachmentSize(bytes: number): void {
  if (bytes > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Attachment must be under ${formatAttachmentSize(MAX_ATTACHMENT_BYTES)}.`
    );
  }
}
