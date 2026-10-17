# Formula 1 circuit geometry

Track drawings on `/formula-1` are generated from the centreline in these GeoJSON files. The geometry is the MIT-licensed [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) dataset (Copyright (c) 2019-2025 Tomislav Bacinger). See `LICENSE.md`.

`sources.json` maps each Motempo circuit id to the upstream filename (`au-1953` is `circuits/au-1953.geojson` in that repo). `length` on each feature is metres and is shown as kilometres. It is the length shipped with the geometry, not a guessed lap distance.

Regenerate the SVGs in `public/venues/f1/` after a geometry edit:

```bash
node --experimental-strip-types --import ./scripts/register-node-test-alias.mjs scripts/build-f1-circuit-layouts.ts
```

The drawing is a centreline in the site link colour (`#1d9bf0`) with a start/finish bar. A circuit with no line becomes a neutral “Layout unavailable” placeholder. Nothing in the SVG is scenery.

This data is unofficial and is not associated with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trademarks of Formula One Licensing B.V.
