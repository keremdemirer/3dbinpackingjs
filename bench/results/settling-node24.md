# Optional settling comparison

Runtime: v24.22.1; darwin/arm64; Apple M1 Max.
7 measured calls after 2 warmups. Each mode/case uses a fresh worker. Both modes validate every result. Timings include search; settled timings include the post-pass.

All packed volumes and counts are unchanged. Timings are observational; sequential mode measurements and JIT/GC noise can dominate small differences.

| Case | Packed volume | No contact before → after | Partial contact before → after | Median ms before → after |
| --- | ---: | ---: | ---: | ---: |
| empty | 0 | 0 → 0 | 0 → 0 | 0.029 → 0.026 |
| no-fit | 0 | 0 → 0 | 0 → 0 | 0.039 → 0.039 |
| exact-cubes | 512 | 0 → 0 | 0 → 0 | 0.932 → 0.976 |
| cut-fill-12 | 912 | 0 → 0 | 0 → 0 | 1.148 → 1.394 |
| cut-fill-24 | 882 | 0 → 0 | 1 → 1 | 4.191 → 4.490 |
| reported-overhang | 750 | 0 → 0 | 2 → 2 | 0.286 → 0.315 |
| issue-6 | 2475000 | 0 → 0 | 0 → 0 | 37.257 → 90.010 |
| paper-example | 838656 | 0 → 0 | 0 → 0 | 0.185 → 0.147 |
| upright-swap | 24 | 0 → 0 | 0 → 0 | 0.065 → 0.069 |
| fixed-no-fit | 0 | 0 → 0 | 0 → 0 | 0.048 → 0.060 |
| quantity-100 | 800 | 0 → 0 | 0 → 0 | 0.466 → 0.748 |
| types-100 | 800 | 0 → 0 | 0 → 0 | 1.288 → 1.330 |
| quantity-300 | 2400 | 0 → 0 | 0 → 0 | 10.437 → 4.953 |
| types-300 | 2400 | 0 → 0 | 0 → 0 | 15.130 → 7.623 |
| mixed-24 | 4016 | 5 → 0 | 6 → 8 | 1.146 → 1.066 |
| mixed-48 | 7641 | 0 → 0 | 1 → 1 | 153.442 → 86.236 |
| mixed-96 | 7680 | 0 → 0 | 0 → 0 | 138.432 → 71.012 |
| rules-48 | 7451 | 1 → 0 | 4 → 4 | 73.848 → 48.174 |
| tiny-cubes-no-room | 8 | 0 → 0 | 0 → 0 | 0.105 → 0.109 |
| tiny-5 | 18 | 0 → 0 | 0 → 0 | 0.125 → 0.123 |
| tiny-17 | 18 | 0 → 0 | 0 → 0 | 0.115 → 0.091 |
| tiny-29 | 16 | 0 → 0 | 0 → 0 | 0.101 → 0.096 |
| tiny-41 | 18 | 0 → 0 | 0 → 0 | 0.112 → 0.105 |
| tiny-53 | 15 | 0 → 0 | 0 → 0 | 0.217 → 0.310 |
| tiny-67 | 18 | 0 → 0 | 0 → 0 | 0.098 → 0.119 |
| reported-upright-gap | 750 | 1 → 0 | 0 → 1 | 1.165 → 1.095 |

Zero absent contact does not certify stability or full support. See JSON for input hashes, raw samples and reference information.
