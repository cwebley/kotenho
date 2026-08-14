# Status and Open Items

**Last updated:** 2026-08-14
**Purpose:** a durable register of what is done and what is not. `DESIGN.md` is
the plan; this is the ledger. When the two disagree, this file is newer.

```
242 tests passing   ·   36 curated fixtures, 36/36 cross-checked
38 commits          ·   9/9 generator specs at 100% answer-key agreement
27 of 41 yaku requestable; all 41 enforceable as exclusions
```

**In one sentence:** `riichi-score` is correct and complete, and the generator
produces verified practice hands for structural, yaku and dora constraints.

---

## 1. Milestones

| | Milestone | State |
|---|---|---|
| M0 | Scorer conformance | **done** — except the ruleset config object (§3.5) |
| M1 | Convergence spike | **done** — verdict **go** |
| M2 | Core library, structural | **done** |
| M3 | Static engine v2 + `analyze()` | **done** — static proofs + seeded 100-attempt yield probe |
| M4 | Yaku templates + exact policy | **done** |
| M5 | Scorer yaku extension | **done** — full standard set bar nagashi mangan |
| M6 | Dora planner | **done** — aka deferred (§3.4) |
| M7 | Ambiguity machinery | `requireUnambiguousWait` + diagnostic flags done |
| M8 | Variety and batches | **done** — deterministic distinct batches and explicit shortfall |
| M9 | Ruleset config, docs, perf | not started |

---

## 2. What works today

```ts
generate({ fu: 30, closed: true, winMethod: "ron" })     // structural
generate({ yaku: ["tanyao", "pinfu"] })                  // exactly those yaku
generate({ yaku: ["chanta", "sanshoku"] })
generate({ yaku: ["junchan", "chinitsu"] })
generate({ yaku: ["tanyao"], han: 3 })                   // 1 han yaku + 2 dora
generate({ yaku: ["riichi"], uraDora: 1 })
generate({ handShape: "chiitoitsu" })
generate({ kanCount: 1, fu: 50, doraIndicatorCount: 2 })
generate({ fu: 30, closed: true, winMethod: "ron" }, { count: 10, seed: 7 })
analyze({ yaku: ["pinfu"], han: 4 }, { seed: 7 })
formatTiles(parseTiles("4056p123z"))                  // "4056p123z"
```

Deterministic from a seed. Impossible specs return **proofs with reasons**, not
timeouts. Typical convergence is 1–4 attempts.

Generated tile arrays are returned in display order (manzu, pinzu, souzu,
honors; red fives in the five position before ordinary fives). `riichi-score`
exports `sortTiles`, `formatTiles`, and `parseTiles` for array and compact
Tenhou-style notation conversion.

`roundWind` and `seatWind` each accept a fixed wind or an allowed list. Omitted
rounds sample only East/South; West and North remain explicit extension-round
constraints. Omitted seats sample all four player winds.

### The architectural bet, and why it held

**Anything decidable from shape is decided before tiles exist.** That single
idea paid off four separate times, and each time the measurement was dramatic:

| Applied to | Result |
|---|---|
| fu | exact inversion — a lookup, never a search |
| yaku exclusion | declared-only specs **53 attempts → 1** |
| dora reachability | parity proofs, e.g. chiitoitsu can only carry *even* dora |
| compound yaku placement | domain narrowing **12% → 61%**, plus bias → 95% |

The corollary is the thing to protect: **too-tight shape reasoning loses hands
silently**, because a false "impossible" returns before any verifier can catch
it. That has now bitten seven times (§4).

### Correctness

- `riichi-score`: 6 detectable yaku → the full standard set. Thirteen bugs
  fixed, including **honors being parsed as a run** (`5z6z7z`), which *over*-
  scored a hand by a full limit tier — the only bug that made a correct learner
  answer look wrong, and one no curated fixture would ever have caught.
- **Never add a yaku without the one that subsumes it.** Held four times:
  iipeiko/ryanpeikou, sanankou/suuankou, honitsu/chinitsu, chanta/junchan/
  honroutou. The lesser one alone turns a missing yaku into a confidently wrong
  one.
- Composite yakuman stack at `8000 × N`. Single-hand doubles (kokushi 13-wait,
  suuankou tanki) are deliberately **not** applied — those are local rules, so
  leaving them single is the correct default.
- **Convergence speed says nothing about correctness.** The fastest spec once
  had the worst answer keys, precisely because the scorer was not scrutinising
  it.

---

## 3. Open items

### 3.1 M3 — `analyze()` *(done)*

`analyze()` now separates static impossibility proofs from empirical search
quality. It reports `{ feasible, reason?, estimatedYield, distinctRatio,
sampleSize, rejections }`, using a deterministic 100-attempt probe by default. A zero-yield
probe remains feasible: it is an empirical warning, not a proof.

