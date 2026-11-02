# Solver performance comparison

Runtime: v24.22.1; darwin/arm64; Apple M1 Max.
3 rounds; 20 warmups + 15 samples per mode/case in a fresh worker. Mode order alternates each round. Only pack() is timed; every result is validated outside timing and complete result hashes must match.

Medians pool measured samples across rounds. Speedup >1 indicates faster in this run; timings are machine-dependent observations, not CI budgets. Inspect individual round samples before generalizing.

| Case | Before median ms | After median ms | Speedup |
| --- | ---: | ---: | ---: |
| exact-cubes | 0.381 | 0.140 | 2.73× |
| cut-fill-24 | 3.359 | 2.824 | 1.19× |
| issue-6 | 33.194 | 1.614 | 20.57× |
| quantity-100 | 0.169 | 0.164 | 1.03× |
| quantity-300 | 3.891 | 0.461 | 8.44× |
| types-300 | 6.231 | 2.783 | 2.24× |
| mixed-48 | 78.121 | 23.259 | 3.36× |
| rules-48 | 45.240 | 17.604 | 2.57× |
| quantity-1000 | 1.261 | 1.281 | 0.98× |
| quantity-3000 | 3.668 | 3.820 | 0.96× |
