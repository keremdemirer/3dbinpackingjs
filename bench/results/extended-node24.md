# Standard versus extended search

Runtime: v24.22.1; darwin/arm64; Apple M1 Max.
3 alternating-order rounds, 2 warmups and 7 samples per mode/case in fresh workers. Only pack() is timed; every result is independently validated afterward.

45 cases: 5 improved (4 held-out known fills), no packed-volume regressions. A maximum of two search passes is not a wall-clock deadline or an optimality guarantee.

| Case | Volume standard → extended | Utilization standard → extended | Median ms standard → extended | Passes |
| --- | ---: | ---: | ---: | ---: |
| empty | 0 → 0 | 0.0% → 0.0% | 0.025 → 0.026 | 1 |
| no-fit | 0 → 0 | 0.0% → 0.0% | 0.038 → 0.041 | 2 |
| exact-cubes | 512 → 512 | 100.0% → 100.0% | 0.296 → 0.278 | 1 |
| cut-fill-12 | 912 → 960 | 95.0% → 100.0% | 1.060 → 1.643 | 2 |
| cut-fill-24 | 882 → 882 | 91.9% → 91.9% | 3.144 → 5.757 | 2 |
| reported-overhang | 750 → 750 | 78.1% → 78.1% | 0.160 → 0.147 | 1 |
| issue-6 | 2475000 → 2475000 | 70.8% → 70.8% | 2.324 → 3.337 | 2 |
| paper-example | 838656 → 838656 | 100.0% → 100.0% | 0.144 → 0.126 | 1 |
| upright-swap | 24 → 24 | 100.0% → 100.0% | 0.060 → 0.062 | 1 |
| fixed-no-fit | 0 → 0 | 0.0% → 0.0% | 0.045 → 0.055 | 2 |
| quantity-100 | 800 → 800 | 10.0% → 10.0% | 0.312 → 0.320 | 1 |
| types-100 | 800 → 800 | 10.0% → 10.0% | 0.637 → 0.639 | 1 |
| quantity-300 | 2400 → 2400 | 30.0% → 30.0% | 0.990 → 0.946 | 1 |
| types-300 | 2400 → 2400 | 30.0% → 30.0% | 2.984 → 2.980 | 1 |
| mixed-24 | 4016 → 4016 | 52.3% → 52.3% | 0.555 → 0.604 | 1 |
| mixed-48 | 7641 → 7641 | 99.5% → 99.5% | 26.356 → 48.698 | 2 |
| mixed-96 | 7680 → 7680 | 100.0% → 100.0% | 13.244 → 10.888 | 1 |
| rules-48 | 7451 → 7451 | 97.0% → 97.0% | 20.386 → 36.083 | 2 |
| tiny-cubes-no-room | 8 → 8 | 44.4% → 44.4% | 0.105 → 0.124 | 2 |
| tiny-5 | 18 → 18 | 100.0% → 100.0% | 0.110 → 0.101 | 1 |
| tiny-17 | 18 → 18 | 100.0% → 100.0% | 0.105 → 0.102 | 1 |
| tiny-29 | 16 → 16 | 88.9% → 88.9% | 0.113 → 0.121 | 1 |
| tiny-41 | 18 → 18 | 100.0% → 100.0% | 0.141 → 0.140 | 1 |
| tiny-53 | 15 → 15 | 83.3% → 83.3% | 0.294 → 0.353 | 2 |
| tiny-67 | 18 → 18 | 100.0% → 100.0% | 0.105 → 0.115 | 1 |
| holdout-12-101 | 918 → 918 | 95.6% → 95.6% | 1.596 → 2.455 | 2 |
| holdout-24-101 | 900 → 904 | 93.8% → 94.2% | 4.934 → 6.305 | 2 |
| holdout-12-203 | 792 → 792 | 82.5% → 82.5% | 1.409 → 2.196 | 2 |
| holdout-24-203 | 894 → 894 | 93.1% → 93.1% | 4.111 → 7.364 | 2 |
| holdout-12-307 | 866 → 866 | 90.2% → 90.2% | 1.811 → 2.475 | 2 |
| holdout-24-307 | 860 → 860 | 89.6% → 89.6% | 3.722 → 8.109 | 2 |
| holdout-12-409 | 920 → 920 | 95.8% → 95.8% | 1.483 → 3.363 | 2 |
| holdout-24-409 | 851 → 851 | 88.6% → 88.6% | 4.497 → 8.333 | 2 |
| holdout-12-503 | 835 → 835 | 87.0% → 87.0% | 1.383 → 2.519 | 2 |
| holdout-24-503 | 872 → 872 | 90.8% → 90.8% | 4.775 → 8.761 | 2 |
| holdout-12-607 | 880 → 880 | 91.7% → 91.7% | 1.579 → 2.648 | 2 |
| holdout-24-607 | 864 → 912 | 90.0% → 95.0% | 4.264 → 6.581 | 2 |
| holdout-12-709 | 870 → 893 | 90.6% → 93.0% | 1.792 → 3.701 | 2 |
| holdout-24-709 | 848 → 860 | 88.3% → 89.6% | 3.474 → 8.205 | 2 |
| holdout-12-811 | 920 → 920 | 95.8% → 95.8% | 1.072 → 2.145 | 2 |
| holdout-24-811 | 930 → 930 | 96.9% → 96.9% | 3.647 → 6.670 | 2 |
| holdout-12-907 | 960 → 960 | 100.0% → 100.0% | 0.599 → 0.607 | 1 |
| holdout-24-907 | 872 → 872 | 90.8% → 90.8% | 5.108 → 8.747 | 2 |
| holdout-12-1009 | 796 → 796 | 82.9% → 82.9% | 1.641 → 3.351 | 2 |
| holdout-24-1009 | 858 → 858 | 89.4% → 89.4% | 3.927 → 9.212 | 2 |

The 12-piece known-fill gap is closed; the original 24-piece gap remains at 91.875%. Equal-volume results keep the standard winner. Objective is packed volume, not count or stability. Timing observations are machine-dependent; see JSON for raw samples, source/input hashes, references, trial counts and base-contact diagnostics.