The probe shares the planner, dora placement, verifier, and attempt telemetry
with `generate()`. `estimatedYield` is accepted candidates divided by sampled
candidate attempts; `distinctRatio` uses normalized hand identity; and
`rejections` exposes every observed rejection cause. Causes are intentionally
not mutually exclusive, matching the existing attempt telemetry.

The M3 spike found healthy diversity across the supported lesson matrix.
`chanta` yields 84.6% (p10 77.0%), `junchan` 89.9% (p10 82.0%),
`chanta + sanshoku` 98.0% (p10 90.0%), and `junchan + chinitsu` 40.9%
(p10 18.0%). Rejection histograms identify no-yaku, assignment, and
dora-placement pressure, validating the histogram as the authoring signal for
low-yield specs.

### 3.2 Sixteen yaku are excludable but not requestable

`honroutou`, `shousangen` and the yakuman family have templates but no placer,
so requesting one is refused with a reason. They are fully policed as
exclusions.

`chanta` and `junchan` are requestable, and **neither has a placer**. Their
skeleton constraints (terminal runs, terminal-or-honor groups) plus their domain
(`requireHonor` for chanta, `honorsAllowed: false` for junchan) describe them
exactly, so the assigner samples the tiles and the verifier rejects a miss.

Chanta briefly did have a placer, and it cost twice: it built its forced honor
triplet by picking each tile independently, so `1z 2z 4z` was a common "triplet"
and `invalid-hand` was 43% of all rejections; and by injecting exactly one honor
it pinned every hand to the minimum. Removing it took the yield from 47.6% to
84.6% and let the honor-group count vary — roughly 51% of hands carry one honor
group, 41% two, 7% three (§3.9).

### 3.3 M8 — batches *(done)*

`generate(spec, { count })` uses a single global batch budget and independent
derived seeds per batch attempt. It returns only normalized-distinct hands:
`ok` when the count is filled, `exhausted` when none is found, and `shortfall`
with the partial batch when the budget runs out. It never silently repeats a
hand. The batch's aggregate attempts and rejection histogram remain available
to the authoring UI.

### 3.4 Aka dora — deferred, and it will fit

`riichi-score` already handles `0m/0p/0s` end to end (`replaceAkadora`,
`countRedFives`, `rehydrateRedFives`). The dora solver runs on **normalised**
tiles, so nothing in it needs to know aka exists.

What is left: allocate red 5s inside the **tile assigner's 4-copy budget** — not
as a post-hoc `5p → 0p` substitution, which could double-spend a 5 the dora plan
already committed. Also a ruleset flag for how many aka exist.

### 3.5 Ruleset configuration object

`DESIGN.md` §9 finding 6, never built. Waiting customers: kuitan, double-wind
pair 2 vs 4 fu, kiriage mangan, aka count, and single-hand double yakuman.

### 3.6 Declared yaku and indicator state *(done)*

Declared yaku are requested only through `yaku` and become `GameState` facts:
riichi/double-riichi reveal a matching ura indicator set; ippatsu, haitei and
houtei set their scorer flags. The scorer, not the generator, emits the yaku.
Haitei/houtei are requestable again and constrained to tsumo/ron respectively.

`doraIndicatorCount` is the total visible count, including the initial
indicator. It is an integer from 1 to 5, and must be at least `1 + kanCount` for
kans in the winner's hand. Extra indicators remain valid to model other players'
kans. Omote indicators are always returned in `handInput.gameState`; ura
indicators are returned at the same count for riichi and double-riichi.

### 3.7 The incompatibility table is hand-written

~80 declared pairs. The soundness fuzz (§4) now covers this surface, but only
for specs it happens to sample.

Known suspect: **`tanyao × ryuuiisou`**. The green tiles are `2s 3s 4s 6s 8s`
*and hatsu*, but hatsu is optional — a ryuuiisou hand without it is entirely
simples, so it is also tanyao. Harmless today only because ryuuiisou is a
yakuman and suppression covers it.

Related: the lists are **asymmetric** — pinfu names chanta, chanta does not name
pinfu. Behaviour is right because the check tests both directions, but reading
one entry tells you nothing. Worth normalising at build time.

### 3.8 The reference scorer needs a written expiry

`internal/reference-scorer` is a **temporary measurement instrument**, not
permanent infrastructure — agreed but never written into its README.

Caveat: the yakuman detectors were written into *both* scorers in one sitting
from the same understanding, which weakens the independence argument for that
batch. Fixture coverage for yakuman is thin — 4 fixtures, 12 yaku.

### 3.9 How many honor groups a chanta hand carries — shape decides the ceiling

