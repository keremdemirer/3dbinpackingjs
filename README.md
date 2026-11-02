# 3dbinpackingjs — 3D bin packing in JavaScript

A JavaScript library for arranging rectangular boxes inside a single container,
with an interactive 3D packing demo, per-item rotation rules, and a standalone API
for Node.js and browsers. CommonJS, ES modules, and TypeScript declarations are included.

The solver uses a volume-maximizing EB-AFIT heuristic, converted from
[wknechtel/3d-bin-pack](https://github.com/wknechtel/3d-bin-pack/). It finds useful
geometric arrangements; it does not guarantee optimal packing or physical stability.

**[Try the live demo](https://keremdemirer.github.io/3dbinpackingjs/)**

## Explore the project

- [Interactive box-packing demo](https://keremdemirer.github.io/3dbinpackingjs/):
  enter dimensions and quantities, inspect individual placements, and export JSON or PNG.
- [Rotation rules](#rotation-rules): free, upright, or fixed per box type.
- [Performance and quality benchmarks](bench/README.md): reproducible measurements,
  geometry validation, and known-fill comparisons.
- [License status and provenance](LICENSE-STATUS.md): upstream permission is unresolved;
  the package is not published to npm.

## JavaScript API

From a checkout, use CommonJS in Node.js:

```js
const { pack } = require('./pack.js');

const result = pack({
  container: { width: 2, height: 1, depth: 1 },
  items: [
    { id: 'sku-A', width: 1, height: 1, depth: 1, quantity: 3 }
  ]
});

console.log(result.packedCount); // 2
console.log(result.unpacked);   // One remaining instance of sku-A
```

For Node.js ES modules, use `import { pack } from './pack.mjs'`. The package
entry point also exposes `pack` for CommonJS and ES module consumers. The
package remains marked `private: true`; version `0.1.0` is an unreleased
package preparation. See [license status and provenance](LICENSE-STATUS.md) for
the outstanding license decision and [the changelog](CHANGELOG.md) for changes.

For a browser without a bundler, load the core and use its namespace:

```html
<script src="pack.js"></script>
<script>
  const result = BinPacking.pack({
    container: { width: 1, height: 2, depth: 3 },
    items: [{ id: 'box', width: 1, height: 2, depth: 3 }]
  });
  console.log(result.placements);
</script>
```

The core does not access the DOM, print output, or store shared solver state.
`pack()` is synchronous. Input objects are not modified, and returned objects
belong to that call. Invalid input throws `TypeError`; the browser form displays
the error in its report field.

### Inputs

- `container`: an object with numeric `width`, `height`, and `depth`.
- `items`: an array of objects with the same three dimension fields, optional
  `id`, optional `quantity` (defaults to `1`), and optional `rotation` (defaults
  to `"free"`). An empty array is allowed.
- `settle`: optional boolean, defaults to `false`. See downward settling below.
- Dimensions must be positive finite numbers in one consistent unit. API values
  are not coerced from strings. Computed volumes must stay positive and finite.
- Quantities must be positive safe integers. Quantities are expanded into
  individual instances, so memory and runtime grow with the total item count.
- IDs may be strings or finite numbers. An omitted ID defaults to the item's
  zero-based array index. Duplicate IDs are allowed: `itemIndex` and
  `instanceIndex` distinguish every instance.

### Rotation rules

Set `rotation` independently on each item type:

| Rule | Allowed orientations in the original container axes |
| --- | --- |
| `"free"` (default) | All six width/height/depth permutations. |
| `"upright"` | Height stays on Y; width and depth may swap around that axis. |
| `"fixed"` | Width stays on X, height on Y, and depth on Z. |

```js
const result = pack({
  container: { width: 4, height: 3, depth: 2 },
  items: [{ id: 'carton', width: 2, height: 3, depth: 4, rotation: 'upright' }]
});
// Fits as 4 × 3 × 2. With rotation: 'fixed', this carton would be unpacked.
```

The rules remain relative to the **original** container axes throughout the
search, even when the solver changes its internal layer axes. They describe
axis-aligned dimensions, not labeled faces, weight, or physical stability.
Invalid rule values throw `TypeError`. Omitting the rule preserves the previous
free-rotation behavior and result shape.

### Optional downward settling

Set `settle: true` on the request to close vertical gaps after packing:

```js
const result = pack({
  container: { width: 12, height: 10, depth: 8 },
  items: [{ width: 2, height: 7, depth: 5, quantity: 5, rotation: 'upright' }],
  settle: true
});
console.log(result.diagnostics.settling); // { movedCount, totalDrop }
```

This deterministic post-pass lowers boxes along the original **Y axis**, bottom
first, until the floor or another box blocks the fall. X/Z coordinates,
orientations, identities, placement order, packed count, and volume are preserved.
The API defaults to disabled for compatibility; the demo enables it with a
“Settle boxes downward” checkbox. Uncheck it to inspect the original arrangement.
JSON exports and the text report use the same final coordinates as the viewer.

Settling uses O(n²) footprint checks and O(n) extra storage for n packed boxes.
It does not repack leftover items, move boxes sideways, or remove overhangs.
Any positive area of contact stops a fall; weight, balance, strength, and center
of mass are not modeled. Contact warnings remain relevant after settling.
`diagnostics.settling` is present only when enabled: `movedCount` counts changed
boxes and `totalDrop` sums their vertical distances in the input unit.

### Results

`pack()` returns:

| Field | Meaning |
| --- | --- |
| `container` | A copy of the input container dimensions. |
| `placements` | One record per packed instance, in input/instance order. |
| `unpacked` | One record per unpacked instance, in input/instance order. |
| `totalCount`, `packedCount` | Requested and packed instance counts. |
| `containerVolume`, `totalItemVolume`, `packedVolume` | Volumes in cubic input units. |
| `utilization` | Packed volume / container volume, as a fraction (multiply by 100 for a percentage). |
| `diagnostics.iterations` | Number of initial-layer search trials. |

Each record contains `id`, `itemIndex` (zero-based input array index),
`instanceIndex` (zero-based within that item's quantity), and `dimensions`.
Packed records also contain `position: { x, y, z }`, the minimum corner in the
**original container axes**. Width maps to X, height to Y, and depth to Z.
Constrained records include `rotation: "upright"` or `rotation: "fixed"` in both
`placements` and `unpacked`. Free-rotation records omit this field for backward
compatibility. For packed records, `dimensions` describes the rotated width/height/depth in
those axes. Unpacked records keep the original dimensions and have no position.

A packed record from the example above looks like:

```js
{
  id: 'sku-A', itemIndex: 0, instanceIndex: 0,
  position: { x: 0, y: 0, z: 0 },
  dimensions: { width: 1, height: 1, depth: 1 }
}
```

## TypeScript

Declarations are included for CommonJS, Node.js ES modules, and the browser
namespace. No separate `@types` package is needed. After installing a local
package archive, import the function and types from the package name:

```ts
import { pack } from '3dbinpackingjs';
import type { PackInput, PackResult } from '3dbinpackingjs';

const input: PackInput = {
  container: { width: 2, height: 1, depth: 1 },
  items: [{ id: 'sku-A', width: 1, height: 1, depth: 1, quantity: 3 }]
};
const result: PackResult = pack(input);
```

Readonly input arrays and frozen dimension/item objects are accepted; results
are mutable copies. Declarations describe the data shape, while runtime
validation still checks finite dimensions and valid quantities. Type checks
cover NodeNext resolution for CommonJS and ES modules. TypeScript browser
scripts can reference `pack.d.ts` to use `BinPacking` after loading `pack.js`.

## Package archive

Node.js 22 or later is supported; CI runs on Node.js 22 and 24. The runtime has
no dependencies. The archive includes the core, both module/declaration entry
points, browser example, README, changelog, and license-status notes. Tests,
compiler dependencies, and CI configuration are excluded.

For local inspection, `npm pack` creates `3dbinpackingjs-0.1.0.tgz`. A separate
application can install that file with `npm install /path/to/3dbinpackingjs-0.1.0.tgz`.
Public npm publication remains disabled pending verified upstream permissions.

## Interactive browser demo

Use the [online demo](https://keremdemirer.github.io/3dbinpackingjs/) or open
`index.html` directly in a modern browser. No build step, server, CDN, or
additional runtime dependency is required. Choose one of five examples (mixed
cartons, exact fit, partial fit, upright rotation, or the three-box regression), or edit the
container and add/remove box types, then select **Calculate packing**.

- Set each box type’s rotation rule with its **Rotation** selector. The “Keep it
  upright” example fits with a width/depth swap; choosing Fixed makes it unpacked.
- Drag to orbit, Shift-drag or right-drag to pan, and scroll to zoom.
- Touch: one finger orbits; two fingers pan and pinch to zoom.
- With the canvas focused, arrow keys orbit, Shift + arrows pan, + / − zoom,
  and 0 resets the view. Buttons also provide zoom and reset controls.
- Click a box to inspect its ID, instance, position, rotated dimensions, and
  volume. The selector reaches occluded boxes too; the selected box has an
  orange outline. Colors follow input item type, with an eight-color palette.
- Summary cards show packed counts and volume utilization. The breakdown lists
  packed quantities by type and groups unpacked instances.
- **Export JSON** downloads the API result. **Save PNG** downloads the current
  3D camera view, including its selected-box outline. Changing inputs disables
  exports until recalculation; the old view is clearly marked as a previous result.

Rendering uses WebGL with depth testing and original-axis coordinates. If WebGL
is unavailable, the summary, box selector, text report, and JSON export still
work. The 3D viewer and PNG export are unavailable in that case. The image is a
view of the geometry, not a physical stability assessment.

`pack1.js` remains the form/report adapter and emits `packing:result` and
`packing:error` browser events for the demo. The included page loads `pack.js`,
`pack1.js`, `demo/viewer.js`, `demo/support.js`, and `demo/app.js` in that order and uses
`demo/style.css`. Custom pages that only need the original text adapter still
load `pack.js` before `pack1.js`. The library entry points and solver are unchanged.

## Limitations

The heuristic does not guarantee optimality. Items rotate according to their
rotation rules. The solver does not model weight, load bearing, or support.
Decimal inputs are accepted, but a general decimal precision policy is not yet
provided; prefer consistent integer units where possible. The solver runs on the
calling thread; large problems may block the browser UI.

## Correctness checks

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

## GitHub Pages

The live demo is served from `master` at the repository root using GitHub Pages.
Merging changes to `master` updates the hosted demo; unmerged PRs are not deployed.
The `.nojekyll` marker keeps this a plain static site. All asset URLs are relative,
so the app works under the `/3dbinpackingjs/` project path.

## Performance and packing quality

From a checkout, run `npm run bench -- --output bench/results/current.json` for
reproducible timing and quality measurements, or `npm run bench:quick` for a
shorter run. `npm run bench:check` validates the full corpus against a recorded
packed-volume baseline; CI runs this check and uploads reports without enforcing
machine-dependent speed thresholds. Benchmarks and the tiny integer-grid oracle
are development tools, excluded from the runtime package.

See the [benchmark guide and initial findings](https://github.com/keremdemirer/3dbinpackingjs/blob/master/bench/README.md)
for methodology, known-fill witnesses, bounded exact references, profiling,
and recorded results. The initial known-fill cases expose 95.0% and 91.875%
utilization where a valid 100% arrangement is known, giving future quality
improvements concrete targets.

The demo and benchmark reports distinguish geometric fit from direct base
contact. A warning appears for boxes with partial or zero contact under their
bases, and inspection shows the percentage. This does not check balance,
strength, load bearing, or the stability of supporting boxes. The solver still
optimizes geometric volume; it does not enforce a physically supported load.
