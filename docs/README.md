# Documentation

[← Project overview](../README.md)

| Start here | Purpose |
| --- | --- |
| [API reference](API.md) | Runtime inputs and results, module formats, rotation rules, settling, and TypeScript. |
| [Demo guide](DEMO.md) | Using the browser workbench, inspecting boxes, and exporting results. |
| [Testing](TESTING.md) | What the automated checks cover and their limits. |
| [Benchmarks](https://github.com/keremdemirer/3dbinpackingjs/blob/master/bench/README.md) | Performance measurements, packing-quality references, and recorded findings. |
| [Contributing](https://github.com/keremdemirer/3dbinpackingjs/blob/master/CONTRIBUTING.md) | Local setup, change guidelines, and pull requests. |
| [Search and sharing](SEO.md) | GitHub Pages metadata, social assets, and indexing maintenance. |
| [License status](../LICENSE-STATUS.md) | Upstream provenance and unresolved permissions. |

## Repository layout

```text
.github/       CI workflow, issue forms, and pull request template
bench/         Corpus, validators, comparison tools, and recorded reports
demo/          Browser interface, 3D viewer, and demo assets
docs/          Usage, validation, and maintenance guides
test/          Runtime, geometry, regression, and package tests
type-tests/    TypeScript consumer fixtures
pack.js        Standalone solver and CommonJS/browser entry point
pack.mjs       ES module entry point
pack.d.*       TypeScript declarations
pack1.js       Browser form and text-report adapter
index.html     GitHub Pages workbench
```

Runtime entry points remain at the root to preserve existing imports and direct
browser usage. The package archive includes the demo and documentation; development
fixtures and benchmark tools are excluded.

## GitHub Pages

The live demo is served from `master` at the repository root. Merging a PR updates
the hosted demo after Pages deployment; unmerged PRs are not deployed. `.nojekyll`
keeps this a plain static site. Local asset URLs are relative so the site works
under `/3dbinpackingjs/`. No build step, server, or CDN is required to use the demo.
