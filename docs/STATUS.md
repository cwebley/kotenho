# Status and Open Items

**Last updated:** 2026-08-13
**Purpose:** a durable register of what is done and what is not. `DESIGN.md` is
the plan; this is the ledger. When the two disagree, this file is newer.

```
185 tests passing   ·   36 curated fixtures, 36/36 cross-checked
31 commits          ·   9/9 generator specs at 100% answer-key agreement
```

---

## 1. Where the milestones stand

| | Milestone | State |
|---|---|---|
| M0 | Scorer conformance | **done** — except the ruleset config object (§3.6) |
| M1 | Convergence spike | **done** — verdict **go** (§2.2) |
| M2 | Core library, structural constraints | **works end to end**; no `analyze()`, no kokushi |
| M3 | Static engine v2 + `analyze()` | not started |
| M4 | Yaku templates + exact policy | not started — **the next milestone** |
| M5 | Scorer yaku extension | **done** — full standard set bar nagashi mangan |
| M6 | Dora planner | not started — generator emits no dora at all |
| M7 | Ambiguity machinery | `requireUnambiguousWait` + diagnostic flags done |
| M8 | Variety and batches | not started |
| M9 | Ruleset config, docs, perf | not started |

---

## 2. What was accomplished

### 2.1 `riichi-score` went from 6 detectable yaku to the full standard set

Started with tanyao, pinfu, yakuhai, menzen-tsumo, chiitoitsu, kokushi. Now
also: riichi, double-riichi, ippatsu, haitei, houtei, rinshan, chankan,
iipeiko, ryanpeikou, sanankou, suuankou, toitoi, honitsu, chinitsu, chanta,
junchan, honroutou, sanshoku doujun, sanshoku doukou, ittsuu, shousangen,
sankantsu, daisangen, shousuushii, daisuushii, tsuuiisou, chinroutou,
ryuuiisou, chuuren poutou, suukantsu, tenhou, chiihou.

**Only nagashi mangan is missing**, and `SPEC.md` §9 puts it out of scope.

A pattern held throughout and is worth remembering: **never add a yaku without
the one that subsumes it.** iipeiko needs ryanpeikou, sanankou needs suuankou,
honitsu needs chinitsu, chanta needs junchan and honroutou. Adding only the
lesser one is worse than adding neither — it converts "missing yaku" into
"confidently wrong yaku".

### 2.2 Correctness bugs found and fixed in `riichi-score`

| Bug | Effect |
|---|---|
| Ankan scored as open | Kan fu halved; menzen tsumo and the closed-ron bonus denied |
| Ron-completed triplet scored as concealed | 2–4 fu wrong on every shanpon ron |
| Chiitoitsu 25 fu rounded to 30 | Every chiitoi hand mis-scored |
| Chiitoitsu got no other yaku | chiitoi + tanyao scored 2 han instead of 4 |
| No kuipinfu 30-fu floor | Open all-run hands scored 20 fu |
| Riichi never emitted; ura counted without it | Riichi hands 1+ han short |
| No 4-copy validation | A hand with five of a tile scored as valid |
| Kokushi emitted as `han: 13` | Yakuman conflated with a han count |
| Yaku-less hands reported `valid: true` | Consumers crashed on an empty array |
| **Honors parsed as a run** | `5z6z7z` read as a sequence — **over-scored** a hand by a full limit tier |
| Composite yakuman capped at double | Triple yakuman under-paid by 32,000 |

The honor-run bug is the one to remember. Every other bug **under**-scored;
that one **over**-scored, which is worse — a learner who answers correctly gets
marked wrong with no way to tell the app is the confused party. It was also the
only bug that no curated fixture would ever have caught, because you have to
already suspect honors could form runs to think of testing it. Two independent
implementations found it in minutes.

### 2.3 The generator exists and works for structural lessons

`packages/riichi-hand-generator`: seeded RNG, skeleton enumeration with fu as a
pure function of shape, exact structural lookup, tile assignment under the
4-copy limit, and a comparator using tied-top-set semantics.

Working today: fu, wait type, open-meld count, kan count, win method, round and
seat wind, chiitoitsu. Deterministic from a seed. Impossible specs return
proofs with reasons rather than timing out.

### 2.4 M1 measured the architecture rather than assuming it

- **Convergence:** 300/300 hands on every spec, 1–10 attempts each. Bet retired.
- **Zero planner defects** across ~9,000 attempts — the fu model and the scorer
  never disagreed on a hand the generator built.
- **Answer-key agreement went 58–95% → 100%** on all nine specs as detectors
  landed.
- **The kan-region fu/han collision question is closed:** 0 true collisions in
  4,362 multi-reading hands. `requireUnambiguousWait` alone is correct; the
  four-dimension flag stays dropped.

The measurement that mattered most: **convergence speed says nothing about
correctness.** "40 fu closed tsumo" converged in exactly one attempt while
getting the han wrong 37% of the time — fast precisely *because* the scorer
wasn't scrutinising it.

### 2.5 Infrastructure

Monorepo (`kotenho`) with two published packages and two private ones, lint
rules enforcing the single-scoring-authority boundary, 36 hand-verified
fixtures, and a reference scorer that models melds, kans and declared yaku.

---

## 3. Open items

Ordered by consequence, not by effort. Items 3.4 onward are the ones most
likely to be forgotten.

### 3.1 M4 — yaku templates and the exact policy *(next)*

The generator cannot *request* yaku; it takes whatever falls out. This blocks
every content lesson: "Recognise pinfu", "sanshoku + tanyao + pinfu", yakuman
drills, and the exclusivity guarantee the project was premised on.

