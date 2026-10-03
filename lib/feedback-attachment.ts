import { compressBugScreenshot } from "@/lib/compressBugScreenshot";
import {
  isImageMimeType,
  validateAttachmentSize,
} from "@/lib/feedback-attachment-markdown";
import { allowedScreenshotMimeType } from "@/lib/screenshot-mime";

export {
  formatAttachmentSize,
  MAX_ATTACHMENT_BYTES,
  validateAttachmentSize,
} from "@/lib/feedback-attachment-markdown";
export { SCREENSHOT_MIME_TYPES } from "@/lib/screenshot-mime";

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
  if (!allowedScreenshotMimeType(file.type)) {
    throw new Error("Attach a PNG, JPEG, WebP, GIF, AVIF, HEIC, BMP, or TIFF image.");
  }

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

export function resolveAttachmentMimeType(file: File): string | undefined {
  return allowedScreenshotMimeType(file.type);
}
