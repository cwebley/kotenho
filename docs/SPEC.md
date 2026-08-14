# riichi-hand-generator — Problem Specification

**Status:** draft · problem definition only
**Scope of this document:** what we are building and why it is hard. It defines the
problem, the domain knowledge required to reason about it, and the contract the
library must satisfy. It deliberately contains **no implementation approach** —
no algorithms, no data structures, no search strategy. Those belong in a
separate design document.

---

## 1. Purpose

A library that generates randomized, valid, completed Riichi Mahjong winning
hands satisfying caller-supplied scoring and structural constraints.

The caller describes a *scoring exercise*; the library returns a hand that is an
instance of that exercise, together with enough metadata to present it to a
learner and grade their answer.

The important framing: **this is a constrained scoring-exercise generator, not a
random hand generator.** Producing a legal winning hand is easy. Producing a
legal winning hand that is worth *exactly* 3 han and 30 fu, has *exactly*
tanyao and pinfu and nothing else, and is won on a *ryanmen* wait — that is the
problem.

---

## 2. Target User and Use Cases

The primary consumer is **riichi-scoring-coach**, a front-end learning course.
Lessons are built around a constraint set, and the generator supplies unlimited
fresh practice instances for that lesson.

Representative lessons:

| Lesson | Constraint shape |
|---|---|
| "Count fu on dealer hands" | fixed fu, seat wind = round wind |
| "Chiitoitsu drills" | hand shape = chiitoitsu |
| "Recognise pinfu" | required yaku = pinfu, exclusive |
| "Hands with an open kan" | at least one open kan present |
| "Score exactly 30 fu" | fu = 30 |
| "Yakuman recognition" | yakuman required |
| "Mixed practice" | loose or no constraints, randomized |
| "Identify the wait" | wait type constrained, answer must be unambiguous |

Secondary consumers: anyone building riichi tooling that needs hands with known
properties (test fixtures, tutorials, puzzle content).

---

## 3. Problem Statement

A Riichi hand is not merely a set of 14 tiles. Its value is the output of an
**interpretation process**, not a property that can be read off the tiles.

Three facts make this hard.

**3.1 Score is interpretation-dependent.**
The same 14 tiles can often be decomposed into groups in several valid ways, and
different decompositions yield different yaku, different fu, and different wait
types. A hand does not "have" pinfu — a scorer *decides* it has pinfu after
choosing among competing readings. The generator therefore cannot reason about
the score of the tiles it is placing; it can only reason about the score of a
*reading* of those tiles, which may not be the reading that ultimately governs.

**3.2 Constraints interact.**
Han, fu, yaku, wait type, open/closed state, winds, and dora are not independent
knobs. A required yaku can force a wait type. A wait type can change fu. Seat
wind can change both han and fu. Winning by tsumo on a closed hand *forces* an
additional yaku into existence. Satisfying one constraint routinely invalidates
another.

**3.3 Yaku appear by accident.**
Tiles chosen to satisfy one requirement frequently satisfy others unintentionally.
A hand built for tanyao may also be sanshoku; a hand built with four runs may
also be iipeiko. In our own sampling, roughly **40% of otherwise-valid randomly
filled pinfu hands acquired at least one unintended yaku**, most often iipeiko or
tanyao. If the caller asked for a hand with *only* pinfu, every one of those is
wrong — and wrong in the worst way, because the app would mark a learner's
correct answer as incorrect.

This last point is the crux of the product risk. **A scoring coach that teaches
wrong scores is worse than no coach at all.** Correctness is not a quality goal
here; it is the entire value proposition.

---

## 4. Mahjong Domain Reference

Everything in this section is standard riichi rules, recorded here so the spec is
self-contained.

### 4.1 Hand structure

A winning hand is 14 tiles in one of three shapes:

- **Standard** — four groups plus one pair. Nearly all hands.
- **Chiitoitsu** — seven distinct pairs. Closed only. Fixed 25 fu, 2 han.
- **Kokushi musou** — one each of all 13 terminals/honors plus any one duplicate.
  Closed only. Yakuman.

