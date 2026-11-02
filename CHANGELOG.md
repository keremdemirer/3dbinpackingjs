# Changelog

## Unreleased — 0.1.0 preparation

No npm version or GitHub release has been published by these changes.

### Added

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

The package remains private and marked `UNLICENSED`. Upstream licensing needs
clarification before public publication; see [license status](LICENSE-STATUS.md).

[#11]: https://github.com/keremdemirer/3dbinpackingjs/pull/11
[#12]: https://github.com/keremdemirer/3dbinpackingjs/pull/12
