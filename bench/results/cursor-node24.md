# Packed-prefix cursor performance comparison

Runtime: v24.22.1; darwin/arm64; Apple M1 Max.
3 rounds; 20 warmups + 15 samples per mode/case in a fresh worker. Mode order alternates each round. Only pack() is timed; every result is validated outside timing and complete result hashes must match.

Medians pool measured samples across rounds. Speedup >1 indicates faster in this run; timings are machine-dependent observations, not CI budgets. Inspect individual round samples before generalizing.

| Case | Before median ms | After median ms | Speedup |
| --- | ---: | ---: | ---: |
| exact-cubes | 0.392 | 0.377 | 1.04× |
| cut-fill-24 | 3.470 | 3.384 | 1.03× |
| issue-6 | 33.516 | 33.186 | 1.01× |
| quantity-100 | 0.202 | 0.162 | 1.24× |
| quantity-300 | 4.277 | 3.886 | 1.10× |
| types-300 | 6.719 | 6.190 | 1.09× |
| mixed-48 | 78.287 | 77.713 | 1.01× |
| rules-48 | 45.303 | 44.735 | 1.01× |
| quantity-1000 | 4.845 | 1.236 | 3.92× |
| quantity-3000 | 37.913 | 3.601 | 10.53× |
