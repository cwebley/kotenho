# Status and Open Items

**Last updated:** 2026-08-14
**Purpose:** a durable register of what is done and what is not. `DESIGN.md` is
the plan; this is the ledger. When the two disagree, this file is newer.

```
199 tests passing   ·   36 curated fixtures, 36/36 cross-checked
35 commits          ·   9/9 generator specs at 100% answer-key agreement
25 of 41 yaku requestable by the generator; all 41 enforceable as exclusions
```

---

## 1. Where the milestones stand

| | Milestone | State |
|---|---|---|
| M0 | Scorer conformance | **done** — except the ruleset config object (§3.5) |
| M1 | Convergence spike | **done** — verdict **go** |
| M2 | Core library, structural constraints | **done** — kokushi closed the last soundness hole |
| M3 | Static engine v2 + `analyze()` | partial: static rules are rich, `analyze()` unbuilt |
| M4 | Yaku templates + exact policy | **done** (§2.5) |
| M5 | Scorer yaku extension | **done** — full standard set bar nagashi mangan |
| M6 | Dora planner | not started — **the next milestone** (§3.1) |
| M7 | Ambiguity machinery | `requireUnambiguousWait` + diagnostic flags done |
| M8 | Variety and batches | not started |
| M9 | Ruleset config, docs, perf | not started |

---

## 2. What was accomplished

### 2.1 `riichi-score`: 6 detectable yaku → the full standard set

Only nagashi mangan is missing, and `SPEC.md` §9 puts it out of scope.

A pattern held four times and is worth remembering: **never add a yaku without
the one that subsumes it.** iipeiko needs ryanpeikou, sanankou needs suuankou,
honitsu needs chinitsu, chanta needs junchan and honroutou. Adding only the
lesser one is worse than adding neither — it turns a missing yaku into a
confidently wrong one.

### 2.2 Thirteen correctness bugs fixed

Ankan scored as open · ron-completed triplets scored concealed · chiitoitsu 25 fu
rounded to 30 · chiitoitsu denied its other yaku · no kuipinfu floor · riichi
never emitted · ura counted without riichi · no 4-copy validation · kokushi as
`han: 13` · yaku-less hands reported `valid: true` · **honors parsed as a run** ·
composite yakuman capped at double · indicators excluded from the 4-copy check.

Two worth remembering:

- **The honor-run bug** (`5z6z7z` read as a sequence) **over**-scored where every
  other bug under-scored. That is worse: a learner who answers correctly gets
  marked wrong with no way to tell the app is the confused party. No curated
  fixture would ever have caught it — you have to already suspect honors could
  form runs to think of testing it.
- **Composite yakuman stack** at `8000 × N` (standard). Single-hand doubles
  (kokushi 13-wait, suuankou tanki) are deliberately **not** applied: those are
  local rules, so leaving them single is the correct default, not a placeholder.

### 2.3 M1 measured the architecture instead of assuming it

- 300/300 hands per spec at 1–10 attempts. Bet retired.
- **Zero planner defects** across ~9,000 attempts.
- Answer-key agreement 58–95% → **100% on all nine specs**.
- Kan-region fu/han collision question closed: 0 collisions in 4,362 hands.

The finding that generalises: **convergence speed says nothing about
correctness.** "40 fu closed tsumo" converged in one attempt while getting han
wrong 37% of the time — fast precisely *because* the scorer was not scrutinising
it.

### 2.4 The generator works for structural lessons

Seeded and deterministic, with proofs rather than timeouts for impossible specs.
Covers fu, wait type, open melds, kans, win method, winds, chiitoitsu, kokushi.

### 2.5 M4: yaku constraints and exclusivity

`generate({ yaku: ["tanyao", "pinfu"] })` returns a hand with **exactly** those
yaku, checked across the whole tied-top set. 25 yaku are requestable; all 41 are
enforceable as exclusions.

Contradictions come back as reasons, not timeouts — including `tanyao + ittsuu`,
which the composition spike found by grinding 60,000 attempts before it was
added to the table (ittsuu needs 1-2-3 and 7-8-9 runs; both carry terminals).

**The measurement that shaped the design.** Compound specs were profiled three
ways:

```
                              naive     aware     +bias
tanyao + pinfu               12.89%    61.20%    95.19%
tanyao + pinfu + sanshoku    31.61%    79.79%   100.00%
honitsu + pinfu               1.14%    31.19%    88.31%
```

Sequential placement works, but only if each placer draws from a domain the
others have already narrowed. Full constraint propagation is unnecessary.

**Then a second, larger finding.** "menzen-tsumo and nothing else" took a mean of
53 attempts. The contaminant histogram explained it: **sanankou 38% + suuankou
27%**. Those are not tile accidents — a skeleton with four concealed triplets
*is* suuankou before any tile is chosen. The generator was filtering skeletons by
what required yaku *need* and never by what excluded yaku *force*.

```
                     before          after
menzen-tsumo only    mean 53         mean 1, p90 1, max 5
riichi only          mean 40         mean 1, p90 1, max 7
```

