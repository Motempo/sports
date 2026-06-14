import { compressBugScreenshot } from "@/lib/compressBugScreenshot";
import {
  isImageMimeType,
  validateAttachmentSize,
} from "@/lib/feedback-attachment-markdown";

export {
  formatAttachmentSize,
  MAX_ATTACHMENT_BYTES,
  validateAttachmentSize,
} from "@/lib/feedback-attachment-markdown";

export function canPreviewAttachment(mime: string): boolean {
  return isImageMimeType(mime);
}

function shouldCompressImage(file: File): boolean {
  if (!isImageMimeType(file.type)) return false;
  // SVG and GIF are kept as-is; canvas compression is lossy or drops animation.
  if (file.type === "image/svg+xml" || file.type === "image/gif") return false;
  return true;
}

/**
 * Compress screenshots when possible; pass other files through with a size check.
 */
export async function prepareFeedbackAttachment(file: File): Promise<File> {
  if (shouldCompressImage(file)) {
    try {
      return await compressBugScreenshot(file);
    } catch {
      validateAttachmentSize(file.size);
      return file;
    }
  }

  validateAttachmentSize(file.size);
  return file;
}

export function resolveAttachmentMimeType(file: File): string {
  const mime = file.type.trim();
  return mime || "application/octet-stream";
}