A **group** is one of:

- **Run (shuntsu)** — three consecutive tiles in one suit, e.g. `3m4m5m`.
  Honors cannot form runs.
- **Triplet (koutsu)** — three identical tiles.
- **Kan (kantsu)** — four identical tiles. Counts as one group but occupies four
  tiles; a replacement tile is drawn, so the hand still totals 14 "effective"
  tiles.

### 4.2 Tiles

- Three numbered suits: man (`m`), pin (`p`), sou (`s`), ranks 1–9.
- Honors (`z`): winds East/South/West/North (`1z`–`4z`), dragons
  white/green/red (`5z`–`7z`).
- **Terminals** = 1 and 9 of a numbered suit. **Simples** = 2–8.
  **Terminals-or-honors** ("yaochuuhai") groups them for fu purposes.
- **Exactly four copies of every tile exist.** This is a hard global constraint
  across the concealed hand, all melds, kan tiles, and all dora indicators.

### 4.3 Open vs. closed

A hand is **closed (menzen)** if the player has called no tiles from others.
Calls are:

- **Chi** — claim a discard to complete a run. Opens the hand.
- **Pon** — claim a discard to complete a triplet. Opens the hand.
- **Kan** — three forms:
  - **Ankan** (concealed kan) — declared from your own four tiles.
    **Does not open the hand.**
  - **Daiminkan** (open kan) — claims a discard. Opens the hand.
  - **Shouminkan** (added kan) — upgrades an existing pon. Opens the hand.

Openness matters enormously: it gates several yaku entirely, halves the han
value of others, and removes a 10-fu bonus.

### 4.4 Wait types

The wait is determined by what the 13-tile hand was waiting on and *where the
winning tile lands* in the final grouping.

| Wait | Shape | Example | Fu |
|---|---|---|---|
| **Ryanmen** | two-sided run wait | `3m4m` waits `2m`/`5m` | 0 |
| **Kanchan** | closed/middle wait | `3m5m` waits `4m` | 2 |
| **Penchan** | edge wait | `1m2m` waits `3m`; `8m9m` waits `7m` | 2 |
| **Shanpon** | two pairs, either completes | `3m3m` + `7p7p` | 0 |
| **Tanki** | single tile, pair wait | `5s` waits `5s` | 2 |

### 4.5 Winning method

- **Ron** — winning on another player's discard.
- **Tsumo** — winning on a self-draw.

The discarding player's seat matters for payment calculation.

### 4.6 Fu

Fu accumulate, then round **up** to the next multiple of 10.

```
base (futei)                                        20

menzen ron  (closed hand won by discard)           +10
tsumo       (any hand; not applied to pinfu)        +2

triplet, simples, open                              +2
triplet, simples, closed                            +4
triplet, terminals/honors, open                     +4
triplet, terminals/honors, closed                   +8

kan, simples, open                                  +8
kan, simples, closed                               +16
kan, terminals/honors, open                        +16
kan, terminals/honors, closed                      +32

pair of dragons                                     +2
pair of round wind                                  +2
pair of seat wind                                   +2
pair of double wind (round == seat)              +2 or +4   [ruleset]

kanchan / penchan / tanki wait                      +2
ryanmen / shanpon wait                               0
```

Special cases that override the above:

- **Chiitoitsu** is a flat **25 fu**, never rounded.
- **Pinfu closed, ron** = 30 fu. **Pinfu closed, tsumo** = 20 fu.
- **A triplet completed by ron scores as an *open* triplet**, even though the
  hand remains closed for all other purposes. This also means it does not count
  as a concealed triplet for sanankou/suuankou.
- An open hand that would otherwise total 20 fu is floored to **30 fu**
  ("kuipinfu"). *[ruleset-dependent]*

### 4.7 Han and points

```
basic points = fu × 2^(2 + han),  capped at 2000
```

Limit hands override the formula:

