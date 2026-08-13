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

## Docs

- [`docs/SPEC.md`](docs/SPEC.md) — problem specification and mahjong domain reference
- [`docs/DESIGN.md`](docs/DESIGN.md) — generator design and implementation plan
- [`docs/DESIGN-REVIEW.md`](docs/DESIGN-REVIEW.md) — review of that plan, with measurements
- [`docs/REPO-STRUCTURE.md`](docs/REPO-STRUCTURE.md) — why this is one repository
- [`docs/PLANNING-PROMPT.md`](docs/PLANNING-PROMPT.md) — the brief that produced the design

## The one rule

The generator never computes a score itself. It proposes hands; `riichi-score`
decides what they are worth, and its output *is* the answer key. This is
enforced by lint (`packages/riichi-hand-generator/.eslintrc.json`), not by
convention alone — see [`docs/REPO-STRUCTURE.md`](docs/REPO-STRUCTURE.md).

## Development

```bash
npm install        # installs all workspaces
npm run build
npm test
```