**Exclusion is a shape-level operation, not only a tile-level one.** That is the
single most useful thing M4 taught.

---

## 3. Open items

Ordered by consequence. Items 3.4 onward are the ones most likely to be
forgotten.

### 3.1 M6 — dora *(next)*

The generator emits no dora indicators at all, so han is yaku-only.

**Coupled to M4:** `han = yaku han + dora`, and with the yaku set pinned, dora is
the slack variable that reaches an exact han target. M4 gives "exactly these
yaku"; **"exactly 3 han" needs M6.**

Two findings already established and easy to lose:

- `doraIndicatorCount` is a property of the **table**, not the winner's hand —
  any player's kan flips an indicator, so a kan-free hand can face several.
- The **distribution** matters pedagogically. Enumerate placement patterns and
  sample across them; taking the first solution biases every hand the same way
  (measured: 21 ways to put both dora in the pair vs 9 per spread pattern).

### 3.2 M3 — `analyze()`

No way to ask "is this possible, and will it produce varied hands?" without
calling `generate`. An over-constrained spec silently yields the same hand.

The static rules underneath it are now substantial — templates, incompatibility,
forced yaku, shape exclusion — so this is mostly surfacing what exists plus the
Monte-Carlo yield probe.

### 3.3 Sixteen yaku are excludable but not requestable

`chanta`, `junchan`, `honroutou`, `shousangen`, and the yakuman family have
templates but no placer, so `generate({ yaku: ["chanta"] })` is refused with a
reason. They are fully policed as exclusions; they just cannot be aimed at.

Chanta/junchan are the most likely to be wanted by a lesson.

### 3.4 haitei and houtei are advertised but unreachable

Marked `requestable: true`, and now correctly constrained to tsumo/ron skeletons
— but the generator has no way to set the game-state flag, so the yaku never
appears and the spec **exhausts**. Either they get spec flags as riichi did, or
they should be marked `requestable: false`. Advertising something that always
fails is the worst of the three options.

### 3.5 Ruleset configuration object

`DESIGN.md` §9 finding 6, never built. Real customers waiting: kuitan,
double-wind pair 2 vs 4 fu, kiriage mangan, aka dora count, and **single-hand
double yakuman** (researched, deliberately not implemented — see §2.2).

### 3.6 The incompatibility table is hand-written and untested

~80 declared pairs, no test behind them. This is the one place a template error
causes a **false impossibility** — a spec refused that was actually satisfiable —
because `checkYakuFeasibility` returns before any hand is built, so no verifier
can correct it.

Known suspect: **`tanyao × ryuuiisou`**. The green tiles are `2s 3s 4s 6s 8s` and
hatsu, but hatsu is *optional* — a ryuuiisou hand without it is entirely simples,
so it is also tanyao. Harmless today only because ryuuiisou is a yakuman and
suppression covers it, but the reason string would blame the wrong thing.

The fix is a fuzz: for every pair marked incompatible, try hard to build a hand
with both; anything found is a wrong entry. That is `DESIGN.md` §11.3's soundness
fuzz, still unbuilt.

Related: the lists are **asymmetric** — pinfu names chanta, chanta does not name
pinfu. Behaviour is right because the check tests both directions, but reviewing
one entry tells you nothing. Worth normalising at build time.

### 3.7 The skeleton exclusion filter is the other lost-hands surface

Same class as §3.6 and newly created by M4. A `shapeGuarantees` entry that is too
broad silently deletes valid shapes rather than merely wasting attempts.

It bit once already: requesting `suuankou` excluded every skeleton that could
deliver it, because four concealed triplets also satisfies sanankou's shape. Fixed
with a `subsumes` field plus a rule that a requested yakuman skips exclusion
entirely. There is a test for that case now; there is no general test.

### 3.8 The reference scorer needs a written expiry

`internal/reference-scorer` is a **temporary measurement instrument**, not
permanent infrastructure — agreed but never written into its README.

Caveat worth recording: the yakuman detectors were written into *both* scorers in
one sitting from the same understanding, which weakens the independence argument
for that batch. Differential testing catches implementation slips there, not a
rule misread twice. Fixture coverage for yakuman is thin — 4 fixtures, 12 yaku.

### 3.9 Smaller items

- Unsatisfiable reasons blame whichever filter emptied the set, not the
  interaction: `{fu:30, closed, ron, kanchan}` says "no shape scores 30 fu" when
  the real cause is that 30-fu closed ron forces pinfu, which forces ryanmen.
- `"test": "vitest"` in `riichi-score` is watch mode by default; works in CI only
  because vitest detects non-TTY. `vitest run` is the explicit form.
- `riichi-score@1.0.7` has not been published from the monorepo, so the `prepack`
  pipeline is unverified against a real publish. The standalone GitHub repo is
  still live and unarchived.
- Two early commits carry `Co-Authored-By` trailers, since dropped from practice.
- `nagashi mangan` unimplemented (out of scope per `SPEC.md` §9).