| Name | Han | Basic points |
|---|---|---|
| Mangan | 5 (or capped) | 2000 |
| Haneman | 6–7 | 3000 |
| Baiman | 8–10 | 4000 |
| Sanbaiman | 11–12 | 6000 |
| Yakuman | — | 8000 |

Payment: non-dealer ron = 4× basic; dealer ron = 6× basic; non-dealer tsumo =
2× from dealer and 1× from each other player; dealer tsumo = 2× from each.

### 4.8 Yaku

**A hand must contain at least one yaku to win.** Dora do not count as a yaku —
a hand consisting only of dora cannot win.

| Yaku | Closed | Open | Notes |
|---|---|---|---|
| Riichi | 1 | — | declared, closed only |
| Ippatsu | 1 | — | win within one go-around of riichi |
| Menzen tsumo | 1 | — | **automatic** on any closed tsumo |
| Pinfu | 1 | — | all runs, non-value pair, ryanmen wait |
| Iipeiko | 1 | — | two identical runs |
| Tanyao | 1 | 1 | all simples; open form ruleset-dependent (kuitan) |
| Yakuhai | 1 each | 1 each | triplet of dragons, round wind, or seat wind |
| Haitei / Houtei | 1 | 1 | win on last draw / last discard |
| Rinshan kaihou | 1 | 1 | win on kan replacement tile |
| Chankan | 1 | 1 | rob an added kan |
| Double riichi | 2 | — | riichi on first turn |
| Chiitoitsu | 2 | — | seven pairs |
| Toitoi | 2 | 2 | all triplets |
| Sanankou | 2 | 2 | three concealed triplets |
| Sanshoku doukou | 2 | 2 | same triplet in all three suits |
| Sankantsu | 2 | 2 | three kans |
| Honroutou | 2 | 2 | all terminals and honors |
| Shousangen | 2 | 2 | two dragon triplets + dragon pair |
| Sanshoku doujun | 2 | 1 | same run in all three suits |
| Ittsuu | 2 | 1 | 123/456/789 in one suit |
| Chanta | 2 | 1 | every group contains a terminal or honor |
| Ryanpeikou | 3 | — | two pairs of identical runs |
| Junchan | 3 | 2 | every group contains a terminal, no honors |
| Honitsu | 3 | 2 | one suit plus honors |
| Chinitsu | 6 | 5 | one suit, no honors |

Yakuman: kokushi musou, suuankou, daisangen, shousuushii, daisuushii,
tsuuiisou, chinroutou, ryuuiisou, chuuren poutou, suukantsu, tenhou, chiihou.
Several have "double yakuman" forms *[ruleset-dependent]*. A yakuman suppresses
normal yaku.

**Subsumption.** Some yaku absorb others and must not be double-counted:
ryanpeikou absorbs iipeiko; junchan absorbs chanta; chinitsu absorbs honitsu.
The generator and the scorer must agree on one canonical list.

**Yaku classes relevant to constraint satisfaction:**

- **Automatic** — forced by the situation, not chosen. Menzen tsumo, rinshan,
  haitei, houtei, chankan. *Any closed hand won by tsumo has menzen tsumo,
  whether you want it or not.*
- **Declared** — riichi, ippatsu, double riichi. Never appear by accident.
- **Structural** — everything else. Determined by the tiles and can appear
  unintentionally.

### 4.9 Dora

Dora are bonus han. They are **not yaku**.

- A **dora indicator** is a revealed tile; the dora is the *next* tile in
  sequence (9 wraps to 1; winds cycle E→S→W→N→E; dragons cycle
  white→green→red→white).
- Every copy of the dora tile in the hand is worth 1 han. Multiple indicators
  can point at the same tile and stack.
- **Kan dora** — each kan declared *by any player at the table* flips an
  additional indicator. **The number of indicators is a property of the table,
  not of the winner's hand.** A hand with no kans can still face several
  indicators. The total includes one initial indicator, so a winner with `K`
  kans needs at least `1 + K` visible indicators; extras can belong to others.
