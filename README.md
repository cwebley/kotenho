# kotenho

Riichi mahjong scoring, and the inverse problem: generating valid winning hands
that satisfy scoring constraints.

Named for **高点法** (kōtenhō), the rule that a winning hand is always scored by
whichever of its valid interpretations is worth the most. That rule is why this
repository is shaped the way it is — a hand's score is not a property of its
tiles but the output of an interpretation contest, so the scorer is the only
component that can decide what a generated hand is actually worth.

## Packages

| Package | Published | Purpose |
|---|---|---|
| [`packages/riichi-score`](packages/riichi-score) | yes | Scoring: given a complete hand, return every valid reading with its yaku, fu, han, and payments. **The single source of truth for what a hand is worth.** |
| [`packages/riichi-hand-generator`](packages/riichi-hand-generator) | yes | Generation: given scoring constraints, return a random valid hand satisfying them. |
| [`internal/reference-scorer`](internal/reference-scorer) | **no** | An independent scoring implementation used only for differential testing and measurement. Never a runtime dependency. |
| [`internal/fixtures`](internal/fixtures) | **no** | Shared curated and generated test corpus. |

## The one rule

The generator never computes a score itself. It proposes hands; `riichi-score`
decides what they are worth, and its output *is* the answer key. One source of
truth, no drift.

Because a package boundary inside a monorepo cannot enforce that on its own, it
is enforced by lint — see
[`packages/riichi-hand-generator/.eslintrc.json`](packages/riichi-hand-generator/.eslintrc.json),
which blocks imports of `riichi-score` internals and of the test-only reference
scorer.

## Development

```bash
npm install        # installs all workspaces
npm run build
npm test
```
