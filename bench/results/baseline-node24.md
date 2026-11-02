# Performance and quality baseline

Runtime: v24.22.1; darwin/arm64; Apple M1 Max.
Solver SHA-256: `3eafe75897e7e0368fec75ae2c71052bf9e440e4f5d2028a2bbadcda6a9f43b1`. Corpus SHA-256: `a6b101ac5d6cd233c368ad5e6faf0ceade8fd6457e29fa99d2aab4c82664cd97`.
7 measured calls after 2 warmups per case; pack() only is timed. Each case runs in a fresh worker.

| Case | Items / types | Packed | Utilization | Volume-bound coverage | Reference coverage | Base contact full / partial / none | Median ms | Sample p95 ms | Trials |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| empty | 0 / 0 | 0 | 0.0% | 100.0% | — | 0 / 0 / 0 | 0.026 | 0.028 | 0 |
| no-fit | 1 / 1 | 0 | 0.0% | 0.0% | — | 0 / 0 / 0 | 0.040 | 0.069 | 0 |
| exact-cubes | 64 / 1 | 64 | 100.0% | 100.0% | 100.0% | 64 / 0 / 0 | 0.940 | 1.182 | 1 |
| cut-fill-12 | 12 / 12 | 11 | 95.0% | 95.0% | 95.0% | 11 / 0 / 0 | 1.179 | 1.692 | 34 |
| cut-fill-24 | 24 / 24 | 22 | 91.9% | 91.9% | 91.9% | 21 / 1 / 0 | 3.784 | 5.411 | 52 |
| reported-overhang | 19 / 3 | 19 | 78.1% | 100.0% | — | 17 / 2 / 0 | 0.274 | 0.500 | 1 |
| issue-6 | 130 / 1 | 110 | 70.8% | 84.6% | — | 110 / 0 / 0 | 33.338 | 37.939 | 10 |
| paper-example | 9 / 3 | 6 | 100.0% | 100.0% | — | 6 / 0 / 0 | 0.142 | 0.455 | 4 |
| upright-swap | 1 / 1 | 1 | 100.0% | 100.0% | — | 1 / 0 / 0 | 0.063 | 0.082 | 1 |
| fixed-no-fit | 1 / 1 | 0 | 0.0% | 0.0% | — | 0 / 0 / 0 | 0.049 | 0.064 | 0 |
| quantity-100 | 100 / 1 | 100 | 10.0% | 100.0% | — | 100 / 0 / 0 | 0.460 | 0.707 | 1 |
| types-100 | 100 / 100 | 100 | 10.0% | 100.0% | — | 100 / 0 / 0 | 0.844 | 1.191 | 1 |
| quantity-300 | 300 / 1 | 300 | 30.0% | 100.0% | — | 300 / 0 / 0 | 4.839 | 7.504 | 1 |
| types-300 | 300 / 300 | 300 | 30.0% | 100.0% | — | 300 / 0 / 0 | 6.766 | 11.593 | 1 |
| mixed-24 | 46 / 24 | 46 | 52.3% | 100.0% | — | 35 / 6 / 5 | 0.608 | 1.070 | 1 |
| mixed-48 | 104 / 48 | 60 | 99.5% | 99.5% | — | 59 / 1 / 0 | 77.569 | 81.693 | 60 |
| mixed-96 | 204 / 96 | 54 | 100.0% | 100.0% | — | 54 / 0 / 0 | 65.523 | 70.949 | 12 |
| rules-48 | 90 / 48 | 46 | 97.0% | 97.0% | — | 41 / 4 / 1 | 47.723 | 48.943 | 66 |
| tiny-cubes-no-room | 2 / 1 | 1 | 44.4% | 50.0% | 100.0% | 1 / 0 / 0 | 0.076 | 0.397 | 6 |
| tiny-5 | 5 / 5 | 3 | 100.0% | 100.0% | 100.0% | 3 / 0 / 0 | 0.095 | 0.462 | 1 |
| tiny-17 | 5 / 5 | 2 | 100.0% | 100.0% | 100.0% | 2 / 0 / 0 | 0.089 | 0.433 | 1 |
| tiny-29 | 5 / 5 | 5 | 88.9% | 100.0% | 100.0% | 5 / 0 / 0 | 0.094 | 0.447 | 1 |
| tiny-41 | 5 / 5 | 1 | 100.0% | 100.0% | 100.0% | 1 / 0 / 0 | 0.101 | 0.466 | 2 |
| tiny-53 | 5 / 5 | 2 | 83.3% | 83.3% | 100.0% | 2 / 0 / 0 | 0.203 | 0.622 | 16 |
| tiny-67 | 5 / 5 | 2 | 100.0% | 100.0% | 100.0% | 2 / 0 / 0 | 0.090 | 0.419 | 1 |

Volume-bound coverage uses min(container volume, requested volume), a relaxation that need not be attainable. Reference coverage is shown only for a validated full-container witness or a completed tiny integer-grid oracle. See JSON for reference kind, oracle states, raw samples, and environment details. Timings are observations on this machine, not portable budgets.