- **Ura dora** — a parallel set of indicators revealed only if the winner
  declared riichi. Same count as the regular indicators.
- **Aka dora** — designated red 5s, each worth 1 han. Structurally identical to
  a normal 5. *[ruleset-dependent: how many exist]*

### 4.10 Kōtenhō — the highest point principle

When a winning hand admits multiple valid interpretations, **the interpretation
yielding the highest final score is the one that counts.** The Japanese term is
高点法 (kōtenhō).

> 得点計算において、複数の解釈が成立する場合、最も点数が高くなるように計算しなければならない。
> この原則を高点法という。
> — *Japanese Wikipedia, 麻雀の得点計算*

Key properties:

- **Total points are compared** — not han alone, not fu alone. Han usually
  dominates because the formula is exponential in han, but the comparison is on
  the final score.
- **It governs wait interpretation.** The canonical example: with `3455`
  winning on `5`, reading it as tanki gives 2 more fu than reading it as a `2/5`
  ryanmen — so you take tanki. *Unless* pinfu applies, in which case 1 han
  outweighs 2 fu and you take ryanmen.
- **It is mandatory, not optional.** A player may not claim a lower reading even
  when a lower score would be strategically preferable.
- It is universal across Japanese rulesets — this is **not** a configurable
  option.

**The gap, which matters for us.** No source we could find — Japanese Wikipedia,
dedicated kōtenhō explainers, or competitive-play commentary — addresses what
happens when two interpretations produce *exactly the same score*.

That silence is structural rather than an oversight. Kōtenhō exists to determine
*the score*; the wait is only an intermediate step. Once two readings agree on
the score, the rule has done its job and is indifferent to which wait you name.

**Consequence: when two readings of a hand tie on points, both wait answers are
correct, and no authority says otherwise.** This is not rare. In our sampling,
hands containing a triplet had a score-tied alternative reading with a
*different wait type* roughly **28–37%** of the time. Example:

```
2p 3p 4m 4p 5m 5p 5p 6m 6p 7p 8p 8p 8p 8p     ron on 8p

  reading 1:  6p7p8p  8p8p8p + 5p5p     shanpon
              triplet completed by ron -> scores open, 2 fu
              20 + 10 + 2 = 32 -> 40 fu

  reading 2:  6p7p8p  8p8p8p + 5p5p     ryanmen
              held 6p7p waiting 5p/8p; triplet stays concealed, 4 fu
              20 + 10 + 4 = 34 -> 40 fu
```

Same tiles, same decomposition, same 40 fu, same 1 han. There are four `8p` in
the hand and which one completed it is genuinely undetermined.

This drives a hard requirement — see §7.1.

### 4.11 Winds

Each hand has a **round wind** and a **seat wind**. The player whose seat wind is
East is the **dealer**, who scores more and pays more. When round and seat wind
coincide (East seat in East round), a triplet of that wind scores *two* yakuhai,
and the pair scores double-wind fu.

### 4.12 Ruleset variation

Riichi has no single official ruleset. Known points of divergence that the
library must eventually accommodate:

- Double wind pair: 2 fu or 4 fu
- Kuitan: is open tanyao allowed
- Kuipinfu: is the open 20-fu hand floored to 30
- Kiriage mangan: is 4 han 30 fu / 3 han 60 fu rounded up to mangan
- Kazoe yakuman: does 13+ han count as yakuman
- Double yakuman: recognised or flattened to single
- Aka dora count
- Chiitoitsu vs. ryanpeikou precedence conventions

**Requirement:** ruleset differences must be expressed as a configuration
object, not scattered through the code. v1 may hardcode one ruleset, but the
divergence points must be locatable in one place.

---

## 5. The API Contract

### 5.1 Generation

```
generate(spec, options?) -> Result
```

The library must accept a declarative description of an exercise and return a
hand that is an instance of it. The caller never describes *how* to build the
hand, only what it must be true of.

**Spec inputs — hand content**