Needs: `YakuTemplate` records (`DESIGN.md` §3.3) feeding the skeleton planner,
tile assigner and static engine from one source; automatic-yaku statics;
anti-yaku biases; `yakuPolicy: "exact" | "atLeast"`.

**Build the bias layer around iipeiko first** — measured at 33.1% of fills on a
tanyao-constrained pinfu spec, several times everything else combined. The
priority order in `DESIGN.md` §9 was derived from pinfu-shape sampling and does
not survive contact with fu-constrained specs.

The "enforceability gate" in the design is now close to a no-op: it existed to
refuse `"exact"` specs the scorer could not police, and coverage is complete.

### 3.2 M6 — dora

The generator emits no dora indicators at all, so han is yaku-only.

**Coupled to M4:** `han = yaku han + dora`, and with the yaku set pinned, dora
is the slack variable that reaches an exact han target. M4 alone gives "exactly
these yaku"; **"exactly 3 han" needs both.**

Two findings already established and easy to lose:
- `doraIndicatorCount` is a property of the **table**, not the winner's hand —
  any player's kan flips an indicator, so a kan-free hand can face several.
- The **distribution** matters pedagogically. A learner should sometimes see two
  dora in the pair and sometimes one in each of two groups. Enumerate patterns
  and sample across them; taking the first solution biases every hand the same
  way (measured: 21 ways to put both in the pair vs 9 per spread pattern).

### 3.3 M3 — `analyze()`

No way for a lesson author to ask "is this possible, and will it produce varied
hands?" without calling `generate` and seeing what happens. An over-constrained
spec silently yields the same hand forever.

### 3.4 Kokushi is missing from the generator's skeleton model

**This is a live soundness bug, not a gap.** The static engine treats an empty
skeleton set as a *proof* of impossibility, so a kokushi spec would be reported
`unsatisfiable` when it is perfectly possible.

Exactly the bug already fixed for chiitoitsu, in the same place, still present
for the other non-standard shape. Fix alongside M4, since yakuman lessons will
want it anyway.

### 3.5 Unsatisfiable reasons blame the wrong constraint

`{fu: 30, closed: true, winMethod: "ron", waitType: "kanchan"}` reports *"no
hand shape scores exactly 30 fu"*. True, but the real story is that 30-fu closed
ron forces pinfu, and pinfu forces a ryanmen wait.

Filters run in order and whichever empties the candidate set takes the blame.
Since these strings are UI-facing and are the whole point of proving
impossibility rather than timing out, they should name the interaction.

### 3.6 Ruleset configuration object

`DESIGN.md` §9 finding 6, never built. It has real customers waiting:

- kuitan (open tanyao) on/off
- double-wind pair 2 fu vs 4
- kiriage mangan
- **single-hand double yakuman** — kokushi 13-wait, suuankou tanki, chuuren
  9-wait. Researched and deliberately **not** implemented: these are local
  rules, so leaving them single is the correct standard default rather than a
  placeholder. Composite yakuman stacking (implemented) is the standard rule and
  is a different thing.
- aka dora count

### 3.7 Yakuman representation in `han` — decided partly, still open

`DESIGN.md` §13.3 carries the detail. Settled: payouts verified at 32,000 /
48,000 for a single yakuman, and `limit` derives from a **count** so composite
yakuman pay `8000 × N`.

Still open: what `han` should report on a limit hand. It currently carries dora,
so a kokushi with two dora reads `han: 1, limit: "yakuman"` — the payout is
right, the number is misleading.

**New constraint from the yakuman work:** the representation must carry a
*count*, not a tier name. Tiers are unbounded in principle (a triple is
reachable, and we built one) while the payout is plain multiplication. A
`han: number | "yakuman"` union will not survive it.

**Deadline:** before the coach app renders a scoring result. Nothing consumes
`han` yet, which is the only reason it is deferrable.

### 3.8 The reference scorer needs a written expiry

`internal/reference-scorer` is a **temporary measurement instrument**, not
permanent infrastructure — that was agreed but never written into its README.
Without a stated exit condition, a temporary thing quietly becomes permanent.

Caveat worth recording: the yakuman detectors were written into *both* scorers
in one sitting from the same understanding, which weakens the independence
argument for that batch specifically. Differential testing between them will
catch implementation slips there but not a rule misread twice. The hand-verified
fixtures are the real oracle, and they are thinner for yakuman (4 fixtures
covering 12 yaku) than for fu.

### 3.9 `DESIGN.md` is stale

Calls M1 pending, carries the overturned M5 priority order, lists fixed bugs as
open, describes coverage as 6 of 25, and still calls differential testing
"non-negotiable" after that was superseded by curated fixtures.

Matters because **M4 is the first milestone whose design lives in that document
rather than in code** — the templates, bias layer and static rules are all
specified there. Building against the stale version is how the wrong priority
order gets reintroduced.

### 3.10 Smaller items

- `"test": "vitest"` in `riichi-score` is watch mode by default; works in CI
  only because vitest detects non-TTY. `vitest run` is the explicit form.
- `repository` in `riichi-score/package.json` points at the monorepo but the
  standalone GitHub repo is still live and unarchived.
- `riichi-score@1.0.7` has not been published from the new location, so the
  `prepack` pipeline is unverified against a real publish.
- Two early commits carry `Co-Authored-By` trailers, since removed from practice.
- `nagashi mangan` unimplemented (out of scope per `SPEC.md` §9).
