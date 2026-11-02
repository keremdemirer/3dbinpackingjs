[← Project overview](../README.md) · [API reference](API.md)

# Interactive browser demo

Use the [online demo](https://keremdemirer.github.io/3dbinpackingjs/) or open
`index.html` directly in a modern browser. No build step, server, CDN, or
additional runtime dependency is required. Choose one of six examples (mixed
cartons, exact fit, partial fit, upright rotation, the known full-container fit, or the three-box regression), or edit the
container and add/remove box types, then select **Calculate packing**.

- **Search effort** defaults to Standard. Extended runs one extra search pass
  when useful and can take longer. Choose **Known full-container fit** to compare
  the standard 95% result with the extended 100% arrangement. Changing search
  effort marks the result stale until you calculate again.
- Set each box type’s rotation rule with its **Rotation** selector. The “Keep it
  upright” example fits with a width/depth swap; choosing Fixed makes it unpacked.
- Drag to orbit, Shift-drag or right-drag to pan, and scroll to zoom.
- Touch: one finger orbits; two fingers pan and pinch to zoom.
- With the canvas focused, arrow keys orbit, Shift + arrows pan, + / − zoom,
  and 0 resets the view. Buttons also provide zoom and reset controls.
- Click a box to inspect its ID, instance, position, rotated dimensions, and
  volume and direct base contact. The selector reaches occluded boxes too; the selected box has an
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
load `pack.js` before `pack1.js`. 

## Limitations

The heuristic does not guarantee optimality. Items rotate according to their
rotation rules. The solver does not model weight, load bearing, or support.
Decimal inputs are accepted, but a general decimal precision policy is not yet
provided; prefer consistent integer units where possible. The solver runs on the
calling thread; large problems may block the browser UI.