| Field | Meaning |
|---|---|
| `yaku` | The yaku the hand must have |
| `yakuPolicy` | `"exact"` (default) — the hand has these and **no others**; `"atLeast"` — these plus anything |
| `han` | Exact value, or a `{min, max}` range |
| `fu` | Exact value, or a `{min, max}` range |
| `handShape` | standard / chiitoitsu / kokushi, if constrained |

**Spec inputs — structure**

| Field | Meaning |
|---|---|
| `closed` / `openMeldCount` | Whether and how much the hand is opened |
| `kans` | Count and types (ankan / daiminkan / shouminkan) |
| `waitType` | ryanmen / kanchan / penchan / shanpon / tanki |
| `winMethod` | ron / tsumo |

**Spec inputs — situation**

| Field | Meaning |
|---|---|
| `roundWind`, `seatWind` | A fixed direction or allowed direction list; omitted rounds sample East/South, omitted seats sample all four winds |
| `doraCount` | Total dora han in the hand |
| `doraIndicatorCount` | How many indicators are face up — **independent of the hand's own kan count** |
| `uraDoraCount`, `akaDoraCount` | If modelled |
| `riichi`, `ippatsu`, `haitei`, … | Declared and situational flags |
| `ruleset` | `RulesetOptions` overrides for the scoring variant |

**Options**

| Field | Meaning |
|---|---|
| `seed` | Deterministic output for a given seed — required for reproducible lessons and testable behaviour |
| `requireUnambiguousWait` | Reject hands whose wait is not uniquely determined (see §7.1) |
| `count` | Generate a batch of distinct normalized hands; return a partial batch with an explicit shortfall rather than repeats |

**Result** must distinguish two failure modes:

- **Unsatisfiable** — the spec is provably impossible, with a human-readable
  reason (`"pinfu requires a ryanmen wait"`). The coach app should be able to
  surface this in a lesson-authoring UI.
- **Exhausted** — no hand found within budget, but not proven impossible.

For a batch, an **Exhausted** result means no hand was found. A **Shortfall**
result carries the distinct hands found, but fewer than requested, after the
shared batch budget ran out. It must not claim that no other hands exist.

These are different facts and the caller must be able to tell them apart.

### 5.2 Feasibility check

```
analyze(spec) -> Feasibility
```

The library must be able to answer *"is this lesson possible?"* **without
generating a hand**, and should report an indication of how large the solution
space is.

Rationale: a lesson author needs to know both that a configuration is valid and
that it will yield varied hands. An over-constrained spec that technically has
one solution produces a drill showing the same hand forever, which is a silent
failure the caller cannot otherwise detect.

### 5.3 Output shape

A returned hand must carry everything needed to both **present** the exercise and
**grade** it:

- The concealed tiles, the melds (with call type and source seat), and the
  winning tile
- The full game state — winds, all dora indicators, ura indicators, honba
- The intended grouping: which tiles form which group, which group the winning
  tile completed
- The complete scoring breakdown: yaku list with han values, itemised fu with
  reasons, raw fu, rounded fu, total han, basic points, per-seat payments
- All alternative interpretations, with their scores
- Metadata: seed, and flags for any ambiguity present

The alternative interpretations are not optional. The most valuable feedback a
scoring trainer can give is *"you scored the other reading of this hand — here
is why it is worth less."*

---

## 6. Validity Requirements

A returned hand is correct only if all of the following hold.

1. **Legal hand.** 14 effective tiles, a valid winning shape, no more than four
   copies of any tile across concealed tiles, melds, kan tiles, and every dora
   and ura indicator.
2. **Legal win.** At least one yaku. Melds consistent with their call types.
   The winning tile can complete the hand in the stated way.
3. **Score matches the spec.** Han and fu as requested, under the specified
   ruleset, as determined by kōtenhō — i.e. measured on the *canonically scored*
   interpretation, never on whichever reading the generator had in mind.
4. **Yaku set matches the spec.** Under `"exact"` policy, the canonical yaku
   list equals the requested set — after subsumption is applied. No extras.
