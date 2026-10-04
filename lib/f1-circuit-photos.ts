import { existsSync } from "node:fs";
import path from "node:path";
import type { VenueImage } from "@/lib/types";
import { listF1Circuits, lookupF1Circuit, type F1CircuitRecord } from "@/lib/f1-circuits";

function toImage(circuit: F1CircuitRecord): VenueImage {
  return {
    url: circuit.file,
    alt: circuit.alt,
    width: circuit.width,
    height: circuit.height,
  };
}

/**
 * Same-origin illustrated aerial for a calendar circuit.
 * Matching is exact on the catalog name and aliases, after accent folding.
 * The file may not be on disk yet — callers that render check {@link f1CircuitPhotoOnDisk}.
 */
export function lookupF1CircuitPhoto(name: string | null | undefined): VenueImage | null {
  const circuit = lookupF1Circuit(undefined, name ?? undefined);
  return circuit ? toImage(circuit) : null;
}

/** Catalog image when `public/venues/f1/<slug>.webp` exists, otherwise nothing. */
export function f1CircuitPhotoOnDisk(name: string | null | undefined): VenueImage | null {
  const image = lookupF1CircuitPhoto(name);
  if (!image) return null;
  const relative = image.url.replace(/^\//, "");
  return existsSync(path.join(process.cwd(), "public", relative)) ? image : null;
}

export function listF1CircuitPhotos(): readonly F1CircuitRecord[] {
  return listF1Circuits();
}
