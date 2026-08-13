# @kotenho/reference-scorer

An **independent** riichi scoring implementation: its own parser, its own fu
model, its own yaku detectors. Private, never published.

## Why this exists

Two jobs, both defined in [`docs/DESIGN.md`](../../docs/DESIGN.md):

1. **The measurement verifier for M1** (§10). The convergence spike cannot be
   measured against `riichi-score`, because `riichi-score` currently detects six
   yaku and cannot see iipeiko — 33.1% of fills for the headline spec. A spike
   verified against it would report ~95% acceptance where the truth is ~63%, and
   would validate the architecture *by being blind*.

2. **The differential counterpart for `riichi-score`** (§11.1). Two
   implementations that disagree tell you where to look.

## The rule that makes it useful

**It must never share code with `riichi-score`.** Not a helper, not a fu table,
not a tile type. The moment they share an implementation they share its bugs,
and this package stops being able to do either of its jobs.

It is equally never imported at runtime by a published package. That would give
the system two scoring authorities, which is the exact drift
[`docs/DESIGN.md`](../../docs/DESIGN.md) §8.3 exists to prevent. Enforced by lint
in `packages/riichi-hand-generator/.eslintrc.json`.

## Layout

```
src/index.mjs                      the scorer: parse → all readings → fu/yaku/points
experiments/convergence-spike.mjs  intended-reading survival rates (DESIGN §10 M1)
experiments/skeleton-space.mjs     skeleton enumeration + fu inversion
experiments/dora-patterns.mjs      dora placement pattern enumeration
```

```bash
node experiments/convergence-spike.mjs
```

## Status

Written during spec work to answer design questions, so it is deliberately
scrappy in places — uniform sampling over group shapes rather than realistic
hands, and **no kan support anywhere**. That gap is not cosmetic: DESIGN §5
assigns the kan-region fu/han-collision experiment to M1, and it cannot run
until kans are modelled here.

Coverage is ~17 yaku: pinfu, tanyao, iipeiko, ryanpeikou, sanshoku doujun,
sanshoku doukou, ittsuu, toitoi, sanankou, suuankou, chanta, junchan,
honroutou, honitsu, chinitsu, yakuhai, menzen tsumo, chiitoitsu.
