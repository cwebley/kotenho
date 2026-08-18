# Changelog

## Unreleased

### Added

- `requiredGroups`, `requiredPair`, and `requiredWinningTile` pin concrete tiles
  into a generated hand. This is the only way to specify a wait *shape* — a
  sanmenchan and a plain ryanmen are both `waitType: "ryanmen"` to the scorer,
  because the wait is classified from the group the winning tile completed, not
  from the tenpai hand's acceptance set. Pins are matched against the skeleton
  table like every other structural constraint, so a contradictory pin returns
  `unsatisfiable` rather than exhausting the budget.
- Required groups may be `called`, and may name a `meldType`. `shouminkan` was
  previously unreachable: every called kan was emitted as a `daiminkan`, so a
  learner never saw the added kan that chankan robs.

### Fixed

- Chi melds are now always called from kamicha, the player to your left. They
  were drawn uniformly from the three other seats, so roughly 70% of generated
  chi melds described a board state that cannot occur. Scoring was unaffected,
  which is why it went unnoticed.
- Triplet, kan, and pair tiles are now chosen from options that can actually
  supply the copies they need, instead of being chosen and then discarded when
  `take` failed. A kan needs all four copies of a tile, so one pinned run
  elsewhere in a suit dropped that suit's share of kan blocks from 33% to 5%;
  the twelve-attempt retry loop hid the waste rather than the bias.
- `avoidDuplicateRuns` is now menzen-scoped. Both duplicate-run yaku (iipeiko,
  ryanpeikou) require a concealed hand, so on an open hand the flag suppressed
  variety for nothing: 9.6% of accepted open hands now carry a duplicate run,
  where none could before. Concealed specs are unchanged, where the flag also
  suppresses the accidental honitsu that packing six tiles into one suit
  invites.

### Changed

- A given seed produces different hands than in 0.0.1. Determinism is a contract
  per version, and the chi-direction and tile-option fixes both shift the random
  stream.

## 0.0.1

Initial published release.

- Generate scorer-verified completed riichi mahjong hands from structural, yaku,
  dora, ruleset, and batch constraints.
- Provide exact-yaku policy, deterministic seeds, batch distinctness, and
  empirical `analyze()` feasibility metrics.
- Support the scorer's event yaku, double-yakuman ruleset variants, and Kansai
  chiitoitsu.
