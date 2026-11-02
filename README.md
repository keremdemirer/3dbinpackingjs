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
repository remains private for npm publishing; this change does not publish a
package or settle upstream licensing.

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

## Browser example

Open `index.html`, enter container dimensions and box types, then select
**Calculate**. Labels are preserved as item IDs in the report. `pack1.js` reads
and formats the form; `pack.js` performs the packing. Custom pages that used to
load only `pack1.js` must now load `pack.js` first.

## Limitations

The heuristic does not guarantee optimality. Boxes may rotate freely, and the
solver does not model weight, load bearing, support, or upright-only constraints.
Decimal inputs are accepted, but a general decimal precision policy is not yet
provided; prefer consistent integer units where possible. The solver runs on the
calling thread; large problems may block the browser UI.

## Correctness checks

With Node.js 22 or 24 installed, run:

```sh
npm test
```

No dependencies need to be installed. Tests independently check bounds,
non-overlap, dimensions, instance identities, counts, and volume. They retain the
historical issue examples and focused skyline regressions, test both the API
and browser form adapter, and include 250 seeded mixed-box cases. Recorded
fingerprints from merged correctness release `0236195` verify that extraction
preserves the same placements and search decisions for that corpus. API checks
cover imports, invalid input, immutable inputs, and isolated/nested calls.
