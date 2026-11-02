# 3dbinpackingjs
javascript conversion of https://github.com/wknechtel/3d-bin-pack/

## Run the example

Open `index.html` in a browser, enter the container dimensions and box types,
then select **Calculate**. All dimensions must use the same unit and be positive
finite numbers; quantities must be positive safe integers. Coordinates describe
one corner of each box in the original container X/Y/Z axes, with the packed
X/Y/Z dimensions describing its rotation. Boxes may rotate freely.

The report uses the saved best placements and lists any unpacked boxes. This is
a single-container volume-maximizing heuristic, not a guarantee of optimality.
It does not model weight, load bearing, support, or upright-only constraints.
Decimal inputs are accepted, but a general decimal precision policy is not yet
provided; prefer consistent integer units where possible.

## Correctness checks

With Node.js 22 or 24 installed, run:

```sh
npm test
```

No dependencies need to be installed. Tests execute the browser script with
simulated form inputs and independently check placement bounds, non-overlap,
item dimensions, counts, and volume. They include historical issue examples,
empty/no-fit input, repeated calculations, and seeded randomized cases.
