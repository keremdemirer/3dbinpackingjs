# Changelog

## Unreleased — 0.1.0 preparation

No npm version or GitHub release has been published by these changes.

### Added

- Optional `settle: true` downward post-pass in original Y coordinates, preserving
  packed volume, identities and rotation rules. Fixes the reported upright
  floating stack (base heights 1/3/5 become 0/2/4). Enabled by a demo checkbox;
  disabled by default in the API. Does not certify stability or remove overhangs.
- Settling regression/property checks and before/after corpus benchmark reports.
- Search and social metadata, canonical URL, sitemap, project/algorithm/API overview,
  software structured data, social preview artwork, and clearer repository introduction.

- Direct base-contact diagnostics in benchmark reports and the demo, including
  the reported 78.125% arrangement. Warnings and box inspection expose partial
  or absent contact without claiming physical stability or changing the solver.

- Reproducible performance/quality benchmark corpus with independent geometry
  validation, bounded worker execution, raw timing reports, constructive full-fill
  witnesses, and a bounded exact integer-grid oracle for tiny instances.
- Recorded quality baseline, profiling/order-sensitivity experiments, and a CI
  packed-volume regression check with downloadable reports and no timing gate.

- Per-item `rotation` rules: free rotation (default), upright with height on Y,
  or fixed X/Y/Z dimensions, enforced during layer selection, scoring, placement,
  and internal-axis transformations. Constrained results record their rule.
- Rotation controls and a “Keep it upright” example in the interactive demo.
- A live GitHub Pages demo, served from `master`, and a plain-static `.nojekyll` marker.

- Interactive 3D browser demo for [issue #5], with orbit/pan/zoom, mouse/touch/
  keyboard controls, box inspection, four examples, utilization and unpacked-item
  summaries, JSON export, and PNG export. Works without a server or CDN.
- Viewer geometry/control tests, WebGL fallback, and demo assets in the package
  archive. Changes to inputs disable exports until the result is recalculated.

- Standalone `pack({ container, items })` API for CommonJS, Node.js ES modules,
  and plain browser scripts, with structured placements, unpacked instances,
  item IDs, coordinates, dimensions, volumes, counts, and diagnostics. [#12]
- TypeScript declarations for the API and browser namespace, strict type checks,
  package metadata, and an explicit archive file list.
- Tests that install the actual npm archive in an isolated consumer and verify
  both runtime imports and TypeScript resolution.
- Independent geometry regression tests and CI on Node.js 22 and 24. [#11]

### Fixed

- Overlapping placements caused by skyline traversal and coordinate updates,
  item-group selection, stale candidate layers, and fixed fit-score limits. [#11]
- Inconsistent placement reports by saving and restoring the winning solution;
  empty/no-fit totals, repeated calculations, and input error reporting. [#11]

### Integration changes

- `pack1.js` is a browser form/report adapter. Custom pages must load `pack.js`
  before `pack1.js`; the included `index.html` already does so. [#12]
- The API requires numeric dimensions instead of coercing strings. The browser
  form converts its text fields to numbers. [#12]
- Node.js 22 or later is the supported runtime; CI checks Node.js 22 and 24.
- Contributors now run `npm ci` before checks to install the pinned development
  TypeScript compiler. The runtime package has no dependencies.

### Publication status

MIT is the preferred license, pending verified upstream permissions.
The package remains private and marked `UNLICENSED`. Upstream licensing needs
clarification before public publication; see [license status](LICENSE-STATUS.md).

[#11]: https://github.com/keremdemirer/3dbinpackingjs/pull/11
[#12]: https://github.com/keremdemirer/3dbinpackingjs/pull/12

[issue #5]: https://github.com/keremdemirer/3dbinpackingjs/issues/5
