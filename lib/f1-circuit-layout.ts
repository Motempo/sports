/** SVG circuit outlines drawn from bacinger/f1-circuits GeoJSON. */

export type CircuitLayoutKind = "geometry" | "placeholder";

export interface CircuitLayoutSvg {
  layout: CircuitLayoutKind;
  lengthMeters: number | null;
  width: number;
  height: number;
  svg: string;
}

interface GeoFeature {
  properties?: { length?: unknown; Name?: unknown };
  geometry?: { type?: string; coordinates?: unknown };
}

interface GeoCollection {
  features?: GeoFeature[];
}

export function formatCircuitLength(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters) || meters <= 0) return null;
  return `${(meters / 1000).toFixed(3)} km`;
}

function collectLine(geometry: GeoFeature["geometry"]): number[][] {
  if (!geometry) return [];
  if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.filter(isLonLat);
  }
  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.flatMap((line) => (Array.isArray(line) ? line.filter(isLonLat) : []));
  }
  return [];
}

function isLonLat(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function placeholderSvg(label: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" role="img">
  <title>${escapeXml(label)}</title>
  <rect x="1" y="1" width="318" height="178" rx="16" fill="none" stroke="#71767b" stroke-width="1.5" stroke-dasharray="5 4"/>
  <text x="160" y="96" text-anchor="middle" fill="#71767b" font-family="system-ui,Segoe UI,sans-serif" font-size="14">Layout unavailable</text>
</svg>
`;
}

function startFinish(points: Array<[number, number]>): { x1: number; y1: number; x2: number; y2: number } {
  const origin = points[0]!;
  let next = points[1] ?? origin;
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i]!;
    if (Math.hypot(point[0] - origin[0], point[1] - origin[1]) >= 6) {
      next = point;
      break;
    }
  }
  const dx = next[0] - origin[0];
  const dy = next[1] - origin[1];
  const mag = Math.hypot(dx, dy) || 1;
  const len = 8;
  return {
    x1: origin[0] - (-dy / mag) * len,
    y1: origin[1] - (dx / mag) * len,
    x2: origin[0] + (-dy / mag) * len,
    y2: origin[1] + (dx / mag) * len,
  };
}

/**
 * Project a circuit centreline into a theme-coloured outline.
 * Missing geometry becomes a neutral placeholder — no invented corners.
 */
export function circuitSvgFromGeoJson(
  data: GeoCollection | null | undefined,
  options?: { label?: string }
): CircuitLayoutSvg {
  const feature = data?.features?.find((item) => collectLine(item.geometry).length >= 2);
  const coords = feature ? collectLine(feature.geometry) : [];
  const rawLength = feature?.properties?.length;
  const lengthMeters = typeof rawLength === "number" && Number.isFinite(rawLength) ? rawLength : null;
  const label = options?.label?.trim() || "Circuit layout";

  if (coords.length < 2) {
    return {
      layout: "placeholder",
      lengthMeters: null,
      width: 320,
      height: 180,
      svg: placeholderSvg(label),
    };
  }

  const lats = coords.map((pair) => pair[1]!);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const cos = Math.cos((midLat * Math.PI) / 180);
  const projected = coords.map(([lon, lat]) => [lon! * cos, lat!] as [number, number]);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of projected) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const pad = 18;
  const target = 248;
  const scale = target / Math.max(spanX, spanY);
  const width = Math.round(spanX * scale + pad * 2);
  const height = Math.round(spanY * scale + pad * 2);
  const points = projected.map(([x, y]) => {
    const px = pad + (x - minX) * scale;
    const py = pad + (maxY - y) * scale;
    return [px, py] as [number, number];
  });
  const pointList = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const marker = startFinish(points);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <title>${escapeXml(label)}</title>
  <polyline points="${pointList}" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${pointList}" fill="none" stroke="#1d9bf0" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="${marker.x1.toFixed(1)}" y1="${marker.y1.toFixed(1)}" x2="${marker.x2.toFixed(1)}" y2="${marker.y2.toFixed(1)}" stroke="#ffffff" stroke-width="6" stroke-linecap="butt"/>
  <line x1="${marker.x1.toFixed(1)}" y1="${marker.y1.toFixed(1)}" x2="${marker.x2.toFixed(1)}" y2="${marker.y2.toFixed(1)}" stroke="#E10600" stroke-width="3.2" stroke-linecap="butt"/>
</svg>
`;
  return { layout: "geometry", lengthMeters, width, height, svg };
}
