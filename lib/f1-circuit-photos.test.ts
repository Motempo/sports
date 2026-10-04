import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { f1CircuitPhotoOnDisk, listF1CircuitPhotos, lookupF1CircuitPhoto } from "./f1-circuit-photos.ts";
import { listF1Circuits } from "./f1-circuits.ts";

describe("F1 circuit photos", () => {
  const photos = listF1CircuitPhotos();

  it("maps every calendar circuit to a same-origin illustrated aerial", () => {
    assert.equal(photos.length, listF1Circuits().length);
    assert.equal(photos.length, 23);
    const slugs = new Set<string>();
    for (const photo of photos) {
      assert.equal(slugs.has(photo.slug), false, photo.slug);
      slugs.add(photo.slug);
      const image = lookupF1CircuitPhoto(photo.circuit);
      assert.equal(image?.url, `/venues/f1/${photo.slug}.webp`);
      assert.equal(photo.file, image?.url);
      assert.equal(image?.width, 1600);
      assert.equal(image?.height, 1067);
      assert.match(photo.alt, /^Illustrated aerial of /);
      assert.equal(/photograph|photo\b|wikimedia|commons/i.test(photo.alt), false, photo.alt);
      assert.equal("license" in photo, false);
      assert.equal("author" in photo, false);
      assert.equal("credit" in photo, false);
      assert.equal("sourceUrl" in photo, false);
      assert.equal("credit" in (image ?? {}), false);
    }
  });

  it("matches a circuit after accent folding and known aliases", () => {
    assert.equal(
      lookupF1CircuitPhoto("Autodromo Hermanos Rodriguez")?.url,
      "/venues/f1/hermanos-rodriguez.webp"
    );
    assert.equal(lookupF1CircuitPhoto("Losail International Circuit")?.url, "/venues/f1/lusail.webp");
    assert.equal(lookupF1CircuitPhoto("Lusail International Circuit")?.url, "/venues/f1/lusail.webp");
    assert.equal(lookupF1CircuitPhoto("Kuala Lumpur")?.url, "/venues/f1/sepang.webp");
    assert.equal(lookupF1CircuitPhoto("Sepang International Circuit")?.url, "/venues/f1/sepang.webp");
  });

  it("does not claim a football ground or an unknown circuit", () => {
    assert.equal(lookupF1CircuitPhoto("Estadio La Rosaleda"), null);
    assert.equal(lookupF1CircuitPhoto("Anfield"), null);
    assert.equal(lookupF1CircuitPhoto("Bahrain International Circuit"), null);
  });

  it("returns the aerial only when that webp is on disk", () => {
    const dir = path.join(process.cwd(), "public/venues/f1");
    for (const photo of photos) {
      const onDisk = f1CircuitPhotoOnDisk(photo.circuit);
      const exists = existsSync(path.join(process.cwd(), "public", photo.file.replace(/^\//, "")));
      assert.equal(onDisk?.url ?? null, exists ? photo.file : null, photo.slug);
    }
    if (existsSync(dir)) {
      const expected = new Set(photos.map((photo) => `${photo.slug}.webp`));
      for (const name of readdirSync(dir)) {
        if (!name.endsWith(".webp")) continue;
        assert.equal(expected.has(name), true, name);
      }
    }
  });
});