# Contributing

Thanks for helping improve 3dbinpackingjs. Small, focused changes with reproducible
examples are the easiest to review.

## Set up

Use Node.js 22 or later. CI checks Node.js 22 and 24.

```sh
git clone https://github.com/keremdemirer/3dbinpackingjs.git
cd 3dbinpackingjs
npm ci
npm run check
```

The only development dependency is the pinned TypeScript compiler. The runtime
has no dependencies. Open `index.html` in a modern browser to try the demo.

## Choose a change

- For a bug, include the complete `pack({ container, items, ... })` request,
  expected behavior, actual result, and your Node.js/browser version.
- For a packing-quality issue, include a valid better arrangement when possible.
  A volume upper bound alone does not prove that an arrangement is achievable.
- For a performance change, compare against a specific merged commit using the
  [benchmark tools](bench/README.md). Keep correctness validation outside timing
  and record the environment, warmups, samples, and complete-result comparison.
- For a larger API or algorithm change, describe the proposal in an issue first
  so its scope and tradeoffs can be discussed.

## Before opening a pull request

Run `npm run check`. For solver changes, also run:

```sh
npm run bench:check
npm run bench:settling -- --samples 1 --warmup 0
```

Add a focused regression for changed behavior. Performance-only changes should
preserve the existing placement fingerprints, identities, rotation rules,
settling behavior, and packed-volume baseline. Do not regenerate reference
fixtures just to make a failure pass; explain any intentional behavior change.

For demo changes, check calculation, box inspection, exports, and a narrow
viewport in a real browser. Unit tests use a mocked WebGL context and do not
replace a visual check. Documentation-only changes need link/asset checks; run
the package check when changing documentation shipped in the archive.

Follow the surrounding code style. Avoid unrelated formatting churn in the
legacy solver. Keep runtime entry points and browser script order compatible,
and update the API declarations and guides when behavior changes.

Use a PR title that describes the resulting behavior. Explain the problem, the
change, how it was verified, and any limitations. See the [testing guide](docs/TESTING.md)
for validation scope and the [documentation index](docs/README.md) for file layout.

## Provenance and publication

Preserve upstream attribution and read [license status](LICENSE-STATUS.md).
Upstream permissions remain unresolved; no project-wide license grant is asserted.
Do not add a license or enable npm publication as part of an unrelated change.