5. **Structure matches the spec.** Wait type, open meld count, kan configuration,
   win method as requested.
6. **The answer key is correct.** The breakdown returned must be the score a
   correct human scorer would produce.
7. **Randomized.** Repeated calls with the same spec and different seeds return
   materially different hands, not cosmetic variations of one hand.

---

## 7. Important Edge Cases

### 7.1 Ambiguous waits

Per §4.10, a hand can have two readings that tie on score but differ on wait
type, and both are correct. This is common — roughly a third of triplet-bearing
hands in our sampling.

**Requirements:**

- A `waitType` constraint is **not self-enforcing**. Hands whose wait is not
  uniquely determined must be filterable out.
- Lessons that ask "what is the score?" are unaffected and need no filtering.
- Lessons that ask "what is the wait?" must use only hands with a unique wait,
  or must accept every tied answer as correct.
- The output must flag when ambiguity is present so the caller can decide.

### 7.2 Exclusivity conflicts with automatic yaku

Automatic yaku (§4.8) are forced by the situation and cannot be declined.

```
{ yaku: ["tanyao"], closed: true, winMethod: "tsumo" }   // impossible
```

Any closed tsumo has menzen tsumo. Under `"exact"` policy this spec is
unsatisfiable, and the library must say so rather than search fruitlessly. The
same applies to rinshan (winning on a kan replacement), haitei, houtei, and
chankan.

### 7.3 Yaku that constrain structure

Some yaku imply structural facts, so pairing them with a conflicting structural
constraint is a static contradiction:

- pinfu implies a ryanmen wait, four runs, a non-value pair, and a closed hand
- chiitoitsu implies 25 fu, closed, and a tanki wait
- toitoi implies no runs, therefore no ryanmen/kanchan/penchan wait
- tanyao excludes chanta, junchan, honroutou, kokushi, and any yakuhai

These must be reported as unsatisfiable with a reason, not discovered by
timeout.

### 7.4 Dora feasibility

Dora are bounded by tile multiplicity and indicator count.

- `doraCount ≤ doraIndicatorCount` is trivially satisfiable.
- Beyond that, the hand needs repeated tiles. Every standard hand has a pair, so
  up to `2 × doraIndicatorCount` is nearly always reachable.
- Higher targets require a tile appearing three or four times — a triplet, a
  kan, repeated runs, or overlapping runs — which constrains hand structure.
- Indicators are physical tiles and count against the four-copy limit.
- Ura dora exist only if riichi was declared.

**The distribution of dora also matters pedagogically.** A learner should
sometimes see both dora in the pair, and sometimes one dora in each of two
groups. The library must be capable of producing both, not just whichever it
finds first.

### 7.5 Kans

Kans are the largest single source of fu (up to 32) and interact widely:
they add dora indicators, ankan preserves a closed hand while daiminkan and
shouminkan do not, and a kan occupies four physical tiles against the
four-copy limit.

### 7.6 Over-constrained specs

A spec may be satisfiable but have very few solutions. The library must not
silently return the same hand repeatedly; see §5.2.

### 7.7 Winning tile in an open meld

A hand cannot be won on a tile that forms part of a previously called meld,
except via chankan (robbing an added kan) or rinshan (winning on the replacement
after a kan).

---

## 8. Dependency: riichi-score

