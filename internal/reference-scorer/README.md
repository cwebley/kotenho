# @kotenho/reference-scorer

An **independent** riichi scoring implementation: its own parser, its own fu
model, its own yaku detectors. Private, never published.

## Why this exists

Two jobs:

1. **Measurement.** The generator's convergence rates cannot be measured against
   `riichi-score`, because `riichi-score` currently detects six yaku and cannot
   see iipeiko — 33.1% of fills for the flagship spec. Measured against it, a
   spike reports ~95% acceptance where the truth is ~63%, validating the
   architecture *by being blind*.

2. **Differential testing for `riichi-score`.** Two implementations that
   disagree tell you where to look.

## The rule that makes it useful

**It must never share code with `riichi-score`.** Not a helper, not a fu table,
not a tile type. The moment they share an implementation they share its bugs,
and this package stops being able to do either of its jobs.

It is equally never imported at runtime by a published package. That would give
the system two scoring authorities, which is the exact drift the design exists
to prevent. Enforced by lint in
`packages/riichi-hand-generator/.eslintrc.json`.

## Layout

```
src/index.mjs                      the scorer: parse → all readings → fu/yaku/points
experiments/convergence-spike.mjs  intended-reading survival rates
experiments/skeleton-space.mjs     skeleton enumeration + fu inversion
experiments/dora-patterns.mjs      dora placement pattern enumeration
```

```bash
node experiments/convergence-spike.mjs
```

## Status

Written during spec work to answer design questions, so it is deliberately
scrappy in places — uniform sampling over group shapes rather than realistic
hands, and **no kan support anywhere**. That gap is not cosmetic: kans are
where scoring edge cases concentrate, and several open questions cannot be
settled until kans are modelled here.

Coverage is ~17 yaku: pinfu, tanyao, iipeiko, ryanpeikou, sanshoku doujun,
sanshoku doukou, ittsuu, toitoi, sanankou, suuankou, chanta, junchan,
honroutou, honitsu, chinitsu, yakuhai, menzen tsumo, chiitoitsu.
