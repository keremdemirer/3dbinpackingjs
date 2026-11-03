[← Project overview](../README.md) · [Contributing](https://github.com/keremdemirer/3dbinpackingjs/blob/master/CONTRIBUTING.md)

# Testing and validation

With Node.js 22 or later installed, run:

```sh
npm ci
npm run check
```

`npm ci` installs the pinned development-only TypeScript compiler. `npm run check`
runs the runtime/package tests and strict type checks; `npm test` and
`npm run test:types` can also be run individually. Tests independently check bounds,
non-overlap, dimensions, instance identities, counts, and volume. They retain the
historical issue examples and focused skyline regressions, test both the API
and browser form adapter, and include 250 seeded mixed-box cases. Recorded
fingerprints from merged correctness release `0236195` verify that extraction
preserves the same placements and search decisions for that corpus. API checks
cover imports, invalid input, immutable inputs, and isolated/nested calls.

The package test creates an archive, checks its exact contents, installs it in a
temporary consumer outside the checkout with network access and lifecycle
scripts disabled, then checks CommonJS/ES module imports and type resolution
against that installed copy. Temporary files are removed after the test.

Viewer tests cover camera geometry, original-axis scaling, nearest-box ray
picking (including occlusion and parallel rays), pointer/keyboard/two-pointer
controls, snapshot callbacks, and unavailable-WebGL fallback. These are unit
checks with a mocked WebGL context, not GPU-rendering tests. Browser rendering,
example loading, box inspection, responsive layout, and downloaded PNG/JSON
outputs were also checked manually during development.

Rotation tests force all six internal axis variants, independently validate
allowed dimensions, and cover mixed rules, quantities, repeated dimensions/IDs,
layer selection/scoring, cubic-container search, invalid rules, and 300 seeded
mixed-rule cases. Existing free-rotation placement fingerprints remain unchanged.


Demo runner tests cover cancellation, replacement requests, queued stale replies,
worker errors and explicit synchronous fallback. Worker-protocol tests execute
the actual worker script with real solver and contact-analysis imports in a
Node worker harness, comparing both search and settling modes to synchronous
results and checking invalid-input recovery. This harness does not simulate
browser worker loading restrictions.
