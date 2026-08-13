# Repository Structure — one repo, multiple packages

**Status:** decided · 2026-08-13
**Affects:** `riichi-score`, `riichi-hand-generator`, and the test-only reference
scorer introduced by `DESIGN.md` M1.

---

## Decision

`riichi-score` and `riichi-hand-generator` live in **one repository** and ship as
**two independently published npm packages**. A third, private package holds the
reference scorer and shared fixtures and is never published.

`riichi-scoring-coach` stays in its own repository and consumes both as ordinary
npm dependencies.

---

## Why

### Type sharing is not the reason

It is worth stating plainly, because it is the obvious motivation and it is the
wrong one. A normal package dependency already lets the generator import
`HandInput`, `MahjongTile`, `Meld`, `GameState`, and `HandInterpretation` from
`riichi-score` with full type safety. Nothing about types requires a shared
repository.

### Release lockstep is the reason

`DESIGN.md` commits us to a large amount of genuinely cross-package work:

| Design commitment | Spans |
|---|---|
| §10 M5 — each detector: scorer implementation + subsumption entry + generator template + shared fixtures | both, ~15 times |
| §11.5 — fixtures move scorer → generator with each yaku landing | both |
| §4 — capability manifest of detectable yaku, exported by the scorer, read by the generator's enforceability gate | both |
| §9.6, §13.2 — ruleset config object lives in the scorer; the generator reads the same divergence points | both |
| §10 M1, §11.1 — reference scorer used by the generator's spike *and* the scorer's differential tests | both, published by neither |

Across separate repositories, landing a single yaku detector becomes: PR in the
scorer → merge → publish → bump the dependency in the generator → PR in the
generator. Repeated fifteen times, the predictable adaptation is to batch
changes, and the first casualty is §11.5's fixture-sharing discipline — which is
load-bearing for the correctness argument, not incidental to it.

The reference scorer is the sharpest case on its own. Two separate repositories
both needing a test-only asset leaves only bad options: duplicate it and let it
drift, or publish something we explicitly never want consumed at runtime.

### Why not one merged package

Rejected. `riichi-score` is independently useful, already published at v1.0.6,
and has an audience the generator does not. Merging would force scoring
consumers to take a hand generator they do not want, and — more importantly —
would dissolve the package boundary that currently enforces `DESIGN.md` §8.3's
single-scoring-authority rule.

---

## Layout

```
riichi/
├── package.json                  # workspace root, private
├── docs/
│   ├── SPEC.md                   # problem specification
│   ├── DESIGN.md                 # design & implementation plan
│   ├── DESIGN-REVIEW.md          # review of the plan
│   └── REPO-STRUCTURE.md         # this file
├── packages/
│   ├── riichi-score/             # PUBLISHED · the scoring authority
│   └── riichi-hand-generator/    # PUBLISHED · depends on riichi-score
└── internal/
    ├── reference-scorer/         # PRIVATE · independent parser + fu + yaku
    └── fixtures/                 # PRIVATE · shared corpus, curated + generated
```

Docs sit at the root rather than inside a package because they describe the
system: `SPEC.md` §8 and `DESIGN.md` §9–10 specify work in *both* packages.

**Naming note:** the directory is currently `riichi-hand-generator-v2`, which
becomes wrong once it holds the scorer too. Rename the root to `riichi` (or
`riichi-tools`) as part of the migration. Package names on npm do not change.

---

## Package rules

**`riichi-score`** — the single source of truth for what a hand is worth. Public
API unchanged (`calculate`, `createGameState`, plus the exported types and, per
`DESIGN.md` §4, the detectable-yaku manifest). Owns the ruleset configuration
object.

**`riichi-hand-generator`** — depends on `riichi-score`. May import **only from
its public entry point**, never from internal paths.

**`internal/reference-scorer`** — an independent implementation (own parser, own
fu model, own yaku detectors). Two jobs, both test-only:

1. the measurement verifier for `DESIGN.md` M1, where `calculate()` cannot be
   trusted to see accidental yaku;
2. the differential counterpart for `DESIGN.md` §11.1.

**It is never imported at runtime by either published package**, and it is never
published. Its independence is the entire point — the moment it shares code with
`riichi-score`, it stops being able to catch that scorer's bugs.

**`internal/fixtures`** — curated scoring tables and the shared regression corpus
that `DESIGN.md` §11.5 moves between packages on each yaku landing.

---

## The boundary that must survive the merge

`DESIGN.md` §8.3 — *"the generator never reports a score it computed itself"* —
is currently enforced by the hardest boundary available: a package you would have
to install. In a monorepo, nothing physically stops someone importing
`packages/riichi-score/src/parsing/parse-fu.js` directly, and the architectural
claim quietly stops being true.

Enforce it explicitly. In `packages/riichi-hand-generator/.eslintrc`:

```jsonc
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["riichi-score/*", "**/packages/riichi-score/src/**"],
          "message":
            "Import only from riichi-score's public entry point. The generator must never reach into scoring internals (DESIGN.md §8.3)."
        },
        {
          "group": ["**/internal/reference-scorer/**"],
          "message":
            "The reference scorer is test-only. It must never be a runtime dependency (REPO-STRUCTURE.md)."
        }
      ]
    }]
  }
}
```

The second rule matters as much as the first: a reference scorer that leaks into
runtime would give the library two scoring authorities, which is the exact drift
the whole design is built to prevent.

---

## Tooling, versioning, publishing

- **npm workspaces.** `riichi-score` already uses plain npm; workspaces add no
  new tooling. pnpm is a reasonable upgrade later, not a prerequisite.
- **Independent versions.** The two packages version separately. They are
  released together only when a change genuinely spans both.
- **Internal dependency uses an ordinary semver range** (`"riichi-score":
  "^1.0.6"`). npm workspaces link the local package automatically whenever its
  version satisfies the range, so development uses the working copy while
  published consumers get a normal registry dependency. Note npm does **not**
  support the `workspace:*` protocol — that is pnpm/yarn-berry only, and npm
  10 fails with `EUNSUPPORTEDPROTOCOL`. A major version bump in `riichi-score`
  therefore requires widening this range by hand.
- **`riichi-score`'s existing dual cjs/esm build** (`tsconfig.cjs.json` /
  `tsconfig.esm.json`) carries over untouched.
- **CI runs both packages plus the differential suite on every PR** — this is the
  point of the merge, so it should not be optional.

---

## Migration

1. Rename the root directory; `git init` (it is not yet a repository).
2. Move the existing docs into `docs/`.
3. Import `riichi-score` with its history preserved:
   ```
   git subtree add --prefix=packages/riichi-score ../riichi-score main
   ```
   Dry-run against a scratch clone first and confirm history survives.
4. Add the workspace root `package.json` and the `internal/` packages.
5. Archive the standalone `riichi-score` repository, pointing its README here.
6. Publish `riichi-score` once from the new location to confirm the pipeline
   before any code changes land.

Package names do not change, so existing `riichi-score` installs are unaffected.

---

## Consequences accepted

- **A one-afternoon migration cost**, paid now. It rises later: once the
  generator is published too, the same merge relocates two packages instead of
  one.
- **Root tooling** (workspace config, shared lint and CI) is new surface that did
  not exist before.
- **The scoring-authority boundary becomes a convention backed by lint** rather
  than a physical impossibility. This is the real cost of the decision, and the
  lint rules above are not optional garnish — they *are* the boundary.
- **`riichi-score`'s git history moves.** Preserved via subtree, but its
  standalone repository URL is retired.
