# Performance and packing-quality benchmarks

This is a development suite, not part of the runtime package. It measures the
existing solver and adds a demo warning for observed base-contact gaps; it does not add decimal handling or change the heuristic.
All corpus dimensions are integers, and the cases are generated locally rather
than copied from an externally licensed dataset.

## Run

From a checkout with Node.js 22 or later:

```sh
npm ci
npm run bench -- --output bench/results/current.json
npm run bench:quick
npm run bench:check
```

The default run covers 25 cases, with two warmups and seven measured calls per
case. JSON preserves raw samples in measurement order; the neighboring Markdown
file is a readable table. `bench:quick` selects controls, known fills, rotations,
and tiny oracle cases with no warmups and one measured call. `bench:check` runs
the full corpus once and fails on invalid placements, timeouts, incomplete worker
results, nondeterministic repeated results, changed corpus/baseline inputs, or
packed-volume regression against `baseline.json`. There is **no timing gate**.

Useful options:

```sh
npm run bench -- --case mixed-48 --samples 25 --warmup 10 --output bench/results/mixed.json
npm run bench -- --timeout 60000 --output bench/results/current.json
npm run bench -- --baseline bench/results/baseline-node24.json --output bench/results/comparison.json
```

`--baseline` accepts the compact quality baseline or a full report. A full report
also produces observational median-time ratios. Timing changes do not determine
pass/fail. Use `--check-quality` with `--baseline` to enforce volume preservation.
To intentionally update the quality baseline, run the full suite with
`--write-baseline bench/baseline.json` and review changed cases and results;
do not overwrite a baseline just to hide a regression. When accepting a quality
improvement, update the baseline upward so later changes cannot silently lose it.

## What is measured

Each case runs serially in a new worker. A deadline (30 seconds by default)
includes startup, reference computation, warmups, measured calls, and validation;
exceeding it terminates the worker and marks the case failed. Inside the worker,
only `pack(input)` is timed. Input generation, worker startup, oracle work,
geometry validation, hashing, and report formatting are outside those timings.
Allocation, GC pauses during the call, and JIT effects are included. Two warmups
do not establish a universal steady state: increase warmups/samples for a focused
study. With seven samples, nearest-rank sample p95 is the maximum sample, not a
reliable estimate of a production latency distribution.

Every warmup and measured result is independently checked for instance identity,
quantities, allowed rotations, container bounds, pairwise non-overlap, dimensions,
packed volume, and totals. Direct base-contact diagnostics are computed after
timing; they are observational and do not turn the volume heuristic into a
physical loading solver. Inputs must remain unchanged, and repeated results
must match. The report records Node/V8/platform/CPU, the source commit, solver
SHA-256, corpus SHA-256, parameters, trial counts, quality metrics, and raw timings.
CPU affinity, thermal state, background activity, and GC are not controlled.
Compare timing distributions on the same environment and repeat measurements;
do not interpret this machine's milliseconds as a portable performance budget.

## Quality references

- **Utilization** = packed volume / container volume. Low utilization may simply
  mean little input volume was requested.
- **Volume-bound coverage** divides by `min(container volume, requested volume)`.
  This upper bound ignores geometry and rotation restrictions and need not be
  attainable. A gap here alone does not prove heuristic error.
- **Proven full-container references** include a constructive placement witness.
  The independent validator checks that it places all requested instances without
  overlap, within bounds, and with volume equal to the container. This certifies
  a 100%-utilization optimum for that input.
- **Tiny integer-grid references** use an independent exhaustive occupancy-mask
  search, including the option to leave each item unpacked. It enumerates all
  allowed rotations and integer-coordinate placements, limited to 27 container
  cells, eight item instances, and 100,000 unique search states. A state-budget
  exit records an incomplete result and no optimum/coverage. Completed results
  establish an integer-grid optimum only; they are not an exact solver for
  unrestricted large or non-integer problems.

The corpus includes empty/no-fit controls, exact cubes, two constructive split
loads, historical issue inputs, rotation constraints, grouped versus separately
listed identical boxes, increasing quantities/type counts, seeded mixed loads,
and tiny oracle cases. Seeds and witnesses live in `corpus.js`. Cases represent
specific workloads, not a statistical sample of real shipping orders.

## Direct base contact

