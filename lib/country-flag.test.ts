import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import teamIsoMap from "@/data/team-iso-map.json" with { type: "json" };
import { countryFlagSrc } from "./country-flag.ts";
import { nationalityToIso2 } from "./f1-nationality.ts";

describe("bundled country flags", () => {
  it("points at a file in public/flags and rejects unknown codes", () => {
    assert.equal(countryFlagSrc("US"), "/flags/us.svg");
    assert.equal(countryFlagSrc("gb-eng"), "/flags/gb-eng.svg");
    assert.equal(countryFlagSrc("xx"), "/flags/xx.svg");
    assert.equal(countryFlagSrc("not-a-flag"), null);
    assert.equal(countryFlagSrc("usa"), null);
    for (const code of ["us", "gb", "gb-eng", "gb-sct", "gb-wls", "un"]) {
      assert.equal(
        existsSync(path.join(process.cwd(), "public/flags", `${code}.svg`)),
        true,
        code
      );
    }
  });

  it("covers World Cup squad codes and Formula 1 nationalities", () => {
    for (const iso of Object.values(teamIsoMap as Record<string, string>)) {
      assert.ok(countryFlagSrc(iso), iso);
    }
    for (const nationality of ["British", "Monegasque", "Dutch", "American", "Thai"]) {
      const iso = nationalityToIso2(nationality);
      assert.ok(iso && countryFlagSrc(iso), nationality);
    }
  });
});
