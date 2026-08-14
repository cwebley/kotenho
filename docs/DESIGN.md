# riichi-hand-generator — Design & Implementation Plan

**Status:** v3 · M0, M1 and M5 delivered; architecture validated by measurement
rather than argument. Changes listed in Appendix B.

> **Read `STATUS.md` first.** It is the live ledger of what is done and what is
> open. This document is the plan and the reasoning behind it; where the two
> disagree, `STATUS.md` is newer. Sections below carry **[DELIVERED]** markers
> where reality has overtaken the plan.

**Origin:** responds to `PLANNING-PROMPT.md` against `SPEC.md`
**Companion facts:** originally based on inspection of `riichi-score` and the
abandoned v1 generator as of 2026-08-12, both since absorbed into this repo.

---

## 0. The design in one paragraph

Correctness cannot be built into a hand; per SPEC §3.1 it is a property of the
*canonical reading*, which only `riichi-score` can compute. So the architecture is
**propose → verify**: a constructive planner builds candidate hands that honor the
structural constraints exactly and *aim at* the content constraints, and every
candidate is passed to `calculate()`; a small comparator checks the canonical
interpretation (and its score-tied peers) against the spec, and rejects otherwise.
The planner is allowed to be heuristic, incomplete, even wrong — its bugs cost
throughput, never correctness. The only correctness-critical surfaces in the entire
system are (a) `riichi-score` itself and (b) the ~200-line comparator. Everything
else is an optimization to make the rejection loop converge fast, plus a static
feasibility engine that proves the impossible specs impossible before any search
begins.

---

## 1. Why the last attempt died, and the inversion this design makes

v1 (`../riichi-hand-generator`) tried to make the *construction* correct: a
"scaffold" of group placeholders, with hand-written propagation rules for each
yaku, each fu line item, each dora configuration, and ad-hoc accidental-yaku
avoidance ("set `hasYaochu` on the sanshoku runs 50% of the time to dodge
tanyao"). Three properties doomed it:

1. **It had to be complete.** Every constraint interaction — dora × sanshoku,
   ittsuu × chanta, pool exhaustion × kan — needed its own explicit rule. The
   commented-out dora-configuration code in `generator.ts` is the exact spot
   where the interaction graph outgrew the author.
2. **It had to be right.** Any missed interaction produced a *wrong hand
   presented as correct*, the worst failure mode the product has.
3. **It never called the scorer.** Correctness was asserted by construction,
   which SPEC §3.1 says is impossible in principle: the governing reading is
   chosen by kōtenhō after the fact, and the builder cannot know it.

The inversion: **construction aims; the scorer decides.** In the new design the
planner's per-yaku knowledge still exists (you cannot rejection-sample your way
to "exactly 3 han 30 fu"), but it is demoted from *guarantor* to *proposal
bias*. Any interaction we fail to model produces a rejected candidate and a
retry, not a wrong answer key. That single change relocates all product risk
onto two small, testable components.

### Alternatives considered for the core architecture

- **Pure rejection sampling** (generate uniform random winning hands, filter).
  Rejected: converges only for loose specs. A uniform winning hand has, e.g.,
  pinfu ~10–15% of the time, exactly 30 fu maybe ~30%, "tanyao+pinfu and
  nothing else, 3 han" well under 1% — and specs compound multiplicatively.
  "Exactly yakuman" or "3 kans, 90 fu" would effectively never terminate.
- **Correct-by-construction** (v1's approach, done harder — full constraint
  propagation). Rejected for the reasons above; additionally, kōtenhō makes it
  *semantically* unreachable: you can construct a reading, but you cannot
  construct the guarantee that no better reading exists without implementing a
  scorer — which is exactly the drift the spec forbids (§8.3).
