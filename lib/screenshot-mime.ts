/** Raster types the feedback UI can produce or pass through. SVG is excluded. */
export const SCREENSHOT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
] as const;

const SCREENSHOT_MIME_SET = new Set<string>(SCREENSHOT_MIME_TYPES);

/**
 * Canonical image MIME for a screenshot upload, or undefined when the
 * client-supplied type is missing or not on the allowlist.
 * Parameters (`image/png; charset=binary`) are ignored. `image/jpg` maps to `image/jpeg`.
 */
export function allowedScreenshotMimeType(mime: string | undefined | null): string | undefined {
  if (!mime) return undefined;
  const base = mime.split(";")[0]?.trim().toLowerCase();
  if (!base) return undefined;
  const normalized = base === "image/jpg" ? "image/jpeg" : base;
  return SCREENSHOT_MIME_SET.has(normalized) ? normalized : undefined;
}
