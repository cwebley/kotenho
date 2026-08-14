# Status and Open Items

**Last updated:** 2026-08-14
**Purpose:** a durable register of what is done and what is not. `DESIGN.md` is
the plan; this is the ledger. When the two disagree, this file is newer.

```
212 tests passing   ·   36 curated fixtures, 36/36 cross-checked
38 commits          ·   9/9 generator specs at 100% answer-key agreement
25 of 41 yaku requestable; all 41 enforceable as exclusions
```

**In one sentence:** `riichi-score` is correct and complete, and the generator
produces verified practice hands for structural, yaku and dora constraints.

---

## 1. Milestones

| | Milestone | State |
|---|---|---|
| M0 | Scorer conformance | **done** — except the ruleset config object (§3.4) |
| M1 | Convergence spike | **done** — verdict **go** |
| M2 | Core library, structural | **done** |
| M3 | Static engine v2 + `analyze()` | **done** — static proofs + seeded 100-attempt yield probe |
| M4 | Yaku templates + exact policy | **done** |
| M5 | Scorer yaku extension | **done** — full standard set bar nagashi mangan |
| M6 | Dora planner | **done** — aka deferred (§3.3) |
| M7 | Ambiguity machinery | `requireUnambiguousWait` + diagnostic flags done |
| M8 | Variety and batches | not started |
| M9 | Ruleset config, docs, perf | not started |

---

## 2. What works today

```ts
generate({ fu: 30, closed: true, winMethod: "ron" })     // structural
generate({ yaku: ["tanyao", "pinfu"] })                  // exactly those yaku
generate({ yaku: ["tanyao"], han: 3 })                   // 1 han yaku + 2 dora
generate({ yaku: ["riichi"], riichi: true, uraDora: 1 })
generate({ handShape: "chiitoitsu" })
generate({ kanCount: 1, fu: 50 })
analyze({ yaku: ["pinfu"], han: 4 }, { seed: 7 })
```

Deterministic from a seed. Impossible specs return **proofs with reasons**, not
timeouts. Typical convergence is 1–4 attempts.

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
it. That has now bitten five times (§4).

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
sampleSize }`, using a deterministic 100-attempt probe by default. A zero-yield
probe remains feasible: it is an empirical warning, not a proof.

The probe shares the planner, dora placement, verifier, and attempt telemetry
with `generate()`. `estimatedYield` is accepted candidates divided by sampled
candidate attempts; `distinctRatio` uses normalized hand identity.

### 3.2 Sixteen yaku are excludable but not requestable

`chanta`, `junchan`, `honroutou`, `shousangen` and the yakuman family have
templates but no placer, so requesting one is refused with a reason. They are
fully policed as exclusions.

**chanta and junchan are the ones a lesson is most likely to want.** Both need a
placer that puts a terminal or honor in every set.

### 3.3 Aka dora — deferred, and it will fit

`riichi-score` already handles `0m/0p/0s` end to end (`replaceAkadora`,
`countRedFives`, `rehydrateRedFives`). The dora solver runs on **normalised**
tiles, so nothing in it needs to know aka exists.

What is left: allocate red 5s inside the **tile assigner's 4-copy budget** — not
as a post-hoc `5p → 0p` substitution, which could double-spend a 5 the dora plan
already committed. Also a ruleset flag for how many aka exist.

### 3.4 Ruleset configuration object

`DESIGN.md` §9 finding 6, never built. Waiting customers: kuitan, double-wind
pair 2 vs 4 fu, kiriage mangan, aka count, and single-hand double yakuman.

### 3.5 haitei and houtei are advertised but unreachable

Marked `requestable: true` and correctly constrained to tsumo/ron skeletons, but
the generator cannot set the game-state flag, so they never appear and the spec
**exhausts**. Either give them spec flags as riichi has, or mark them
`requestable: false`. Advertising something that always fails is the worst of
the three options.

### 3.6 The incompatibility table is hand-written

~80 declared pairs. The soundness fuzz (§4) now covers this surface, but only
for specs it happens to sample.

Known suspect: **`tanyao × ryuuiisou`**. The green tiles are `2s 3s 4s 6s 8s`
*and hatsu*, but hatsu is optional — a ryuuiisou hand without it is entirely
simples, so it is also tanyao. Harmless today only because ryuuiisou is a
yakuman and suppression covers it.

Related: the lists are **asymmetric** — pinfu names chanta, chanta does not name
pinfu. Behaviour is right because the check tests both directions, but reading
one entry tells you nothing. Worth normalising at build time.

### 3.7 The reference scorer needs a written expiry

`internal/reference-scorer` is a **temporary measurement instrument**, not
permanent infrastructure — agreed but never written into its README.

Caveat: the yakuman detectors were written into *both* scorers in one sitting
from the same understanding, which weakens the independence argument for that
batch. Fixture coverage for yakuman is thin — 4 fixtures, 12 yaku.

### 3.8 Smaller items

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

**The five false-impossibility bugs found so far**, all the same failure mode:
chiitoitsu missing from the skeleton model · kokushi missing · suuankou excluded
by sanankou's shape · pinfu + 3 dora (runs stack) · the two above. Expect more
whenever a static rule is added.

---

## 5. Experiments

All in `internal/reference-scorer/experiments/`, plain node, no deps.

| File | Answers |
|---|---|
| `soundness-fuzz.mjs` | does the engine ever falsely claim impossible? |
| `m1-spike.mjs` | convergence + answer-key agreement per spec |
| `m4-composition-spike.mjs` | do multiple yaku placers compose? |
| `m6-dora-spike.mjs` | which (dora, indicator) bands are reachable? |
| `declared-only.mjs` | what contaminates a "nothing but X" spec? |
| `kan-collision.mjs` | can tied readings disagree on fu below mangan? (no) |
| `convergence-spike.mjs` | does the intended reading survive as canonical? |
| `skeleton-space.mjs` | skeleton enumeration and fu inversion |
| `dora-patterns.mjs` | dora placement pattern enumeration |
