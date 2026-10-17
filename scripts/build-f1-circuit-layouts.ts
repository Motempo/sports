import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { circuitSvgFromGeoJson, formatCircuitLength } from "@/lib/f1-circuit-layout";

interface CircuitRecord {
  id: string;
  slug: string;
  circuit: string;
  country: string;
  file: string;
  width: number;
  height: number;
  alt: string;
  lengthMeters?: number;
  layout?: "geometry" | "placeholder";
  [key: string]: unknown;
}

const root = process.cwd();
const catalogPath = path.join(root, "data/f1-circuit-photos.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as CircuitRecord[];
const placeholders: string[] = [];

for (const circuit of catalog) {
  const geoPath = path.join(root, "data/f1-circuits/geojson", `${circuit.id}.geojson`);
  let data: unknown = null;
  try {
    data = JSON.parse(readFileSync(geoPath, "utf8"));
  } catch {
    data = null;
  }
  const lengthHint =
    data && typeof data === "object"
      ? formatCircuitLength(
          (data as { features?: Array<{ properties?: { length?: number } }> }).features?.[0]?.properties
            ?.length
        )
      : null;
  const alt = lengthHint
    ? `Circuit layout of ${circuit.circuit}, ${circuit.country}, ${lengthHint}`
    : `Circuit layout unavailable for ${circuit.circuit}, ${circuit.country}`;
  const built = circuitSvgFromGeoJson(data as never, { label: alt });
  const file = `/venues/f1/${circuit.slug}.svg`;
  writeFileSync(path.join(root, "public", file.replace(/^\//, "")), built.svg);
  circuit.file = file;
  circuit.width = built.width;
  circuit.height = built.height;
  circuit.alt = alt;
  circuit.layout = built.layout;
  if (built.layout === "geometry" && built.lengthMeters != null) {
    circuit.lengthMeters = built.lengthMeters;
  } else {
    delete circuit.lengthMeters;
    placeholders.push(`${circuit.circuit} (${circuit.id})`);
  }
}

writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${catalog.length} circuit SVGs.`);
if (placeholders.length === 0) {
  console.log("Every calendar circuit used real geometry.");
} else {
  console.log("Placeholder layouts:");
  for (const name of placeholders) console.log(`- ${name}`);
}
