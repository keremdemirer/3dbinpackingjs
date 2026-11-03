[← Project overview](../README.md) · [Demo guide](DEMO.md)

# JavaScript API

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
package preparation. See [license status and provenance](../LICENSE-STATUS.md) for
the outstanding license decision and [the changelog](../CHANGELOG.md) for changes.

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
`pack()` is synchronous. The included hosted demo runs it in a Web Worker and
provides cancellation without changing this library API. Input objects are not modified, and returned objects
belong to that call. Invalid input throws `TypeError`; the browser form displays
the error in its report field.

### Inputs

- `container`: an object with numeric `width`, `height`, and `depth`.
- `items`: an array of objects with the same three dimension fields, optional
  `id`, optional `quantity` (defaults to `1`), and optional `rotation` (defaults
  to `"free"`). An empty array is allowed.
- `search`: `"standard"` (default) or `"extended"`. See search effort below.
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

### Search effort

Set `search: 'extended'` to try an alternative layer-growing box policy when the
standard search leaves unused achievable volume:

```js
const result = pack({
  container: { width: 12, height: 10, depth: 8 },
  items, // Your box types, dimensions, quantities, and rotation rules
  search: 'extended'
});
console.log(result.diagnostics.search); // { mode: 'extended', passes: 1 | 2 }
```

The standard pass always runs first. If it reaches the smaller of requested
volume and container volume, no second pass is needed. Otherwise the second pass
prioritizes width fit, then box volume, when choosing a box taller than the
current layer. Only a strictly larger packed volume replaces the saved standard
winner; equal-volume ties retain the original arrangement. Settling, if enabled,
runs once after the final winner is chosen.

This is a deterministic two-policy search, not lookahead or an exact solver.
It runs at most two full search passes, and `diagnostics.iterations` counts trials
across both. A pass count is not a wall-clock deadline: difficult inputs may take
longer, and the synchronous call can still block the browser. The objective is
packed volume, so a larger-volume result need not contain more boxes or have
better support. Extended search does not guarantee improvement or optimality.

The recorded 12-piece known-fill case improves from 95% to 100%; the 24-piece
case remains at 91.875%. Four of 20 held-out full-fill cases also improve. See
[quality measurements](https://github.com/keremdemirer/3dbinpackingjs/blob/master/bench/results/extended-node24.md)
for timing costs and remaining gaps. Standard is the default and retains the
previous output shape; `diagnostics.search` appears only in extended mode.

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
| `diagnostics.iterations` | Initial-layer trials across all executed search passes. |
| `diagnostics.search` | Extended mode only: selected mode and number of passes executed. |

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

