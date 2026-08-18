# riichi-hand-generator

Generate randomized, valid, completed Riichi Mahjong winning hands that satisfy
scoring and structural constraints. `riichi-score` verifies every accepted hand
and supplies the returned answer key.

Requires Node.js 20 or later.

## Install

```sh
npm install riichi-hand-generator
```

## Generate A Hand

```ts
import { generate } from "riichi-hand-generator";

const result = generate(
  {
    yaku: ["tanyao", "pinfu"],
    han: 3,
    fu: 30,
    closed: true,
    waitType: "ryanmen",
  },
  { seed: 7 },
);

if (result.status === "ok") {
  console.log(result.hand.handInput, result.hand.canonical);
}
```

`yakuPolicy` defaults to `"exact"`: generated hands contain the requested yaku
and no others. Use `"atLeast"` when extra yaku are acceptable. Eligible
concealed `atLeast` hands add ordinary riichi with a default 70% chance; control
that with `sampling.atLeastRiichiChance` in the generation options.

Generation defaults to the `"structural"` sampling profile. It weights each of
the four groups as 80% run and 20% triplet, then weights interior/terminal runs,
pairs, and waits by their concrete structural support. This changes proposal
order only: static feasibility remains exhaustive and `riichi-score` still
verifies every result. Pass `sampling: { profile: "uniform" }` to use the legacy
uniform-skeleton ordering.

```ts
generate(
  { yaku: ["pinfu"], yakuPolicy: "atLeast" },
  {
    seed: 7,
    sampling: {
      profile: "structural",
      atLeastRiichiChance: 0.7,
      groupWeights: { run: 4, triplet: 1 },
    },
  },
);
```

`DEFAULT_SAMPLING_CONFIG` exports the complete defaults for group, run,
triplet, pair, and wait weights. Nested overrides are deeply merged, and the
same configuration is accepted by `generate()` and `analyze()`.

The result distinguishes:

- `ok`: a scorer-verified hand and answer key.
- `unsatisfiable`: the static engine proved the constraints impossible.
- `exhausted`: no hand was found within the search budget.
- `shortfall`: a batch found fewer distinct hands than requested.

## Batches And Analysis

```ts
import { analyze, generate } from "riichi-hand-generator";

const batch = generate(
  { fu: 30, closed: true, winMethod: "ron" },
  { count: 10, seed: 7 },
);

const feasibility = analyze({ yaku: ["pinfu"], han: 4 }, { seed: 7 });
```

Batch generation returns normalized-distinct hands or an explicit shortfall.
`analyze()` reports static feasibility plus seeded empirical yield and diversity
metrics.

## Rulesets

Pass `RulesetOptions` through `GenerateSpec.ruleset` to use the same scoring
variant as `riichi-score`, including red-five availability, local double yakuman,
and Kansai chiitoitsu.

## The one rule

This package never computes a score. It proposes hands; `riichi-score` decides
what they are worth, and its output _is_ the answer key returned to the caller.
One source of truth, no drift.

That is enforced by [`.eslintrc.json`](.eslintrc.json), which blocks imports of
`riichi-score` internals and of the test-only reference scorer. In a monorepo
the package boundary alone cannot enforce it — the lint rules _are_ the
boundary.