- **Encode as CSP/SAT over 136 tiles and solve.** Attractive on paper —
  feasibility and generation from one model, "provably impossible" for free.
  Rejected because the objective ("canonical post-kōtenhō score equals X, yaku
  set exactly Y") quantifies over *all decompositions* of the hand; encoding
  that faithfully means encoding the scorer into constraints, i.e. a second
  scoring implementation with guaranteed drift. A solver that models only the
  intended reading has the same soundness hole as v1, plus a much worse
  variety story (solvers find one solution, and randomizing them well is its
  own project). We keep the *idea* — a small enumerable model for feasibility —
  but at skeleton granularity (§6), not tile granularity.
- **Curated hand templates per lesson.** Explicitly forbidden by the prompt,
  and rightly: it caps variety and silently rots as rules/lessons change.

---

## 2. Architecture

```
spec ──► Normalizer ──► Static Feasibility Engine ──► UNSATISFIABLE(reason) │ proceed
                                                                            ▼
                        ┌────────────── Search Controller (seeded RNG, budgets) ─┐
                        │   Skeleton Planner      → groups/openness/wait shape   │
                        │   Dora Planner          → indicator & placement plan   │
                        │   Tile Assigner         → concrete tiles, 4-copy budget│
                        │   Winning-Tile Selector → which tile & which copy wins │
                        │   Verifier              → calculate() + Comparator     │
                        │        pass ▼               fail ─► classify, retry ───┘
                        └─────────────┼───────────────────────────────────────
                                      ▼
                              Result Assembler (hand, canonical breakdown,
                              all interpretations, ambiguity flags, seed, stats)
```

**Ownership:**

| Component | Owns | Explicitly does *not* own |
|---|---|---|
| Normalizer | Spec defaults, canonical yaku names, distinguishing *pinned* fields from *free* fields | Any validity judgment |
| Static Feasibility Engine | Provable contradictions, human-readable reasons; shared verbatim by `generate` and `analyze` | Completeness (it may say "don't know") |
| Skeleton Planner | Group-type multiset, open/closed per group, kan types, wait shape & location, pair class, win method — and the **fu arithmetic of the intended reading** | Tile identities; final say on fu |
| Dora Planner | Which hand tiles are dora, indicator tile choice, ura/aka, 4-copy accounting including indicators | — |
| Tile Assigner | Concrete tiles satisfying skeleton + yaku templates + anti-yaku biases, under the 4-copy budget (aka dora allocated here as physical tiles) | Correctness of the result |
| Winning-Tile Selector | Which concrete tile — and which *copy* — completes the hand; cheap pre-checks for tied-reading risk before a verifier call is spent (§5) | The ambiguity verdict itself (that is the verifier's T-set) |
| Verifier/Comparator | Calling `calculate()`, tied-top-set semantics, spec matching, ambiguity flags | Scoring rules (all delegated) |
| Search Controller | Budgets, retry layer selection, no-thrash policy, variety, determinism | — |
| Result Assembler | Output shape per SPEC §5.3, telemetry | — |

A deliberate consequence: **the planner's fu/han arithmetic never leaves the
library.** It is aiming information. The reported answer key is always
`calculate()` output, preserving §8.3's "one source of truth" even though the
planner internally predicts fu to hit targets.

The Normalizer's pinned-vs-free distinction matters more than it looks:
`createGameState()` in the scorer defaults `seatWind` to `"south"`, etc. The
generator must never let scorer defaults leak in — every situational field is
either pinned by the caller or *chosen randomly by the generator* and passed
explicitly. Unspecified means "generator's freedom," not "default value."

---

## 3. How each class of constraint is satisfied

The constraints split into four mechanically different classes.

### 3.1 Structural (openMeldCount, kans, closed, winMethod, handShape, wait shape)

**Satisfied by construction, exactly.** These are directly controllable knobs of
the skeleton: the planner decides "4 groups = 2 closed runs + 1 pon + 1 ankan,
winning tile completes run #1 as a kanchan, ron." Nothing downstream can
un-satisfy openness, meld counts, kan types, or win method — the scorer scores
whatever structure it is given. Two caveats verified rather than constructed:

- **Wait type** is *aimed* structurally but only *holds* if the canonical
  reading agrees (§5 below). Kōtenhō can reinterpret the wait.
- **Hand shape**: a hand built as chiitoitsu can admit a standard
  (ryanpeikou-style) decomposition that outscores it; the verifier catches it,
  and the chiitoi planner biases against three-consecutive-pairs-in-suit
  patterns to keep the rejection rate down.

### 3.2 Arithmetic (fu, and the han bookkeeping)

**Fu is semi-structural and is targeted by solving a tiny integer problem at the
skeleton layer.** Intended-reading fu decomposes as:

```
20 (base) + 10·[closed ron] + 2·[tsumo, non-pinfu]
   + Σ group fu       (run: 0; triplet: 2/4/8; kan: 8/16/32)
   + pair fu          (0 / 2 / 4)
   + wait fu          (0 / 2)
```

Per-group contributions, written out (8 triplet/kan combinations yielding 5
distinct values — 6 counting the run's zero; the v1 draft miscounted this):

```
                      open    closed
  triplet, simple       2        4
  triplet, yaochu       4        8
  kan,     simple       8       16
  kan,     yaochu      16       32
  run                   0        0
```

A *ron-completed* triplet takes the open column per SPEC §4.6. For a target fu
bucket the planner enumerates contribution vectors that land in it (with
rounding). This space is
tiny — well under 10^5 skeletons total across all group-multiset × openness ×
class combinations, and heavily pruned — so exact-fu targeting is a lookup, not
a search. Special cases (chiitoi 25, pinfu 30/20, kuipinfu floor) are entries in
the same table, keyed by ruleset config.

The canonical fu can still differ from intended fu when a higher-scoring reading
exists; that is a verifier rejection, historically the reason exact-fu specs need
a handful of attempts rather than one (estimate in §7).

**Han** is an accounting identity: `han = Σ yaku han (openness-dependent) +
dora + ura + aka`. With the yaku set fixed (exact policy), the required dora
count is forced: `D = hanTarget − yakuHan`. If the spec also pins `doraCount`,
the two must agree or the static engine rejects. With `atLeast` or unspecified
yaku, the planner samples a yaku combination from the compatibility catalog
(§3.3) whose han sum leaves a reachable dora remainder.

### 3.3 Content (yaku required, yaku excluded, dora)

**Required yaku → per-yaku templates.** Each supported yaku is a declarative
record, not imperative code — this is the load-bearing difference from v1's
scaffold rules:

```ts
interface YakuTemplate {
  name: CanonicalYaku;
  hanClosed: number; hanOpen: number | null;      // null = closed-only
  skeleton: SkeletonConstraints;   // e.g. pinfu: {runs: 4, wait: "ryanmen", closed: true, pair: "non-value"}
  tilePredicate: AssignmentConstraints; // e.g. tanyao: all simples; sanshoku: shared rank r across suits
  incompatibleWith: CanonicalYaku[];   // static pairs: pinfu×toitoi, tanyao×chanta, …
  subsumes: CanonicalYaku[];           // ryanpeikou→iipeiko, junchan→chanta, chinitsu→honitsu
}
```

The templates feed three consumers with one data source: the skeleton planner
(structure), the tile assigner (tile predicates), and the static engine
(incompatibility/implication rules, §7.3's contradictions fall out for free).
That triple-use is what keeps the knowledge base honest — a wrong template
surfaces as either a static false-negative or a rejection-rate spike, both
observable, never as a wrong hand.

**Excluded yaku (exact policy) → three layers, only one of which is a
guarantee** (full treatment in §4): statics for automatic yaku; anti-yaku
*biases* in the assigner; and the verifier's set-equality check, which is the
actual guarantee.

The bias layer is not a flat list of peer heuristics — measurement
(DESIGN-REVIEW §2.3) shows one dominates. On a tanyao-constrained pinfu spec,
**accidental iipeiko alone is 33.1% of fills**, several times everything else
combined (sanshoku 3.2%, ryanpeikou 1.3%). So **duplicate-run avoidance is the
primary bias, built first and measured on its own**: the assigner tracks placed
run starts per suit and samples without replacement unless iipeiko or
ryanpeikou is requested — which also eliminates accidental ryanpeikou for free,
since it requires two duplicated runs. Secondary biases follow at leisure:
break rank alignment across suits (sanshoku doujun), avoid 123/456/789 in one
suit (ittsuu), ensure ≥1 yaochu group when tanyao is unwanted, ≥2 suits when
honitsu/chinitsu unwanted.

The general principle, encoded rather than rediscovered per-yaku: **the tighter
the tile predicate a required yaku imposes, the higher the collision rate among
the remaining degrees of freedom.** Requiring tanyao removes it as an accident
but shrinks legal run starts to 2–6, driving iipeiko up by a third and sanshoku
up 88% relative to unconstrained pinfu. Any pool-narrowing yaku (tanyao,
honitsu, chinitsu) raises the assigner's expected duplicate pressure, and the
rejection-cause telemetry (§7) continuously verifies the biases are paying for
themselves.

**Invariant on biases — including any adaptive tightening (§7.1): a bias may
only ever exclude hands the comparator would reject anyway.** Duplicate-run
avoidance qualifies under exact policy, because an iipeiko hand is invalid for
a spec that excludes iipeiko; removing it costs no legitimate variety. A bias
that narrows further silently shrinks the output distribution and defeats §8's
"sample from the full feasible set" — the failure mode §8 exists to prevent.
Corollary: under `atLeast` policy extra yaku are *permitted*, so the anti-yaku
biases must relax there. Otherwise `atLeast` would never emit an iipeiko hand
despite explicitly allowing one.

**Dora → a placement plan solved before tile assignment.** Choose a pattern for
`D` dora among hand elements (pair=2, each run through the dora tile=1 per
copy, triplet=3, kan=4), *randomizing the pattern choice* to satisfy §7.4's
pedagogical-spread requirement; derive each indicator as the predecessor tile;
then check the global 4-copy budget *including indicators*. The
`doraIndicatorCount` independence requirement (§5.1) means surplus indicators
must point at tiles with **zero copies in the hand** — the planner picks
indicator tiles whose successor is absent from the hand and whose own copies
aren't exhausted. Ura mirrors this, gated on riichi. Aka is **not** a late
substitution pass: a red 5 is a physical tile — one of its suit's four 5s under
the default ruleset, a 4-copy-budget entry, and a legal indicator candidate —
so the tile assigner allocates red copies explicitly inside the same budget the
dora planner draws from. A find-and-replace after assignment could double-spend
a 5 the dora plan already committed (review §6).

### 3.4 Situational (winds, riichi/ippatsu flags, honba, ruleset)

**Free parameters, set directly.** They never require search; they require only
the static engine to know their implications (riichi ⇒ closed; ippatsu ⇒
riichi; double-wind pair fu; menzen tsumo forced by closed+tsumo). Declared
yaku (riichi family) can never appear by accident, so under exact policy they
are simply flags the generator sets iff requested.

---

## 4. Exclusivity: the mechanism and what the guarantee is worth

**Mechanism.** Under `yakuPolicy: "exact"`:

1. **Static layer.** Automatic yaku (SPEC §7.2): if the situation forces a yaku
   not in the requested set — closed+tsumo forces menzen-tsumo; riichi flag
   forces riichi — reject as unsatisfiable with the fix named
   (`"closed tsumo hands always have menzen-tsumo; add it to the yaku list or
   change winMethod"`). The lesson-authoring UI can make that a one-click fix.
2. **Bias layer.** Anti-yaku heuristics in the assigner cut the accidental
   rate sharply — for the tanyao-constrained pinfu spec, from a measured 37.4%
   to ~4%, since duplicate-run avoidance eliminates iipeiko and ryanpeikou
   structurally (§3.3, §7). This layer has zero correctness weight; it exists
   so the loop converges in ~1 attempt instead of ~1.6.
3. **Guarantee layer.** The comparator requires the canonical reading's yaku
   multiset (after subsumption) to equal the requested set — and, per §5 below,
   requires *every score-tied top reading* to satisfy it.

**What the guarantee is worth — exactly as much as the scorer's coverage
allows.** The guarantee is: *"no yaku that `riichi-score` version X can detect,
other than those requested."*

**[DELIVERED — M5]** When this was written the scorer detected six yaku, and a
"pinfu only" hand containing accidental iipeiko sailed straight through
verification. It now detects the full standard set bar nagashi mangan, measured
at 100% answer-key agreement against an independent implementation across all
nine generator specs. The guarantee is therefore worth what it claims, and the
enforceability gate below is close to a no-op — it existed to refuse specs the
scorer could not police, and that set is now empty.

**The subtle point: exclusivity needs coverage of the *accidental* yaku, not
the *requested* ones.** The set of yaku learners want lessons about and the set
that appear uninvited overlap but aren't equal. The priority order for scorer
extension should be driven by accident frequency: iipeiko and tanyao (SPEC's
own top offenders), then sanshoku doujun, ittsuu, chanta-family, honitsu/
chinitsu, toitoi/sanankou for triplet-heavy specs — before rarer requestables.

**Considered and deprioritized: generator-side guard filters.** A conservative
detector used *only to reject* candidates can never emit a wrong answer key —
if we over-detect iipeiko and reject, we only lose throughput; surviving hands
genuinely lack the pattern, so the scorer's blindness to it becomes harmless.
This is a legitimate bridge and the safe direction of the asymmetry. But it
duplicates rules knowledge (drift risk in the one place we swore not to), and
every hour spent on a guard is an hour not spent adding the detector to the
scorer, which serves both exclusivity *and* answer-key richness and is needed
by the product anyway. **Recommendation:** extend the scorer first (§10);
build a guard only if we hit a yaku that is much harder to score than to avoid
generating. Until coverage lands, `generate` must **refuse `"exact"` specs
whose accidental-risk set exceeds scorer coverage** — refusing loudly is the
only honest behavior; silently weak guarantees are precisely how this product
fails.

The generator therefore carries a version-pinned manifest of the scorer's
detectable-yaku set (ideally exported by `riichi-score` itself) and computes,
per spec, whether exclusivity is *enforceable* before searching.

---

## 5. Interpretation ambiguity: tied-top-set semantics

Kōtenhō gives us two obligations, and the SPEC's own analysis (§4.10, §7.1)
points at a generalization it doesn't quite state.

**Obligation 1 — the canonical reading governs.** The comparator never looks at
what the planner intended; it looks at `handInterpretations[0]`. A pleasant
corollary: if a *different* reading than intended happens to satisfy the spec,
we accept — the intended reading was scaffolding, not commitment.

**Obligation 2 — ties.** `handInterpretations` is sorted by `basicPoints`;
among tied readings, index 0 is arbitrary (insertion order under a stable
sort). So the comparator's unit of truth is the **tied-top set**
`T = { hi : hi.basicPoints === handInterpretations[0].basicPoints }`, and:

- A **graded constraint** (han, fu, yaku set, wait when constrained) is
  satisfied only if **every member of T** satisfies it. If members of T
  disagree on a graded dimension, the answer key for that dimension is
  ambiguous, and a hand generated for a lesson grading that dimension is
  rejected.
- `requireUnambiguousWait` = "all members of T share one wait type." The spec's
  softer option ("accept every tied answer as correct") is served by the output
  carrying all interpretations plus per-dimension ambiguity flags, so the coach
  can grade any tied answer as right.

**Ambiguity is not wait-specific — but the request-side API stays wait-only
(revised per review §2.2).** Score-tied readings can disagree about fu and han
themselves, not just the wait. The v1 draft attributed this to
`basicPoints = fu × 2^(2+han)` collisions (30 fu·3 han = 60 fu·2 han = 960);
measurement over 27,121 tied top sets found the real driver elsewhere: **every
observed fu/han disagreement sat at mangan or above**, where the 2000-point cap
flattens different (fu, han) pairs onto one score — zero collision-driven cases
below the cap. The exposure is confined to limit hands, where fu doesn't affect
payment and where fu-counting lessons don't live. Consequences:

- Request-side API ships **`requireUnambiguousWait` only**; the four-dimension
  `requireUnambiguous` array is dropped.
- Exact fu/han specs were self-protecting all along: under the all-of-T rule, a
  hand whose tied readings disagree on fu cannot satisfy an exact-fu spec — at
  most one of the disagreeing values matches the target. The request-side
  fu/han flags were largely redundant with comparator semantics.
- **Documented constraint:** fu-graded lessons must exclude mangan+ hands, and
  the static engine warns when a fu-exact spec's han range reaches the cap.
- The output keeps all four diagnostic flags (`wait/fu/han/yaku`) — they are
  computed from T regardless and cost nothing.
- **[DELIVERED — M1] Caveat closed.** The kan region was measured: **0 true
  collisions across 4,362 multi-reading hands**, with kans up to three. The
  reasoning that motivated the caveat turned out backwards — a declared kan is a
  meld, so it contributes identical fu to *every* reading and pushes the ratio
  between them toward 1, making a doubling collision harder rather than easier.
  Cap-driven fu/han ambiguity does climb with fu (4 cases at 50 fu, 18 at 60, 22
  at 70), which reinforces the mangan+ exclusion above but changes nothing about
  the API. `requireUnambiguousWait` alone is correct.

**Winning-tile selection is the primary ambiguity lever.** Measurement puts
wait disagreement in **85.5% of tied top sets**, and the mechanism is almost
always *which copy* of the winning tile completed the hand — SPEC §4.10's
four-8p example. That promotes winning-tile choice from a passing planner bias
to a named component (§2): it owns cheap pre-checks (how many live copies of
the candidate agari tile remain in the hand; whether that tile also borders
another run or pairs elsewhere) and re-picks the winning tile when a tied
alternate reading is structurally likely, before a verifier call is spent. The
verdict itself stays with the verifier's T-set inspection.

Duplicate interpretations (e.g. iipeiko hands produce two identical readings)
are deduplicated by canonical serialization before T is formed, so they never
masquerade as ambiguity — they'd agree on every dimension anyway.

---

## 6. Impossible specs: prove, don't time out

Two stages, both fast, both shared verbatim between `generate` and `analyze`.

**Stage 1 — rule table (microseconds).** Declarative implications and
incompatibilities, most of them read straight off the yaku templates:
automatic-yaku forcing (§7.2), yaku↔structure implications (§7.3: pinfu⇒
{closed, ryanmen, 4 runs, non-value pair, no kans, fu ∈ {20,30}}; chiitoi⇒
{closed, tanki, 25 fu, no melds}; toitoi⇒wait ∈ {shanpon, tanki}; tanyao⇒no
penchan — the 12/89 shape contains a terminal), pairwise yaku incompatibility,
declared-yaku prerequisites (ippatsu⇒riichi⇒closed), and range emptiness.
Each rule carries its reason string; the first failing rule is the reported
reason.

**Stage 2 — skeleton enumeration (milliseconds).** Enumerate the abstract
skeleton space (group-class multisets × openness × pair class × wait × win
method — order 10^4–10^5 before pruning, far less after) and test each against
the structural + arithmetic constraints, including the fu decomposition table
and the dora bounds of §7.4 (`D ≤ 2·indicators` without 3+ multiplicity;
indicator copies vs. 4-copy limit). If no skeleton survives, the spec is
provably impossible with a computed reason (`"no group structure reaches 20 fu
on a closed ron: base 20 + menzen ron 10 ≥ 30"`). This catches the arithmetic
contradictions that pairwise rules can't see.

**Honesty about the remainder.** The static engine is sound but incomplete: a
surviving skeleton doesn't guarantee tiles exist (pool exhaustion, dora
indicator collisions, exclusivity pressure can all still kill it). Those specs
go to search under budget and, on failure, return **Exhausted** — with
telemetry (§7.1: attempts, rejection histogram by cause, closest-miss
examples) rather than a bare shrug, because "9,900 of 10,000 candidates died to
accidental iipeiko" tells a lesson author exactly what to relax. Unsatisfiable
and Exhausted are distinct result types per SPEC §5.1, and the invariant *"the
static engine never calls impossible a spec the search can solve"* is directly
fuzz-testable (§11).

---

## 7. Failure, backtracking, and the arithmetic of convergence

**Failure classification drives retry depth.** Every rejection is tagged by the
comparator: extra yaku (which one), canonical fu ≠ target, canonical wait ≠
target, ambiguity on a required dimension, score drift (a better reading
existed). The controller maps causes to layers:

- *Extra yaku / ambiguity* → retile the same skeleton (cheap, usually a local
  accident), with the bias against the offending pattern strengthened for
  subsequent attempts.
- *Canonical fu/wait drift* → retile first; on repeat, mark the skeleton
  feature (e.g. "shanpon on a tile with a 4th copy adjacent to a run") as
  suspect and rotate to a different skeleton.
- *Pool/indicator exhaustion in assignment* → rotate dora plan, then skeleton.

**No-thrash policy:** attempts-per-skeleton cap (~20), attempts-per-dora-plan
cap (~5), global budget (default ~1,000 verifier calls, caller-tunable),
skeleton selection is weighted-random-without-recent-repeats rather than
best-first — which simultaneously prevents lock-in on a cursed skeleton and
serves variety. No formal no-good learning in v1; the layered caps subsume its
benefit at this problem size.

**[DELIVERED — M1] Measured, on the real loop.** Every spec generated 300/300
hands; worst case 10.2 attempts each, inside the estimates below.

```
30 fu closed ron (pinfu)      1.00        40 fu closed ron            5.01
40 fu closed tsumo            1.00        50 fu, one kan              5.50
chiitoitsu                    1.00        50 fu closed ron            6.13
40 fu closed, kanchan         2.13        40 fu, one called meld     10.16
40 fu closed, shanpon         3.06
```

Two results worth carrying forward. **Zero `planner-defect` diagnoses across
~9,000 attempts** — the skeleton fu model and the scorer never disagreed on a
hand the generator built, which is the strongest evidence the fu table is right.
And **convergence speed says nothing about correctness**: "40 fu closed tsumo"
converged in exactly one attempt while getting han wrong 37% of the time, fast
precisely *because* the scorer was not scrutinising it. The estimates below
remain as the reasoning that preceded the measurement.

**The arithmetic** (the load-bearing estimate; the M1 spike in §10 measures it
for real):

- Verifier cost: `calculate()` on 14 tiles — decomposition space is tiny;
  ~0.1–1 ms. A 1,000-attempt budget is ≲1 s worst case.
- Pinfu-tanyao-only, 3 han 30 fu, exact — now measured (review §2.3): raw kill
  37.4% (iipeiko 33.1%, sanshoku 3.2%, ryanpeikou 1.3%) → acceptance ~0.63,
  **E[attempts] ≈ 1.6 unbiased**; with the primary duplicate-run bias, iipeiko
  and ryanpeikou vanish structurally, leaving ~4% kill → **E ≈ 1.05**. Note
  *why* the v1 draft's ~40% figure held: it was cancellation, not stability —
  requiring tanyao removed it as an accident (−20 points) while pool-narrowing
  drove iipeiko up by a third (§3.3's principle).
- Exact 30 fu with a triplet, `requireUnambiguousWait`: ambiguity kill ~28–37%
  (SPEC §7.1) × fu drift ~15% → acceptance ~0.5 → **E ≈ 2**.
- Compound tight spec (exact yaku + exact fu + exact dora + unambiguous):
  multiplicative kills → acceptance maybe 0.05–0.3 → **E ≈ 3–20**. Milliseconds
  to tens of milliseconds.
- Pathological corner (exact ura count + junchan + kan fu targets):
  acceptance possibly ~10⁻³ → ~1 s and worth surfacing in `analyze` as a
  low-yield warning rather than fixing preemptively.

One nuance the review's harness makes explicit: these are *true* rates,
measurable only against a scorer that can see the accidental yaku. The
production loop verifies against `riichi-score`, which — until coverage lands —
accepts *more* candidates, not fewer, and every extra acceptance is precisely a
wrong-answer-key hand. The retry loop therefore cannot compensate for scorer
blindness; the enforceability gate (§4) is what protects exclusivity, and the
loop only protects throughput.

If the spike falsifies these numbers for a spec class we care about, the
remedy is more planning (move that constraint from "aimed" to "constructed"),
not abandoning the architecture — fu targeting already shows the pattern.

### 7.1 Telemetry: one structure, four consumers

Telemetry here is not an observability bolt-on — it **is the search
controller's memory**. The counters that route retries are the same structure
serialized into an `Exhausted` result, reported by `analyze`, and measured by
M1. One structure, four consumers, which guarantees the report describes what
the search actually did, rather than a parallel bookkeeping that can drift
from it.

**The unit: one attempt record per candidate**, whether it died in assignment
or verification:

```ts
interface AttemptRecord {
  attempt: number;
  stage: "assignment" | "verification";
  outcome: "accepted" | "rejected";
  diagnosis?: IntendedReadingDiagnosis;  // why intended ≠ canonical; see below
  causes: RejectionCause[];        // ALL violated constraints, never just the first
  primaryCause?: RejectionCause;   // deterministic pick; drives retry routing
  skeletonId: SkeletonDigest;      // lineage: which skeleton / dora plan
  doraPlanId?: string;
}

type IntendedReadingDiagnosis =
  | "drift"                  // intended reading present, on target; a peer outscored it
  | "planner-defect"         // intended reading present but missed its own target
  | "coverage-shadow"        // intended reading filtered out: no detectable yaku
  | "scorer-parser-suspect"; // intended reading absent despite a detectable yaku

type RejectionCause =
  | { kind: "extra-yaku"; yaku: CanonicalYaku }
  | { kind: "missing-yaku"; yaku: CanonicalYaku }
  | { kind: "no-yaku" }              // scorer found no yaku at all: valid:false / empty
  | { kind: "fu-mismatch"; got: number; want: FuConstraint; drift: boolean }
  | { kind: "han-mismatch"; got: number; want: HanConstraint; drift: boolean }
  | { kind: "wait-mismatch"; got: WaitType }
  | { kind: "ambiguous-wait"; waits: WaitType[] }
  | { kind: "dora-mismatch"; got: number }
  | { kind: "pool-exhausted" }
  | { kind: "indicator-collision" }
  | { kind: "duplicate-in-batch" };
```

Two decisions carry the weight:

**Record all causes; route on one.** If the comparator stopped at the first
failed check, the histogram's shape would be an artifact of check *order* —
90% "extra-yaku" while half of those hands also missed fu. Diagnostics get the
full violation set; the retry router gets a single deterministic
`primaryCause` (deepest-layer cause wins, since it determines how far to
backtrack under the routing table above).

**Split kōtenhō drift from planner defects — and both from the coverage gap.**
The verifier knows the intended reading, because the planner built it, so it
can locate that reading among `handInterpretations` and diagnose the mismatch.
Four cases, which must not be conflated:

- Intended reading present, on target, a peer outscored it → **drift**.
  Expected, routine, retryable — the ~15% fu-drift in the arithmetic above.
- Intended reading present but it missed its own target → **planner defect**:
  a wrong fu-table entry or a broken yaku template.
- Intended reading **absent**, carrying no yaku the pinned scorer can detect →
  **coverage shadow**, and *not* a defect. `calculate()` drops yaku-less
  interpretations (`calculate.ts:180`), so through M2–M5 a structurally correct
  hand whose only yaku is invisible to the scorer loses its intended reading
  for entirely legitimate reasons — and `handAnalysis` may come back empty
  altogether (cause `no-yaku`). Counting these as defects would make the
  tripwire noisiest exactly when coverage is thinnest, which is when it most
  needs to be trusted. Tracked on its own counter, where it doubles as live
  evidence for M5's detector ordering.
- Intended reading absent *despite* carrying a detectable yaku → **scorer
  parser suspect**. The planner constructed the decomposition, so it is valid
  by construction; if the scorer never surfaced it, that implicates
  `riichi-score`'s parser rather than the planner. Rare, and it warrants an
  alert rather than a line in a retry histogram.

All four are still only rejections — no wrong hand escapes any of them. The
distinction matters because just one of them is a regression in this repo, and
a rising planner-defect rate is what keeps *"the planner is allowed to be
buggy"* (§0) from decaying into *"the planner is rotting unnoticed."*

**Aggregation: counters plus a small ring buffer.** Per call: a histogram
keyed on canonical cause strings (`"extra-yaku:iipeiko"`,
`"fu-mismatch:drift"`) with per-skeleton sub-counts — which already exist,
since the no-thrash caps and cursed-skeleton rotation read them. Alongside: a
bounded ring buffer (~5) of **near-misses**, candidates that failed on exactly
one cause, stored as tile digest + the single violated constraint. Counters
are effectively free, and the digests cost nothing extra because
`calculate()` already produced everything worth keeping — total overhead is
well under 1% of the verifier call that dominates each attempt.

**The four consumers:**

1. **In-loop:** `primaryCause` feeds the routing table above, plus adaptive
   bias tightening (if `extra-yaku:iipeiko` crosses a threshold within a
   skeleton, run-start sampling tightens). Determinism survives because
   adaptation is driven only by counts, which are themselves deterministic
   given (seed, version).
2. **`Exhausted` result:** `{ attempts, rejections, nearMisses }`. Near-misses
   are the authoring payoff — *"this hand was perfect except it also contained
   sanshoku"* tells the author to either allow sanshoku or accept low yield.
   They are rendered as clearly-marked invalid examples (tiles + the one
   violation), never as returnable hands.
3. **`analyze` probe:** the identical loop with `stopOnFirstSuccess: false`
   and budget K — acceptance rate, rejection histogram, and distinct-hand ratio
   fall out of the same counters (§8). Adaptive bias tightening is **frozen** for the
   probe: across K ≈ 50–100 attempts the loop would otherwise adapt in ways a
   two-attempt production call never reaches, and `estimatedYield` would then
   describe a slightly different system than the one it is predicting.
4. **`ok` result:** `stats: { attempts, rejections }` — lets a lesson UI
   notice "works, but took 300 attempts" before learners do.

**The sink boundary.** Production wants counters; the M1 spike wants every
candidate with both scorers' verdicts streamed to JSONL for offline analysis.
So recording depth is pluggable — an optional `onAttempt(record)` sink in
options — under one hard rule: **sinks are observers.** They never touch the
RNG stream or generation state, so attaching one cannot change the output for
a given seed. The spike harness is then the default loop plus a fat sink, and
that same sink graduates into the nightly CI soak (per-lesson acceptance rates
with regression alerting — §3.3's "biases keep paying for themselves," made
operational).

**API surface note:** cause keys leak into the public API through `Exhausted`,
so they get the same stability treatment as the static engine's reason strings
(§11): canonical kebab-case, snapshot-tested, additions allowed, renames
versioned.

---

## 8. Variety and determinism

- **PRNG:** one seeded generator (PCG32 or splitmix64-derived; not
  `Math.random`, which v1 used and which breaks determinism outright). The
  seed derives independent substreams per attempt and per batch index, so
  `count: 20` items don't share a stream and batch generation parallelizes if
  ever needed. Determinism contract: same (library version, spec, seed) ⇒ same
  output; **documented as per-version**, since any planner change reorders
  draws. Lesson reproducibility across upgrades comes from storing the hand,
  not the seed.
- **Variety by construction:** every choice point — skeleton, suits, ranks,
  dora pattern, free winds, which group is opened — samples from the *full*
  feasible set, never first-fit. First-fit determinism is how "over-constrained
  spec returns cosmetic variations" happens silently.
- **Batch distinctness (§10.7 opinion):** define distinct = normalized
  (concealed multiset + melds + winning tile + indicators) differs. `generate`
  with `count: n` dedupes within the batch; if the space is too small it
  returns what it found plus an explicit shortfall reason — never silent
  repeats (SPEC §7.6).
- **`analyze` as the variety instrument:** a seeded Monte-Carlo probe (K ≈
  50–100 budgeted attempts — the §7.1 loop with `stopOnFirstSuccess: false`)
  reports acceptance rate, rejection histogram, and distinct-hand ratio. A
  lesson-authoring UI renders that as "this drill has ~4 materially different
  hands" — the silent-failure detector SPEC §5.2 asks for. Static solution-space
  counts remain a later enhancement rather than a promise of the v1 result.

---

## 9. State of `riichi-score`, and the cross-repo critical path

**[DELIVERED — M0 and M5] All eight findings below are closed**, along with five
more that only surfaced once the differential harness existed. See `STATUS.md`
§2.2 for the full table. The list is kept here because the *reasoning* about
sequencing still holds, and because two of the later discoveries change how you
should think about this class of bug:

- **Yaku-less hands reported `valid: true`** with an empty interpretation array,
  so any consumer writing `if (result.valid) use(result.handInterpretations[0])`
  crashed. Found by a throwaway probe crashing, not by a test.
- **Honors were parsed as a run** — `5z6z7z` read as a sequence, inventing whole
  interpretations. Every other bug here *under*-scored; this one **over**-scored
  a hand by a full limit tier, which is worse, because a learner who answers
  correctly gets marked wrong with no way to tell the app is confused. No
  curated fixture would ever have caught it — you have to already suspect that
  honors could form runs to think of testing it. Two independent implementations
  found it in minutes.

Original findings, all now fixed:

1. **Ankan is scored as open.** `appendMeldsToGroups` marks every meld
   `open: true`, including ankan. Consequences: closed-with-ankan hands lose
   menzen-tsumo (detector checks `groups.some(g => g.open)`), lose the 10-fu
   menzen-ron bonus, and kan fu is halved (16 vs 32 for honors). Any kan lesson
   is wrong until fixed. (`src/utils/append-melds-to-groups.ts:23`)
2. **Ron-completed triplets are not scored as open** (SPEC §4.6 rule): nothing
   sets the winning shanpon group open for fu, so it gets closed-triplet fu.
   Notably, the SPEC's own §4.10 worked example (reading 1, 32→40 fu) does not
   reproduce on the current scorer.
3. **Riichi/ippatsu/double-riichi han are never emitted** — `isRiichi` exists
   but only gates ura-dora counting. A riichi hand's answer key is 1+ han
   short. Haitei/houtei/rinshan/chankan flags don't exist in `GameState` at all.
4. **Yaku coverage is 6 of ~25** (see §4) and there is no subsumption
   machinery yet. *(Now the full standard set bar nagashi mangan. The rule that
   emerged doing it: **never add a yaku without the one that subsumes it** —
   iipeiko needs ryanpeikou, sanankou needs suuankou, honitsu needs chinitsu,
   chanta needs junchan and honroutou. Adding only the lesser one is worse than
   adding neither, because it turns a missing yaku into a confidently wrong
   one.)*
5. **No kuipinfu floor:** an open all-run 20-fu hand scores 20 fu.
6. **No ruleset configuration object** (SPEC §4.12 requires divergences be
   locatable in one place — that object has to live in the scorer, since the
   scorer applies most of them).
7. **No 4-copy validation** across closed tiles + melds + indicators; the
   generator must enforce it regardless, but the scorer should too.
8. **Kokushi is emitted as `han: 13`.** With yakuman adopted as a distinct
   `limit` value rather than a han count (§13.3, accepted by review §6), the
   scorer needs a matching representation change.

**Sequencing consequence:** the scorer is on the critical path twice — once for
*answer-key correctness* (items 1–3, 5 block even the structural lessons that
§8.4 says shouldn't need coverage) and once for *exclusivity* (item 4). The
build order below therefore starts in the scorer repo.

**[SUPERSEDED] The priority order this section proposed was wrong**, and the way
it was wrong is worth keeping. It ran *riichi family → iipeiko → sanshoku →
ittsuu → chanta → honitsu → toitoi/sanankou → … → yakuman*, derived from
sampling **pinfu-shape** hands where every block is a run. Once fu is the
constraint, hands acquire triplets, and the measured order was completely
different:

```
sanankou   17–32%     ← invisible in pinfu-shape sampling; sanankou needs triplets
honitsu     2–12%
toitoi      0.3–11%   ← concentrated in the 50-fu spec
chanta      1–2%
sanshoku    0.7–2.3%
ittsuu      0.3%      ← the plan ranked this third
```

**The general lesson: accidental-yaku frequency is a property of the spec, not
of the game.** Any future ordering has to be measured against the specs that
will actually be generated, not against a convenient sample. Moot for detector
order now that coverage is complete, but it applies directly to M4's anti-yaku
bias layer, which must be built around **iipeiko first** (33.1% of fills on a
tanyao-constrained pinfu spec) rather than treated as one heuristic among peers.

---

## 10. Build order

Ordered riskiest-first; each milestone names what it retires and its evidence.
Milestones are tagged **[v1]** (blocking: the coach app cannot ship its
representative lesson table without it) or **[post-v1]** (aspirational — real,
but explicitly not a silent backlog inside v1).

**M0 — Scorer conformance harness** *(riichi-score repo)* **[v1] ✅ DELIVERED**
36 curated fixtures pinning every line of the fu table, all hand-computed before
running. Thirteen bugs fixed (§9). Only the ruleset config object (finding 6) is
outstanding.
Fix findings 1–3 and 5 — **ankan-open and ron-completed-triplet first**, since
those are what make current fu lessons wrong; add curated fu/score tables
(WRC/Tenhou book examples, the SPEC §4.10 example verbatim) and a differential
harness against the reference scorer adopted in M1.
*Retires:* "the truth source is wrong" — the single worst risk in the system.
*Evidence:* zero disagreements on the curated corpus; disagreement vs the
reference scorer only in documented ruleset deltas.

**M1 — The convergence spike** *(throwaway proposer, permanent harness)* **[v1] ✅ DELIVERED — verdict: GO**
300/300 hands on every spec at 1–10 attempts; zero planner defects in ~9,000
attempts; answer-key agreement 58–95% → **100% on all nine specs** as detectors
landed; kan-collision question closed (§5). The §2.1 correction below proved
exactly right — measured against `calculate()` alone the loop looked ~95%
accepting where the truth was ~63%.
Naive proposer + telemetry, verified against the **independent reference
scorer** built during spec work (own parser, own fu model, 17 yaku detectors) —
**not** `calculate()`. This is the review's §2.1 correction and it is right:
`calculate()` cannot see iipeiko, which is 33.1% of fills for the headline
spec, so an M1 measured against it would report ~95% acceptance where the truth
is ~63% and validate the architecture *by being blind* — false confidence from
the exact milestone meant to expose it. The reference scorer moves into this
repo as a **test-only asset**: it doubles as §11's differential counterpart and
is never consulted at runtime (single-authority preserved). The spike runs the
headline spec plus the nastiest structural specs (kan-heavy exact fu;
`requireUnambiguousWait` shanpon), and runs `calculate()` side-by-side on every
candidate anyway — the diff stream is free early input to M0's bug list. Also
hosts the kan-region fu/han-collision experiment from §5.
*Retires:* "propose-verify doesn't converge" — the architecture bet itself.
*Evidence:* measured E[attempts] within ~5× of §7's estimates; the §5 kan
caveat closed one way or the other; a written go/adjust decision.
*Sequencing:* decoupled from `riichi-score` correctness, **M0 and M1 run in
parallel.*

**M2 — Core library, structural constraints end-to-end** **[v1] 🟨 MOSTLY DELIVERED**
Built and working: seeded RNG, skeleton enumeration with fu as a pure function
of shape, exact structural lookup, tile assigner under the 4-copy limit,
tied-top-set comparator, attempt telemetry, chiitoitsu. **Outstanding: kokushi
is absent from the skeleton model, which is a live soundness bug** — the static
engine reads an empty candidate set as a *proof* of impossibility, so a kokushi
spec is wrongly reported `unsatisfiable`. Same bug already fixed for
chiitoitsu, same place. `analyze()` is M3.
Normalizer, static engine v1 (rule table), skeleton planner with the fu
decomposition table, tile assigner, verifier/comparator with tied-top-set
semantics, controller, seeded RNG, result assembler. Scope: fu / wait /
openness / kan / win-method / wind lessons — no content yaku beyond the
scorer's six, `yakuPolicy` restricted to what's enforceable.
*Retires:* integration risk with `riichi-score`'s real shapes; fu-targeting
design.
*Evidence:* 10k-hand self-check (every output re-verified against its spec —
this invariant runs in CI forever); structural lesson table from SPEC §2 all
generating; determinism test across processes.

**M3 — Static engine v2 + `analyze`** **[v1]**
Skeleton enumeration for arithmetic impossibility proofs; Monte-Carlo yield
probe; Unsatisfiable/Exhausted result types finalized with reasons.
*Retires:* "impossible specs discovered by timeout"; the authoring-UX risk.
*Evidence:* fuzz invariant — `analyze`-impossible × high-budget `generate`
never conflict; curated impossible-spec corpus (all of SPEC §7.2/§7.3) each
returns the right reason string.

**M4 — Yaku templates + exact policy for covered yaku** **[v1]**
Templates for the scorer's current six; automatic-yaku statics; anti-yaku
biases; enforceability gate wired to the scorer's detectable-set manifest.
The "Recognise pinfu" lesson ships here.
*Retires:* exclusivity mechanism design.
*Evidence:* 1k pinfu-only hands with zero answer-key defects under the
differential scorer; measured accidental-yaku rejection rate matching M1
projections.

**M5 — Scorer yaku extension track** **✅ DELIVERED IN FULL**
Not the v1 subset originally scoped — the entire standard set bar nagashi
mangan, including all yakuman. Composite yakuman stack at `8000 × N` (standard);
single-hand doubles (kokushi 13-wait, suuankou tanki) deliberately **not**
applied, as those are local rules and belong to the ruleset object. See the
superseded priority order in §9.

*Original scoping, retained for the reasoning:*
**M5 — Scorer yaku extension track** *(parallel from M2 onward; order per §9)*
**[v1 through the accidental set for run-based flagship lessons: riichi family,
iipeiko, sanshoku doujun, ittsuu; post-v1 beyond that]**
Each detector: scorer implementation + subsumption entries + generator template
+ shared fixtures. Exact-policy enforceability widens with each landing; the
v1 cut is whatever the enforceability gate needs to unlock the shipped lesson
table, not the full catalog.
*Evidence per yaku:* differential agreement + generator can both *require* and
*exclude* it across 1k seeds.

**M6 — Dora planner** **[v1: omote dora exact/range + indicator independence +
aka in the assigner budget; post-v1: exact-ura beyond range constraints]** —
placement patterns, pedagogical spread option. *Evidence:* exact-dora specs
across counts 1–8; distribution test showing pair-dora and spread-dora both
occur.

**M7 — Ambiguity machinery** **[v1] 🟨 PARTLY DELIVERED** —
`requireUnambiguousWait` and the four diagnostic flags are built and tested.
Outstanding: the "identify the wait" lesson itself and the measured yield cost.
Original scope: the documented mangan+ exclusion for fu-graded lessons.
*Evidence:* generated wait-lessons have provably unique waits (checked by
exhaustive T-set inspection); yield cost measured.

**M8 — Variety and batches** **[v1: batch distinctness + no-silent-repeats
(SPEC §7.6); post-v1: `analyze` v2 diversity metrics].**

**M9 — Ruleset config, docs, perf** **[post-v1, two exceptions: the config
*object* itself lands with M0/M2 so divergence points are locatable from day
one (SPEC §4.12), and docs/perf enough to publish are v1].** Multi-ruleset
support is blocked on the scorer's config object regardless.

---

## 11. Testing and correctness strategy

The system is arranged so only two components can produce a wrong answer key;
test effort is allocated accordingly.

**[REVISED] On differential testing.** §12 below calls it "non-negotiable". That
overstated it. Riichi fu comes from a table of about fifteen rules and the
correct answer *is* independently computable, so the primary oracle is
**hand-verified curated fixtures**, with differential testing as a supplement —
valuable but bounded, since two implementations cannot catch a rule misread the
same way twice. In practice the split earned out both ways: the fixtures caught
two of my own arithmetic errors (a forgotten yakuhai pair, a tanki misread as a
run), and the differential caught the honor-run bug that no fixture would have.
The reference scorer is a **temporary measurement instrument** with an exit
condition, not permanent infrastructure.

1. **The scorer (the truth source):** curated canonical tables (book examples,
   every SPEC §4.6 special case, the §4.10 example); differential testing
   against the **independent reference scorer** (imported with M1 as a
   test-only asset, never a runtime authority) on both random and generated
   hands — the latter matters because the generator concentrates probability
   mass exactly where scorers disagree (ties, kans, ron-completed triplets);
   property tests (fu rounding, sort order, payment formula). Differential
   testing catches disagreement, not shared blind spots — the curated corpus
   stays the anchor for ground truth.
2. **The comparator:** table-driven tests over hand-built `HandAnalysis`
   fixtures — tie cases especially: the §4.10 shanpon/ryanmen tie, a
   960-point fu/han-split tie, tied readings differing in yaku set,
   duplicate-interpretation dedup.
3. **The static engine:** soundness fuzz (random specs; any "unsatisfiable"
   verdict is challenged by a large-budget generate — must never be beaten);
   completeness corpus of known-satisfiable specs (must never be called
   impossible); reason-string snapshot tests since they're UI-facing.
   **This fuzz is not yet built, and it would already be failing:** kokushi is
   missing from the skeleton model, so those specs are wrongly proved
   impossible. Worth building precisely because it catches that whole class —
   a shape omitted from the model silently becomes a false impossibility claim.
4. **The always-on invariant:** every hand `generate` returns is re-checked
   against its spec via a fresh `calculate()` before leaving the library
   (cheap — one extra call), and CI soak-tests 10k+ seeds nightly across the
   lesson table. Any violation is a released-bug-severity event.
5. **The scorer-under-development problem:** version-pin `riichi-score`;
   the generator's enforceability gate reads the pinned version's manifest, so
   a scorer upgrade *widens* behavior explicitly rather than shifting it
   silently. Shared fixtures move scorer→generator with each yaku landing.
6. **Human sampling:** a text renderer for hands + breakdowns, and a review
   habit of eyeballing a seeded sample per lesson before a lesson ships. This
   is a teaching product; a human should look at what learners will see.

---

## 12. The riskiest part, stated plainly

**[RETIRED] The single biggest risk was that `riichi-score` is wrong or
incomplete while being the sole authority.** Thirteen correctness bugs and a
6-of-25 coverage gap, all now closed, with 36 hand-verified fixtures and 100%
agreement against an independent implementation on every generator spec (§9).
The judgement was right — this was the correct thing to fear, and the correct
thing to spend the first half of the project on.

**[RETIRED] The biggest design risk inside this library** was whether
propose-verify converges. Measured: 300/300 on every spec at 1–10 attempts, zero
planner defects across ~9,000 candidates (§7). The fallback of promoting a
constraint from "aimed" to "constructed" was never needed.

**The risks that remain are smaller and different in kind:**

- **Correctness now depends on the fixtures being right, not on the code.** Two
  of the hand-computed expectations were wrong on first write and the tests
  caught them. The discipline that makes the corpus worth anything is computing
  every expectation from the rules *before* running — pasting in actual output
  turns the oracle into a mirror.
- **Shared blind spots.** The yakuman detectors were written into both scorers
  in one sitting from the same understanding, so differential testing cannot
  vouch for them. Their fixture coverage is thin (4 fixtures, 12 yaku).
- **Silent soundness holes in the static engine.** A shape missing from the
  skeleton model becomes a false proof of impossibility. This bit chiitoitsu
  once and is live for kokushi now (§10 M2).

A second-order risk worth naming: **ambiguity filtering may starve specific
lessons** — if ~a third of triplet-bearing hands are wait-ambiguous, a
"shanpon wait, unambiguous" drill discards heavily, and certain fu-lesson
shapes might be worse. M1/M7 measure this; the mitigation is the Winning-Tile
Selector's pre-checks (§5) — 85.5% of tied sets disagree on the wait, and
*which copy of the agari tile completed the hand* is the operative lever —
plus honest yield reporting in `analyze`.

---

## 13. Spec feedback and positions on §10

**Pushback / corrections:**

1. **§7.1 understates ambiguity: it is not wait-only** — score-tied readings
   can disagree on fu, han, and yaku sets too. *(Revised per review §2.2:)*
   measurement shows the observed fu/han cases are entirely a mangan-cap
   artifact, so the request-side API stays `requireUnambiguousWait` only;
   fu-graded lessons are documented to exclude mangan+ hands; the four
   diagnostic flags remain in the output; and exact fu/han specs are
   self-protecting under the all-of-T rule (§5). The kan-region caveat is
   owned by M1.
2. **§8.4 is optimistic about structural lessons.** "Structural constraints are
   unaffected and can be honoured before coverage is complete" is only true of
   the *search*; the *answer keys* for kan and riichi lessons are wrong today
   (ankan-open bug, missing riichi han, missing ron-triplet rule, no kuipinfu
   floor). The scorer conformance work (M0) precedes even the structural
   milestone.
3. **The spec's §4.10 worked example doesn't reproduce on the current scorer**
   (finding 2) — worth turning into a normative test the day it's fixed.
4. **`doraCount` needs a definition:** recommend it mean omote dora only, with
   `uraDoraCount`/`akaDoraCount` separate and no combined convenience field in
   v1 — ranges accepted on all three.
5. **Result should carry search telemetry** (attempts, rejection histogram) —
   cheap, and it is the debugging and authoring-UX surface for Exhausted.

**Positions on §10's open decisions:**

1. **Yakuhai naming:** spec-level `yaku: ["yakuhai"]` = sugar for "≥1 yakuhai
   entry"; qualified forms (`"yakuhai:haku"`, `"yakuhai:round-wind"`) for
   precision. Exclusivity compares the scorer's five distinct names as a
   **multiset** (double wind = two entries), after subsumption.
2. **Default ruleset:** Tenhou-flavored (kuitan on, kuipinfu 30-floor, double
   wind 4 fu — matching what `parse-fu` already does, kiriage off), as the
   de-facto online standard; expressed via the config object from day one even
   while it's the only option.
3. **Yakuman representation — PARTLY DECIDED, reopened.** A distinct
   `limit: "yakuman" | "double-yakuman"` value rather than `han: 13`. Landed in
   `riichi-score` during M0 and the payouts are verified correct:

   ```
   non-dealer ron    32000     dealer ron    48000
   non-dealer tsumo  32000     dealer tsumo  48000   (16000 x 3)
   ```

   Two things this structure gets right and should be preserved:

   - **`limit` is only ever set from a named yakuman's yaku listing.** Kazoe
     (13+ han reached naturally) goes through the separate `han >= 13 -> 8000`
     path in `calculateBasicPoints` and never sets `limit`. That is correct
     because **kazoe never stacks** — a named double yakuman is 16000 basic
     points, but 26 han of kazoe is still 8000. Deriving `limit` from han would
     have to special-case that back out.
   - **Yonbaiman and yakuman are the same basic points** (4 x mangan = 8000).
     Rulesets that call 13+ han "yonbaiman" instead of "kazoe yakuman" differ in
     *naming*, not payout, and the only behavioural difference — whether it can
     double — is already handled above. That ruleset fork is cheaper than it
     looks.

   **Still open: what `han` should report on a limit hand.** Today it carries
   dora, so a kokushi with two dora reports `han: 1, limit: "yakuman"`. The
   payout is right; the number is misleading for a learner. Options: zero `han`
   when `limit` is set; leave it and document that consumers ignore `han` on
   limit hands; or make han a union (`number | "yakuman" | "double-yakuman" |
   "triple-yakuman"`). Needs research into how the common rulesets and scoring
   UIs present this, and there is little urgency while only kokushi is detected.

   **Deadline:** before the coach app renders a scoring result. Nothing consumes
   `han` yet, which is the only reason this is deferrable — the moment the UI
   reads it, changing its meaning is a breaking change across two repos.
4. **Ranges:** yes, from day one, for han/fu/dora alike — near-zero comparator
   cost, large yield and pedagogy win; exact remains a degenerate range.
5. **Situational yaku:** v1 models all of them well enough to *exclude*
   (statics + flags); *requestable*: riichi/ippatsu/double-riichi only
   (declared, trivial). Haitei/houtei/rinshan/chankan requestability deferred —
   rinshan and chankan drag kan-interaction correctness with them.
6. **Ura/aka:** aka requestable in v1, allocated inside the tile assigner's
   4-copy budget as the physical tile it is — not a post-hoc substitution
   pass, which could double-spend a 5 the dora planner already committed
   (revised per review §6); ura requestable as a range, riichi-gated.
   Exact-ura is the worst yield corner in the system — allow it, but let
   `analyze` warn.
7. **Batch semantics:** guarantee distinct normalized hands (definition in §8)
   or return fewer with an explicit shortfall reason; never silent repeats.
8. **Variety metric:** `analyze` returns `{feasible, reason?, estimatedYield,
   distinctRatio, sampleSize}` from statics + seeded probe; the UI's
   interpretation ("this lesson will feel samey") stays in the UI.

---

## Appendix A — Result sketch (shapes only)

```ts
type GenerateResult =
  | { status: "ok"; hand: GeneratedHand }
  | { status: "unsatisfiable"; reason: string; rule: string }   // static proof
  | { status: "exhausted"; attempts: number;
      rejections: Record<CauseKey, number>;   // canonical cause strings (§7.1)
      nearMisses?: NearMiss[] };              // tiles + the ONE violated constraint;
                                              // marked invalid, never returnable hands

interface GeneratedHand {
  handInput: HandInput;                 // riichi-score's own input shape (§8.3)
  analysis: HandAnalysis;               // verbatim calculate() output
  canonical: HandInterpretation;        // analysis.handInterpretations[0]
  ambiguity: { wait: boolean; fu: boolean; han: boolean; yaku: boolean };
                                        // diagnostic; request-side filter is wait-only (§5)
  seed: string;
  stats: { attempts: number;
           rejections: Record<CauseKey, number>;   // §7.1
           skeleton: SkeletonDigest };
}
```

---

## Appendix B — Revision log

**v2 (2026-08-13), incorporating `DESIGN-REVIEW.md`:**

- **M1 verifier replaced** (review §2.1): the spike measures against the
  independent reference scorer, not `calculate()`, whose yaku blindness would
  have inflated acceptance ~95% vs ~63% and validated the architecture by
  concealment. Reference scorer adopted into this repo as a test-only asset and
  §11 differential counterpart; M0 ∥ M1 confirmed; `calculate()` still runs
  side-by-side in the spike to feed M0's bug list.
- **`requireUnambiguous` array dropped** (review §2.2): request-side is
  wait-only; observed fu/han ambiguity is a mangan-cap artifact (0/27,121
  collision-driven below the cap); fu-graded lessons documented to exclude
  mangan+; exact fu/han specs shown self-protecting under all-of-T; kan-region
  collision experiment assigned to M1.
- **Anti-yaku bias rebalanced around iipeiko** (review §2.3): duplicate-run
  avoidance is the primary bias (33.1% of fills for tanyao-constrained pinfu),
  ryanpeikou eliminated by the same mechanism; pool-narrowing principle
  encoded; §7 estimates updated to measured figures.
- **Minor** (review §3): fu contribution table written out and the six-value
  miscount fixed; Winning-Tile Selector promoted to a named component (85.5%
  of tied sets disagree on wait); M0–M9 tagged [v1]/[post-v1].
- **Aka dora** moved from substitution pass into the assigner's tile budget
  (review §6); kokushi `han: 13` → `limit` representation added to the scorer
  work list (§9.8).

**v2.1 (2026-08-13):**

- **Telemetry design folded in as §7.1:** one attempt record per candidate;
  all-causes recording with deterministic primary-cause routing; the
  drift-vs-planner-defect split as the template-regression tripwire; counters
  + near-miss ring buffer shared by the in-loop router, `Exhausted`,
  `analyze`, and `ok` stats; observer-only `onAttempt` sinks for the M1/CI
  harness; cause keys stabilized as API surface. Appendix A shapes updated to
  match.

**v2.2 (2026-08-13), review addendum:**

- **Planner-defect detection no longer fires on the coverage gap** (§7.1). The
  two-way drift/defect split became four-way: `calculate.ts:180` filters
  yaku-less interpretations, so an intended reading whose only yaku is one the
  pinned scorer cannot see disappears legitimately — routine through M2–M5 and
  previously miscounted as a planner defect, making the tripwire loudest
  exactly when coverage is thinnest. New `coverage-shadow` diagnosis (which
  also feeds M5 ordering) and `scorer-parser-suspect` for the genuinely
  anomalous case. `outcome` narrowed to accepted/rejected with diagnosis on its
  own axis; `no-yaku` added to `RejectionCause` for empty/`valid:false`
  analyses, which had no cause key at all.
- **Bias invariant stated** (§3.3): a bias may only exclude hands the
  comparator would reject anyway, or it silently defeats §8's full-feasible-set
  sampling. Corollary added: anti-yaku biases relax under `atLeast`, which
  would otherwise never emit an iipeiko hand despite permitting one.
- **`analyze` probe freezes adaptive tightening** (§7.1) so `estimatedYield`
  measures the system it is predicting.
- **§4's stale bias-layer estimate** (10–20%) reconciled with §7's measured
  ~4%.

**v3 (2026-08-13), post-delivery pass — M0, M1 and M5 shipped:**

Reality overtook the plan in several places. Delivered sections are marked
**[DELIVERED]**, corrected ones **[SUPERSEDED]** or **[REVISED]**. Superseded
reasoning is kept rather than deleted — how the plan was wrong is often more
useful than the corrected version.

- **§4 exclusivity guarantee** — coverage went 6 yaku → the full standard set
  bar nagashi mangan. The enforceability gate is now close to a no-op.
- **§5 kan-collision caveat closed** — 0 true collisions in 4,362 multi-reading
  hands. The reasoning behind the caveat was backwards: a declared kan is a
  meld, so it contributes identical fu to every reading and makes a doubling
  collision *harder*. `requireUnambiguousWait` alone confirmed correct.
- **§7 convergence measured** — 300/300 per spec at 1–10 attempts, zero planner
  defects. Added the finding that **convergence speed says nothing about
  correctness**: the fastest spec had the worst answer keys, precisely because
  the scorer was not scrutinising it.
- **§9 findings closed**, plus five bugs found only once the harness existed.
  The honor-run bug is called out specifically: it **over**-scored where every
  other bug under-scored, and no curated fixture would have caught it.
  Added the subsumption rule: never add a yaku without the one that subsumes it.
- **§9 detector priority order SUPERSEDED.** It was derived from pinfu-shape
  sampling where every block is a run, so sanankou — the actual leader at
  17–32% — was structurally invisible, while ittsuu was ranked third at a
  measured 0.3%. General lesson recorded: **accidental-yaku frequency is a
  property of the spec, not of the game.** Applies directly to M4's bias layer.
- **§10 M0/M1/M5 marked delivered**, M2 and M7 marked partial. M2 carries the
  live kokushi soundness bug.
- **§11 differential testing REVISED** from "non-negotiable" to a bounded
  supplement; curated fixtures are the primary oracle. Both halves earned out.
  §11.3's soundness fuzz noted as unbuilt *and already failing* on kokushi.
- **§12 both headline risks retired**, replaced with the three that remain:
  fixture discipline, shared blind spots, and silent soundness holes.
