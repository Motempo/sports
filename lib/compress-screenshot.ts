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
      reject(new Error("Could not load image. Try a different file or submit without a screenshot."));
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

/** Resize and re-encode screenshots so the upload stays under server body limits. */
export async function compressFeedbackScreenshot(file: File): Promise<File> {
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
      "Screenshot is still too large. Try a smaller image or submit without a screenshot."
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "screenshot";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Could not read image file."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => {
      reject(new Error("Could not read image file. Try again or submit without a screenshot."));
    };
    reader.readAsDataURL(file);
  });
}
