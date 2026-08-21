# Changelog

## 3.0.0

**Breaking.** `Meld` is now a discriminated union, and `GroupType`'s `"set"` is
now `"triplet"`.

- `Meld` splits into `CalledMeld` and `ConcealedKan`. A concealed kan no longer
  carries `from` at all — it previously held the winner's own seat wind as an
  undocumented "not called" sentinel, which every consumer had to know about. A
  called ankan is now unrepresentable rather than merely discouraged, for the
  same reason `WinningTile` discriminates on `isTsumo`.
- `CalledMeld` gains a required `calledIndex`: which tile of the meld was the
  one called. Purely presentational — no scoring rule reads it — but it is
  validated rather than merely carried, so a meld that cannot be drawn is an
  error instead of a silent mis-render. Meld tile order is preserved verbatim
  through `calculate()`, and both facts are now locked by tests.
- `StandardGroup` carries `calledIndex` through to the parsed group, so a review
  screen can render from the interpretation rather than the raw input.
- `calculate()` rejects a chi called from any seat but the caller's kamicha. Chi
  may only be called from the player on your left; such a hand scores
  identically, which is exactly why nothing caught it before. This found one
  impossible board state in the curated M0 fixtures.
- Add `createMeld()` and export the `KAMICHA` table.
- Rename `GroupType`'s `"set"` to `"triplet"`, answering the question the type
  had been carrying in a comment.

## 2.0.0

- Complete the supported standard yaku set, including event yaku and yakuman.
- Add configurable ruleset switches for double yakuman and Kansai chiitoitsu.
- Add resolved ruleset propagation to scoring inputs and generator consumers.
- Make CJS packaging explicit alongside the ESM entry point.
- Document named-yakuman limit semantics and public ruleset support.

## 1.0.6

- Last standalone scorer release before the monorepo release line.
