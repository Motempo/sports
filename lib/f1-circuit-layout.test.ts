import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { listF1Circuits } from "./f1-circuits.ts";
import { circuitSvgFromGeoJson, formatCircuitLength } from "./f1-circuit-layout.ts";

describe("F1 circuit SVG generation", () => {
  it("uses a neutral placeholder when a circuit has no centreline", () => {
    const built = circuitSvgFromGeoJson({ features: [] }, { label: "Circuit layout unavailable for Madring" });
    assert.equal(built.layout, "placeholder");
    assert.equal(built.lengthMeters, null);
    assert.match(built.svg, /Layout unavailable/);
    assert.equal(built.svg.includes("#1d9bf0"), false);
    assert.equal(/tree|grandstand|water|crowd|building/i.test(built.svg), false);
  });

  it("matches every committed drawing to the GeoJSON centreline", () => {
    const placeholders: string[] = [];
    for (const circuit of listF1Circuits()) {
      const geoPath = path.join(process.cwd(), "data/f1-circuits/geojson", `${circuit.id}.geojson`);
      const geo = JSON.parse(readFileSync(geoPath, "utf8")) as {
        features?: Array<{ properties?: { length?: number } }>;
      };
      const built = circuitSvgFromGeoJson(geo, { label: circuit.alt });
      const onDisk = readFileSync(
        path.join(process.cwd(), "public", circuit.file.replace(/^\//, "")),
        "utf8"
      );
      assert.equal(onDisk, built.svg, circuit.id);
      assert.equal(built.layout, "geometry", circuit.id);
      assert.match(built.svg, /stroke="#1d9bf0"/);
      assert.match(built.svg, /stroke="#E10600"/);
      assert.equal(built.lengthMeters, geo.features?.[0]?.properties?.length, circuit.id);
      assert.equal(circuit.lengthMeters, built.lengthMeters, circuit.id);
      assert.equal(formatCircuitLength(circuit.lengthMeters), circuit.alt.match(/(\d+\.\d{3} km)$/)?.[1]);
      if (built.layout !== "geometry") placeholders.push(circuit.circuit);
    }
    assert.deepEqual(placeholders, []);
  });
});
