/** Max file size before base64 (~33% overhead stays under typical proxy limits). */
const TARGET_MAX_BYTES = 500_000;
const MAX_DIMENSION = 1440;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image"))),
      "image/jpeg",
      quality
    );
  });
}

/**
 * Resize and re-encode screenshots so JSON + base64 stays under reverse-proxy body limits.
 */
export async function compressBugScreenshot(file: File): Promise<File> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not compress image");
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > TARGET_MAX_BYTES && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  if (blob.size > TARGET_MAX_BYTES) {
    throw new Error(
      "Screenshot is still too large after compression. Try a smaller capture or submit without an image."
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "screenshot";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