The report also counts full, partial, and zero direct base contact. A floor-level
box has full contact; otherwise contact is the union of intersections between
its base and box top faces at the same height. Several boxes can jointly support
a base without double counting. This is a geometric diagnostic only: it does
not assess weight, center of mass, material strength, load bearing, or whether
supporting boxes themselves connect to the floor. Full contact is not a stability
certificate. It is not part of the packed-volume regression gate.

`reported-overhang` reproduces the reported demo input (12×10×8 container;
5×4×4 ×4, 2×7×5 ×5, and 2×2×2 ×10). All 19 boxes fit with 78.125% utilization
and valid non-overlapping coordinates, but two top cartons have only 25% and
10% of their bases in direct contact. The demo now displays this distinction
and exposes base-contact percentage in box inspection. No support-constrained
packing algorithm is introduced by this change.

## Initial findings

See [the recorded table](results/baseline-node24.md) and
[raw report](results/baseline-node24.json). These observations use Node 24.22.1
on an Apple M1 Max; they describe this run and corpus.

1. **There are proven quality gaps.** `cut-fill-12` packs volume 912/960 (95.0%);
   `cut-fill-24` packs 882/960 (91.875%). Both have validated 100%-fill witnesses.
   The second leaves 78 volume units unpacked despite a feasible full packing.
   The seven tiny integer-grid references are all matched, including the case
   where two cubes cannot coexist despite their combined volume fitting.
2. **Quantity scanning is a concrete speed target.** Grouped identical cubes rise
   substantially between 100 and 300 instances in the recorded run. Separately
   listed types show the same nonlinear trend; see the raw samples and table.
   In `findbox`, every placement restarts its group's search at the first
   instance, rescanning already-packed entries. A per-group next-unpacked cursor
   is a focused candidate for the next optimization PR, with state reset on each
   search trial and all identity/geometry/quality checks retained.
3. **More items do not imply a longer search.** `mixed-48` takes 60
   initial-layer trials; `mixed-96` takes only 12 trials. The latter
   reaches a full container and exits early. Report trial count alongside item
   count rather than treating these timings as a single complexity curve.
4. **Reordering alone did not close these quality gaps.** Original order, ascending
   volume, descending volume, and eight deterministic shuffles (11 orders each)
   all retain the same packed volume on both split-load inputs. This is limited
   evidence on two instances, but it makes simple input shuffling a weak next
   step for those failures. Investigate layer/box scoring, bounded lookahead, or
   a competing placement strategy against the known witnesses.

The next performance change should target packed-item rescanning and remeasure
these cases. A separate quality experiment should target the two known-fill
failures, with an explicit search-time budget. This suite establishes those
checks; it intentionally does not mix an algorithm change into the baseline PR.

## Reproduce the supporting experiments

```sh
node bench/order-sensitivity.js > bench/results/order-sensitivity.json
node --cpu-prof --cpu-prof-dir=bench/results --cpu-prof-name=mixed-48.cpuprofile bench/profile.js --case mixed-48 --calls 100 --warmup 10
node bench/profile.js --summary bench/results/mixed-48.cpuprofile > bench/results/profile-summary.json
```

[Order results](results/order-sensitivity.json) and the
[profile summary](results/profile-summary.json) are checked in. The profile
includes startup, 10 warmups, 100 calls, and a final validation; its sampled self
attributions concentrate in search/layer/placement routines (`execiterations`,
`pack`, `findlayer`, `analyzebox`, `packlayer`, and `findbox`). V8 inlining can
attribute callee work to callers, so these percentages are not precise source-line
costs or portable optimization priorities. Raw CPU profiles are ignored by Git.

CI runs the full one-sample quality check on Node 22/24 and uploads the JSON and
Markdown reports as artifacts. CI timings are observations on shared runners;
they never cause a failure merely for being slower.

## Optional settling comparison

Run `npm run bench:settling -- --output bench/results/settling-node24.json` to
compare the unchanged default mode with `settle: true` across the 25-case corpus
and the reported upright floating-stack example. Every timed result is validated
outside timing. The run fails on changed packed count/volume, invalid geometry,
or any remaining box with no direct base contact. Unit tests also verify downward
clearance, unchanged identities/rotations/X/Z, determinism and disabled parity.
The original quality baseline stays unchanged. Recorded timings include search
and the optional O(n²) settling post-pass; they do not isolate its cost. Compare
raw samples and environments, not a single ratio. Zero absent contact is not a
stability guarantee. Reports are in `bench/results/settling-node24.*`.
