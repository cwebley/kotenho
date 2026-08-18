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
pairs, and waits by their concrete structural support. Unconstrained win methods
use a 2:1 ron-to-tsumo prior. This changes proposal order only: static
feasibility remains exhaustive and `riichi-score` still verifies every result.
Pass `sampling: { profile: "uniform" }` to use the legacy uniform-skeleton
ordering.

An explicitly open request with no `yaku` (`closed: false` or a positive
`openMeldCount`) first selects a feasible base yaku by weight, then allows
incidental extra yaku. Configure the distribution with
`sampling.openHandBaseYakuWeights`. The selected target is returned as
`hand.baseYakuCategory`; `analyze()` reports accepted targets in
`baseYakuCounts`. The `double-wind` category requires compatible round and seat
winds and uses one value-wind triplet for both yaku.

```ts
generate(
  { yaku: ["pinfu"], yakuPolicy: "atLeast" },
  {
    seed: 7,
    sampling: {
      profile: "structural",
      atLeastRiichiChance: 0.7,
      winMethodWeights: { ron: 2, tsumo: 1 },
      groupWeights: { run: 4, triplet: 1 },
      openHandBaseYakuWeights: { tanyao: 15, "double-wind": 14 },
    },
  },
);
```

`DEFAULT_SAMPLING_CONFIG` exports the complete defaults for open-hand base yaku,
group, run, triplet, pair, and wait weights. Nested overrides are deeply merged,
and the same configuration is accepted by `generate()` and `analyze()`.

The result distinguishes:

- `ok`: a scorer-verified hand and answer key.
- `unsatisfiable`: the static engine proved the constraints impossible.
- `exhausted`: no hand was found within the search budget.
- `shortfall`: a batch found fewer distinct hands than requested.

## Pinning Tiles

Some drills are about a *shape* rather than a score. A sanmenchan — 23456p
waiting on 1p/4p/7p — is not describable with `waitType`, because `riichi-score`
classifies a wait from the group the winning tile completed: a sanmenchan and a
plain ryanmen both report `"ryanmen"`. The shape lives in the thirteen tiles
before the win, so it is pinned directly.

```ts
generate(
  {
    requiredGroups: ["234p", "567p"],
    requiredWinningTile: "7p",
    yaku: ["riichi"],
    yakuPolicy: "atLeast",
  },
  { seed: 7 },
);
// 1m2m3m 7m7m 2p3p4p5p6p 2s3s4s + 7p — 23456p in hand, the 1/4/7 wait with it
```

Everything the spec does not pin is still sampled, so the two runs above fix six
tiles and leave the rest of the hand free. Extra tiles landing in the same suit
are a feature, not contamination: they add waits on top of the pinned shape
rather than replacing it. Pin `requiredPair` when a specific stacked shape is
wanted.

- `requiredGroups` — runs, triplets and kans as concrete tiles. `"234p"` and
  `"2p3p4p"` are the same group.
- `requiredPair` — the pair, as concrete tiles: `"77p"`.
- `requiredWinningTile` — must complete one of the *concealed* required groups
  or the required pair. Anywhere else and the wait would have to be searched for
  rather than looked up.

A pinned winning tile fixes the wait as a side effect, so `waitType` is only
needed to choose between readings: a 7p that completes both `567p` and a `77p`
pair is ryanmen or tanki, and either is a legitimate drill.

Groups can be called, and kans can name their meld type — `shouminkan` is the
one another player can rob:

```ts
generate({
  requiredGroups: [
    { tiles: "234p", called: true },
    { tiles: "5555s", meldType: "shouminkan" },
    "678m",
  ],
  requiredWinningTile: "7p",
  yaku: ["tanyao"],
  yakuPolicy: "atLeast",
  doraIndicatorCount: 2,
});
```

Pins are matched against the skeleton table like every other structural
constraint, so a contradiction is proven rather than searched for:
`requiredGroups: ["5555p"], requiredWinningTile: "5p"` returns `unsatisfiable` —
a kan is never completed by the winning tile.

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