Scoring is **not** re-implemented in this library. The existing
[`riichi-score`](https://github.com/cwebley/riichi-score) package is the single
source of truth for what a hand is worth.

### 8.1 What it provides

```js
import { calculate, createGameState } from "riichi-score";

const result = calculate({
  closedTiles: ["1m", "2m", "3m", ...],
  openMelds:   [{ type: "set", tiles: ["6z","6z","6z"], from: "north" }],
  winningTile: { tile: "7z", from: "north" },   // or { tile, isTsumo: true }
  gameState:   createGameState({ roundWind, seatWind, doraIndicators, ... }),
});
```

It returns a `HandAnalysis`:

- `valid`, `errors`
- `handInterpretations[]` — **every** valid reading of the hand, each carrying
  its own grouping, wait type, yaku list, itemised fu breakdown, raw and rounded
  fu, han, dora/ura/aka counts, basic points, and seat payments

Interpretations with no yaku are discarded, and the array is **sorted by basic
points descending** — which is kōtenhō (§4.10) implemented directly. The
canonical score of a hand is `handInterpretations[0]`.

### 8.2 Why this shape suits us

The generator needs to ask "what is this hand *actually* worth, and what are all
the other ways it could be read?" That is exactly what `calculate` returns. No
adapter layer or second scoring implementation is required.

### 8.3 Contract between the two libraries

- The generator's output is expressed in `riichi-score`'s own `HandInput` shape.
- The answer key is `calculate(handInput)` — not computed independently.
- **The generator never reports a score it derived itself.** One source of rules
  truth, no drift.

### 8.4 Known dependency: yaku coverage

`riichi-score` currently implements a subset of the standard yaku. This directly
bounds what this library can promise: **an exclusivity guarantee is only as
strong as the scorer's ability to detect the yaku being excluded.** If the
scorer cannot see sanshoku, a hand requested as "tanyao only" may contain
sanshoku and be accepted, and the coach app will mark a correct learner answer
as wrong.

Extending `riichi-score`'s yaku coverage is therefore a **prerequisite for the
`"exact"` yaku policy**, not an incremental enhancement. Structural constraints
(fu, wait, openness, kans) are unaffected and can be honoured before coverage is
complete.

---

## 9. Out of Scope for v1

- Multiple simultaneous rulesets in a single call — one configurable ruleset at
  a time
- Nagashi mangan
- Tenhou / chiihou (situational yakuman)
- Three-player riichi variants
- Generating *tenpai* (13-tile in-progress) hands — winning hands only
- Efficiency, safety, or discard-choice exercises — scoring only
- Multi-hand game states, honba/riichi-stick accumulation beyond what scoring
  needs
- Rendering, tile artwork, UI concerns

---

## 10. Open Design Decisions

1. **Yakuhai naming.** The scorer emits five distinct yakuhai names
   (`round-wind`, `seat-wind`, `haku`, `hatsu`, `chun`), and a double-wind
   triplet emits two entries. What does `yaku: ["yakuhai"]` mean in a spec, and
   what is the canonical form used for exclusivity comparison?

2. **Default ruleset.** Which variant is v1's baseline — Tenhou, WRC, EMA?

3. **Yakuman han representation.** Is a yakuman `han: 13`, or a distinct value
   type? How are double yakuman and kazoe yakuman expressed in a spec?

4. **Ranges vs. exact values.** Should `han` and `fu` accept ranges from day
   one, given ranges are far easier to satisfy and pedagogically adequate?

5. **Situational yaku as first-class constraints.** Should ippatsu, haitei,
   houtei, rinshan, and chankan be requestable in v1, or only modelled well
   enough to be *excluded*?

6. **Ura and aka dora.** First-class spec constraints in v1, or modelled by the
   scorer but not requestable?

7. **Batch semantics.** For `count: 20`, should the library guarantee 20
   *distinct* hands, and what does distinct mean — different tiles, or
   structurally different?

8. **Variety metric.** What exactly does `analyze` report about solution-space
   size, and how should a lesson-authoring UI use it?

---

## Appendix: Terminology

| Term | Meaning |
|---|---|
| Yaku | A scoring pattern. At least one is required to win. |
| Han | Doubling units. Yaku and dora both contribute han. |
| Fu | Minor points, from hand composition. Rounded up to the nearest 10. |
| Menzen | Closed — no tiles called from other players. |
| Agari | The winning tile / the win itself. |
| Tenpai | One tile away from winning. |
| Yaochuuhai | Terminals and honors, as a class. |
| Kōtenhō (高点法) | The rule that the highest-scoring interpretation governs. |
| Kuitan | Whether open tanyao is permitted. |
| Honba | Repeat-hand counter; adds a flat bonus to the win. |
