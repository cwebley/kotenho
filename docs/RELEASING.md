# Releasing Packages

`riichi-score` and `riichi-hand-generator` publish independently from this
workspace. Do not publish until the release candidate passes every check below.

## Release Order

1. Publish `riichi-score`.
2. Update and verify the generator's `riichi-score` dependency range.
3. Publish `riichi-hand-generator`.

The current planned release versions are `riichi-score@2.0.0` and
`riichi-hand-generator@0.0.1`.

## Local Gate

```sh
npm test
npm run typecheck
npm run build
node internal/reference-scorer/experiments/soundness-fuzz.mjs
git diff --check
```

## Package Gate

Build and inspect each package before publishing:

```sh
npm pack --dry-run -w riichi-score
npm pack --dry-run -w riichi-hand-generator
```

The package contents must include built JavaScript, declarations, README,
CHANGELOG, and LICENSE, but exclude source-only and internal test assets.

Before a public release, install each generated tarball in a clean temporary
consumer project and verify:

- ESM imports for both packages.
- CommonJS `require()` for `riichi-score`.
- TypeScript declarations.
- `riichi-hand-generator` resolving against the published `riichi-score` range.

## Deferred Automation

CI and deterministic benchmark baselines are intentionally deferred. Until they
exist, run this checklist manually and record the release verification in the
release notes.
