[← Project overview](../README.md) · [API reference](API.md)

# Interactive browser demo

Use the [online demo](https://keremdemirer.github.io/3dbinpackingjs/) or open
`index.html` directly in a modern browser. No build step, server, CDN, or
additional runtime dependency is required. Choose one of six examples (mixed
cartons, exact fit, partial fit, upright rotation, the known full-container fit, or the three-box regression), or edit the
container and add/remove box types, then select **Calculate packing**.

- On the hosted demo, packing and base-contact analysis run in a background
  worker. **Cancel** stops the active calculation. Editing inputs or loading an
  example cancels the previous request, and outdated results are ignored.
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
- The packed-box selector shows up to 100 instances per page. Use Previous/Next
  or enter a page number to reach every instance. Clicking a box in the 3D view
  automatically opens its selector page.
- Click a box to inspect its ID, instance, position, rotated dimensions, and
  volume and direct base contact. The selector reaches occluded boxes too; the selected box has an
  orange outline. Colors follow input item type, with an eight-color palette.
- Summary cards show packed counts and volume utilization. The breakdown lists
  packed quantities by type and groups unpacked instances.
- **View text report** generates the complete report when opened. A collapsed
  report does no formatting work when results arrive; reopening an unchanged
  report reuses its text.
- **Export JSON** downloads the API result. **Save PNG** downloads the current
  3D camera view, including its selected-box outline. Changing inputs disables
  exports until recalculation; the old view is clearly marked as a previous result.

Box, container and grid geometry stays in GPU buffers between camera changes.
Selecting a box updates only its outline; new results and graphics-context
restoration rebuild the geometry. Clearing a result clears the cached buffers.

Rendering uses WebGL with depth testing and original-axis coordinates. If WebGL
is unavailable, the summary, box selector, text report, and JSON export still
work. The 3D viewer and PNG export are unavailable in that case. The image is a
view of the geometry, not a physical stability assessment.

`pack1.js` exposes `PackingForm` helpers for reading inputs and displaying reports.
Its legacy `main()` function remains synchronous. It is the form/report adapter and emits `packing:result` and
`packing:error` browser events for the demo. The included page loads `pack.js`,
`pack1.js`, `demo/viewer.js`, `demo/support.js`, `demo/runner.js`, and `demo/app.js`
in that order and uses
`demo/style.css`. Custom pages that only need the original text adapter still
load `pack.js` before `pack1.js`. 

## Limitations

The heuristic does not guarantee optimality. Items rotate according to their
rotation rules. The solver does not model weight, load bearing, or support.
Decimal inputs are accepted, but a general decimal precision policy is not yet
provided; prefer consistent integer units where possible.

Opening `index.html` directly uses an explicitly labelled synchronous fallback:
Cancel is unavailable once computation begins. Browsers without worker support
also use this fallback. A background-worker runtime failure shows an error; the
next explicit calculation uses local mode, without silently repeating expensive
work. Serve the checkout over HTTP to use workers locally, for example with
`python3 -m http.server 8765`, then open `http://localhost:8765/`.

The worker loads `pack.js` and `demo/support.js` using relative same-origin paths,
including on GitHub project Pages. Rendering and grouping the result still happen on the page. The selector
creates at most 100 instance options at a time, while full text reports and JSON
exports are generated only on request and include every instance. Very large
results can still pause rendering or these explicitly requested operations. The standalone `pack()` API remains synchronous.