Honors can only sit in the pair or in a triplet/kan, never in a run, so a hand's
*capacity* for honor groups is `1 + triplets`. Chanta needs at least one run, so
the ceiling is 4, and it is lower than that most of the time. Measured capacity
across accepted chanta hands: 16% can hold one, 25% two, 34% three, 25% four.

Within that capacity the assigner picks the class — honor or terminal — before
it picks the tile. This matters: a yaochu triplet offers six terminals against
only two or three legal honors (dragons and the round/seat winds are barred as
they would score yakuhai), so drawing uniformly over *tiles* gave honors ~25% of
slots. Choosing the class first makes it a fair coin, which is the only control
over the honor count — there is no target and no quota.

The result is `1 + Binomial(capacity - 1, ½)`, measured at 51% / 41% / 7% for
one / two / three honor groups. Four is essentially unreachable and that is
correct, not a defect: three honor *triplets* need three distinct legal wind
types, which only exists when the round and seat winds coincide, and the fourth
honor location then has to be a dragon pair.

Pushing this toward a flat 25/25/25/25 would need per-hand honor targets and
batch-level quotas, and would spend most of its effort chasing a bucket the
shape space barely contains. Not worth it.

### 3.10 Dora is priced against the hand, not the spec *(fixed)*

`requiredDora` inferred open/closed from the spec alone, so it charged every
skeleton the **closed** han price. `{ yaku: ["chanta"], han: 3 }` therefore asked
for exactly one dora — unreachable for an open hand, where chanta is 1 han and
needs two — and open skeletons are ~94% of the chanta space. Every such attempt
was doomed before a tile was placed, showing up as `han-mismatch`.

It now takes the skeleton's own `menzen`, at both call sites: the `doraReachable`
shape filter and the per-attempt dora placement. A 10-hand `chanta, 3 han` batch
went from **shortfall at 1,000 attempts** to **filled in 11**.

Visible behaviour change: specs that pin `han` now return open hands where the
han arithmetic works out, instead of only closed ones. Add `closed: true` to get
the old behaviour.

### 3.11 Smaller items

- Unsatisfiable reasons blame whichever filter emptied the set, not the
  interaction: `{fu:30, closed, ron, kanchan}` says "no shape scores 30 fu" when
  the real cause is that 30-fu closed ron forces pinfu, which forces ryanmen.
- `"test": "vitest"` in `riichi-score` is watch mode by default; `vitest run` is
  the explicit form.
- `riichi-score@1.0.7` unpublished from the monorepo, so `prepack` is unverified
  against a real publish. The standalone GitHub repo is still live.
- `nagashi mangan` unimplemented (out of scope per `SPEC.md` §9).

---

## 4. The soundness fuzz — run this after touching any static rule

`internal/reference-scorer/experiments/soundness-fuzz.mjs`, ~30s.

An `unsatisfiable` verdict is a **proof**, and nothing downstream can correct
it. The fuzz samples random specs and, whenever the engine claims impossible,
re-runs with inferred checks bypassed and a large budget: *prove it.*

It found two real bugs on its first run:

- **The forced-yaku rule fired with no yaku list.** `yakuPolicy` defaults to
  `"exact"`, so *every* closed-tsumo spec without a yaku list was refused —
  an entire ordinary category, silently blocked.
- **Seven yakuman wrongly marked closed-only.** Four *called* kans is still
  suukantsu. Same for daisangen, shousuushii, daisuushii, tsuuiisou, chinroutou,
  ryuuiisou. Genuinely closed-only: suuankou, kokushi, chuuren, tenhou, chiihou,
  the riichi family, iipeiko, ryanpeikou.

Currently **0 false claims** over 1,500 sampled specs.

**The seven false-impossibility bugs found so far**, all the same failure mode:
chiitoitsu missing from the skeleton model · kokushi missing · suuankou excluded
by sanankou's shape · pinfu + 3 dora (runs stack) · iipeiko + 4 dora (runs plus
pair) · the two above. Expect more whenever a static rule is added.

---

## 5. Experiments

All in `internal/reference-scorer/experiments/`, plain node, no deps.

| File | Answers |
|---|---|
| `soundness-fuzz.mjs` | does the engine ever falsely claim impossible? |
| `m1-spike.mjs` | convergence + answer-key agreement per spec |
| `analyze-spike.mjs` | yield, diversity, and rejection causes across lesson specs |
| `m4-composition-spike.mjs` | do multiple yaku placers compose? |
| `m6-dora-spike.mjs` | which (dora, indicator) bands are reachable? |
| `declared-only.mjs` | what contaminates a "nothing but X" spec? |
| `kan-collision.mjs` | can tied readings disagree on fu below mangan? (no) |
| `convergence-spike.mjs` | does the intended reading survive as canonical? |
| `skeleton-space.mjs` | skeleton enumeration and fu inversion |
| `dora-patterns.mjs` | dora placement pattern enumeration |
