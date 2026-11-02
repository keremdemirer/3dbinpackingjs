# 3dbinpackingjs

JavaScript conversion of [wknechtel/3d-bin-pack](https://github.com/wknechtel/3d-bin-pack/).
A single-container, volume-maximizing packing heuristic with a standalone
JavaScript API and a browser example.

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
  `id`, and optional `quantity` (defaults to `1`). An empty array is allowed.
- Dimensions must be positive finite numbers in one consistent unit. API values
  are not coerced from strings. Computed volumes must stay positive and finite.
- Quantities must be positive safe integers. Quantities are expanded into
  individual instances, so memory and runtime grow with the total item count.
- IDs may be strings or finite numbers. An omitted ID defaults to the item's
  zero-based array index. Duplicate IDs are allowed: `itemIndex` and
  `instanceIndex` distinguish every instance.

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
For packed records, `dimensions` describes the rotated width/height/depth in
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
Public npm publication remains disabled pending the license decision.

## Interactive browser demo

Open `index.html` directly in a modern browser. No build step, server, CDN, or
additional runtime dependency is required. Choose one of four examples (mixed
cartons, exact fit, partial fit, or the three-box regression), or edit the
container and add/remove box types, then select **Calculate packing**.

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
`pack1.js`, `demo/viewer.js`, and `demo/app.js` in that order and uses
`demo/style.css`. Custom pages that only need the original text adapter still
load `pack.js` before `pack1.js`. The library entry points and solver are unchanged.

## Limitations

The heuristic does not guarantee optimality. Boxes may rotate freely, and the
solver does not model weight, load bearing, support, or upright-only constraints.
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
