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

## Packed-prefix cursor comparison

`findbox` used to restart at the beginning of each item's expanded quantity
group on every lookup. The cursor skips that packed prefix once per trial while
retaining the exact first-unpacked choice and type order. Packing flags only
change from unpacked to packed during a trial. Every new trial resets both flags
and cursors; singleton groups use a direct flag check. Other group traversal,
orientation scoring, and layer searches are unchanged.

To compare against the merged pre-optimization source, save its standalone core
outside the checkout and run the comparison (Node.js 22+):

```sh
git show 3de3cf3:pack.js > ../packing-before-cursor.js
npm run bench:compare -- --baseline-source ../packing-before-cursor.js --warmup 20 --samples 15 --output bench/results/cursor-current.json
```

Only load trusted source files: the comparison executes the supplied baseline.
Each mode/case runs in a fresh worker, with 3 rounds and alternating before/after
order. Every result is independently validated outside the timed call. Complete
result hashes must match between modes, including identities, placement order,
rotations, settling diagnostics and search trial counts. Input hashes are checked
for mutation. Reports include both solver hashes, environment, raw per-round
samples, and pooled medians. The worker deadline is 30 seconds per mode/case.
The original corpus and quality baseline are unchanged. Timings are observations,
not a CI performance gate; startup/JIT/GC/thermal effects can still affect results.

The recorded comparison is `bench/results/cursor-node24.*`. The 176 full-result
parity fixtures in `test/fixtures/performance-parity.json` were generated from
merged commit `3de3cf3` before changing the solver, rather than from the optimized
implementation. Their cases include all 25 benchmarks, 60 seeded mixed-rule
requests with repeated IDs and quantities, 1000/3000-instance single-row loads that isolate packed-prefix scanning, and the
upright floating-stack regression, each with settling disabled and enabled.

On the recorded Apple M1 Max / Node 24 run, the isolated 1000/3000-box rows
improved from 4.845/37.913 ms to 1.236/3.601 ms (3.92×/10.53×). Existing grouped
quantity-100/300 cases improved by 1.24×/1.10×; mixed-48 and rules-48 were around
1.01×, too small to treat as a robust general speedup. The largest gains belong
to the isolated scanning workload, not every packing problem. Layer-search costs
remain a separate performance opportunity. These are local measurements, not
portable guarantees.

## Repeated layer-height score cache

Within `findlayer`, several unpacked candidates can offer the same layer height.
An eligible candidate has `heightDifference(candidate, height) === 0`, including
upright/fixed items in their current internal-axis variant. Each candidate's
score excludes itself, but that removes only a zero term. The other terms are
summed in the same instance order. Caching the first score for a height preserves
floating-point addition order and strict-less-than tie handling; no aggregate
subtraction or candidate reordering is used.

The cache belongs to one `findlayer` call. It must not survive placement changes,
new calls, or orientation variants. Eligible-height and footprint checks remain
unchanged. For U unpacked instances and C eligible candidate occurrences, score
work changes from O(C × U) to O(H × U), where H is the number of distinct eligible
heights. Other candidate traversal and fit checks remain. Extra temporary memory
is O(H), released after the selection call; no cross-call cache is introduced.

Reproduce against the merged quantity-cursor version:

```sh
git show 4d00fcc:pack.js > ../packing-before-layer-cache.js
npm run bench:compare -- --baseline-source ../packing-before-layer-cache.js --output bench/results/layer-current.json
```

The recorded Node 24 / Apple M1 Max comparison is `bench/results/layer-cache-node24.*`:
3 rounds with alternating mode order; 20 warmups and 15 measured calls per mode
in fresh workers. Every measured/warmup result is independently validated outside
timing, and complete hashes must match the reference. Both source hashes,
environment and raw per-round samples are included.

Mixed-48 improved from 78.121 to 23.259 ms (3.36×), rules-48 from 45.240 to
17.604 ms (2.57×), and the historical issue-6 workload from 33.194 to 1.614 ms
(20.57×). Single-row workloads have little layer-search work and were slightly
slower in this run: 1.261 → 1.281 ms and 3.668 → 3.820 ms. These local observations
are not universal speed guarantees or CI thresholds.

The unchanged 176 full-result fixtures still match. Focused tests additionally
compare cached selection with uncached ordered scoring while changing packed
flags, thickness, all six internal variants, rotation restrictions, footprint
eligibility, and decimal-valued sums. They add no decimal precision policy.

## Extended-search quality experiment

Run `npm run bench:quality -- --output bench/results/extended-current.json` to
compare standard and extended search. The default is 3 rounds of 2 warmups and
7 measured calls per mode/case, alternating mode order in fresh bounded workers.
Every call is validated outside timing. The report fails on a volume regression,
invalid geometry, changed round fingerprints, or more than twice the standard
trial count. A 30-second worker deadline covers each complete case/mode run;
this benchmark deadline is not a public API timeout.

The standard 25-case corpus and its volume baseline remain unchanged. The quality
suite adds 20 generated 12/24-piece constructive fills with seeds held out from
policy selection. Each witness is independently validated. Initial experiments
with fit-score and continuation-layer rankings identified a width/volume-first
policy for layer-growing boxes; it is used only in the optional second pass.
The standard fitting-box ranking remains unchanged. The second pass updates the
saved winner only for strictly larger volume, so every standard result remains
a fallback. Bound-reaching results skip the extra pass, including empty inputs.

The recorded Node 24 / Apple M1 Max report is `bench/results/extended-node24.*`.
Five of 45 cases improve: the original 12-piece case (912 → 960, 95% → 100%)
and four of 20 held-out cases. The original 24-piece case stays at 882/960
(91.875%). These results do not establish universal quality or optimality.
The measured 12-piece cost was 1.060 → 1.643 ms; mixed-48 was 26.356 → 48.698 ms
with no quality gain. Raw per-round samples, search passes/trials, source and
input hashes, reference coverage, and contact diagnostics are in the JSON report.

Extended search optimizes packed volume, not item count or physical support.
More volume can mean fewer boxes or worse contact, and settling does not certify
stability. The API and demo default to standard search; users opt into the extra
work. CI runs a one-sample comparison and uploads results without a timing gate.
