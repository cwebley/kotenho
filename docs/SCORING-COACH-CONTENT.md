# Scoring Coach Content Plan

This document describes the learning content, practice modes, exams, review
screens, and achievement model for a future riichi scoring coach. It is a
product/content plan, not an implementation plan.

The course takes inspiration from the scoring chapter on printed pages 140-162
of _Riichi Book I_, particularly its practical sequence: count han, determine
whether fu matters, then determine the payment. The coach must use original
wording, examples, and exercises.

## Learning Principle

Do not ask a learner to do every part of scoring at once. Build three distinct
skills, then combine them:

1. Identify yaku and count han.
2. Recognize or calculate fu.
3. Recall the appropriate payment.

Each lesson includes explanation, immediate-feedback practice, and a timed
exam. Passing an exam measures demonstrated performance rather than merely
having read the material.

## Course Structure

### Lesson 0: Yaku Foundations

Teach ordinary yaku before score tables or fu calculation.

- Yaku versus dora: dora adds han but cannot be the only reason a hand wins.
- Open versus closed han values.
- Common yaku: riichi, menzen tsumo, tanyao, yakuhai, pinfu, ippatsu,
  chiitoitsu, toitoi, sanshoku, ittsu, chanta, junchan, honitsu, chinitsu,
  honroutou, sanankou, shousangen, and ryanpeikou.
- Event/context yaku: double riichi, rinshan kaihou, chankan, haitei, houtei,
  tenhou, and chiihou.
- Dora, aka dora, and ura dora.

The Lesson 0 exam uses generated realistic table states. It asks only for the
total ordinary han; it does not ask for fu or the payment. The hand display and
table context are visible, but yaku labels and hints are hidden until results.

### Lesson 1: Yakuman Recognition

Yakuman is taught as its own category because its first question is not
ordinary han arithmetic or fu calculation.

Teach:

- Kokushi musou.
- Suu ankou.
- Daisangen.
- Shousuushii and daisuushii.
- Tsuuiisou.
- Chinroutou.
- Ryuuiisou.
- Chuuren poutou.
- Suukantsu.
- Tenhou and chiihou.
- Ruleset-defined double-yakuman variants, such as kokushi 13-sided wait,
  suu ankou tanki, junsei chuuren, and daisuushii where applicable.

Ryuuiisou needs a dedicated explanation and deliberately deceptive practice.
The permitted tiles are 2s, 3s, 4s, 6s, 8s, and the green dragon. Valid hands
can include sequences; a single 5s, 7s, 1s, 9s, or tile in another suit means
the hand is not ryuuiisou.

#### Counted Yakuman

Include counted yakuman (kazoe yakuman) as a sublesson within yakuman. It
requires a visible ruleset setting because treatment varies: some rules use
13+ han, some use a different threshold such as 15+, and some cap the hand at
sanbaiman instead. Practice and review for a counted yakuman show the complete
han breakdown, including dora and ura dora, followed by the rule that made the
hand yakuman.

Example review:

```text
Han:
Riichi          1
Tsumo           1
Sanshoku        2
Chinitsu        6
Dora            3
Ura dora        2
Total          15

Ruleset: 15+ han is counted yakuman
Correct answer: 1x Yakuman
Type: Counted yakuman
```

#### Yakuman Practice

Each topic ends in immediate-feedback practice using a common prompt:

```text
[ hand and table context ]

[ Not Yakuman ] [ 1x Yakuman ] [ 2x Yakuman ]
```

Feedback immediately reveals whether the answer was correct. For a yakuman,
it names the yakuman and multiplier. For a non-yakuman, it simply confirms
that the hand is not yakuman. Practice includes near misses, high-value
non-yakuman hands, and context-sensitive event yakuman.

#### Yakuman Exam

The exam uses the same three answers:

```text
[ Not Yakuman ] [ 1x Yakuman ] [ 2x Yakuman ]
```

It has a fixed, balanced, generated set of questions. It includes single
yakuman, double yakuman, counted yakuman where enabled, high-value
non-yakuman hands, obscure cases, and near misses. It gives no immediate
feedback; each answer advances directly to the next question.

Initially, exclude triple and quadruple yakuman from the exam pool. Preserve a
numeric multiplier in the future content/data model so rulesets that permit
them can be added without redesigning the concept.

### Lesson 2: Three-Step Scoring

Teach the core process:

1. Count han.
2. If the hand has four han or less, determine fu.
3. Determine the payment using han, fu, winner status, and winning method.

Early exercises ask only whether fu matters. A hand with five or more han
skips fu and proceeds directly to limit-hand scoring.

### Lesson 3: Limit Hands

Teach mangan, haneman, baiman, sanbaiman, and yakuman according to the active
ruleset. Use non-dealer mangan ron, 8000, as the main anchor. Teach the
relationships between limit tiers and the dealer/non-dealer and ron/tsumo
payment patterns rather than requiring a large isolated table.

### Lesson 4: 30 Fu

Begin with pure table recall, without a hand:

```text
30 fu · 2 han · non-dealer ron

[ 1000 ] [ 2000 ] [ 3900 ] [ 7700 ] [ mangan ]
```

Teach 30-fu columns in this order:

1. Non-dealer ron: 1000, 2000, 3900, 7700, mangan.
2. Dealer ron: 1500, 2900, 5800, 11600, mangan.
3. Non-dealer tsumo: 300-500, 500-1000, 1000-2000, 2000-3900.
4. Dealer tsumo: 500-all, 1000-all, 2000-all, 3900-all.

Then introduce guided generated hands that supply han and fu, followed by
mixed 30-fu practice.

#### Tsumo Answer Convention

Teach both the payment notation used at a table and the total value of the
hand. For example:

```text
Non-dealer tsumo: 1000-2000
The winner receives: 4000 total

Dealer tsumo: 2000-all
The winner receives: 6000 total
```

In chart-button practice, tsumo answers use ordinary table notation, such as
`1000-2000` or `2000-all`, because that is how a player announces the result
to the table. The explanation and feedback also state the full amount received.

In keypad-based scoring exams, the learner enters the total amount received by
the winner, such as `4000` or `6000`. The winning method is already inherent
in the displayed table state, so a single numeric response does not reveal new
information. It also avoids slowing every tsumo question with two separate
entries.

Every tsumo exam review shows both representations:

```text
Your answer: 4000
Correct payment: 1000-2000
Total received: 4000
```

This keeps the main exam brisk while still teaching the live-table skill of
announcing the two payment amounts in non-dealer-first order. A later optional
payment-announcement drill may ask directly for the table notation, but it is
not required for the core numeric scoring exams.

### Lesson 5: 40 Fu

Start with non-dealer ron:

```text
1300, 2600, 5200, mangan
```

Teach this as a memorable doubling sequence, then introduce dealer ron and
both tsumo columns. Contrast the 40-fu family with the familiar 30-fu family.

### Lesson 6: 20 Fu Pinfu Tsumo

Teach this as a special table:

- It applies only to pinfu tsumo.
- It has no ron column.
- It begins at two han.

The essential non-dealer tsumo sequence is 400-700, 700-1300, and 1300-2600.
Explicitly contrast 20-fu pinfu tsumo with a visually similar 30-fu tsumo
hand.

### Lesson 7: 25 Fu Chiitoitsu

Teach the fixed rule first:

```text
Chiitoitsu is always 25 fu.
```

Then teach its table and the fact that it begins at two han because chiitoitsu
is itself a two-han yaku.

### Lessons 8-14: Higher-Fu Score Tables

After 30, 40, 20, and 25 fu, teach every remaining standard fu row as a
separate score-table lesson:

```text
Lesson 8:  50 fu
Lesson 9:  60 fu
Lesson 10: 70 fu
Lesson 11: 80 fu
Lesson 12: 90 fu
Lesson 13: 100 fu
Lesson 14: 110 fu
```

These are not optional reference material. They are essential score-recall
practice and each has its own timed, rated exam. Exact-fu lessons later teach
when a row applies; these lessons make the row's payments automatic once the
fu total is known.

Every higher-fu lesson covers all legal payment forms:

- Non-dealer ron.
- Dealer ron.
- Non-dealer tsumo.
- Dealer tsumo.

Each starts with chart-button recall in one payment column, then mixes all
four forms, then runs a fixed exam. Tsumo buttons use live-table notation;
keypad exams use the winner's total received, as described in the tsumo answer
convention.

#### Lesson 8: 50 Fu

Teach the relationship to the 25-fu chiitoitsu table: doubling fu usually
shifts the same score one han lower. This makes 50 fu the bridge from common
fixed-fu hands to higher-fu recall.

```text
Han                 1       2       3       4+
Non-dealer ron      1600    3200    6400    mangan
Dealer ron          2400    4800    9600    mangan
Non-dealer tsumo    400-800 800-1600 1600-3200 mangan
Dealer tsumo        800-all 1600-all 3200-all mangan
```

#### Lesson 9: 60 Fu

Teach its relationship to the familiar 30-fu row: 60 fu at a given han has
the same value as 30 fu one han higher, subject to the mangan cap.

```text
Han                 1        2        3        4+
Non-dealer ron      2000     3900     7700     mangan
Dealer ron          2900     5800     11600    mangan
Non-dealer tsumo    500-1000 1000-2000 2000-3900 mangan
Dealer tsumo        1000-all 2000-all 3900-all mangan
```

#### Lesson 10: 70 Fu

This is the first row without a simple previously learned equivalent. Teach it
as direct recall, including the early mangan cap.

```text
Han                 1        2        3+
Non-dealer ron      2300     4500     mangan
Dealer ron          3400     6800     mangan
Non-dealer tsumo    600-1200 1200-2300 mangan
Dealer tsumo        1200-all 2300-all mangan
```

#### Lesson 11: 80 Fu

Teach the relationship to 40 fu: it is the same score family one han lower,
subject to the mangan cap.

```text
Han                 1        2        3+
Non-dealer ron      2600     5200     mangan
Dealer ron          3900     7700     mangan
Non-dealer tsumo    700-1300 1300-2600 mangan
Dealer tsumo        1300-all 2600-all mangan
```

#### Lesson 12: 90 Fu

Teach direct recall and the fact that this row reaches mangan at three han.

```text
Han                 1        2        3+
Non-dealer ron      2900     5800     mangan
Dealer ron          4400     8700     mangan
Non-dealer tsumo    800-1500 1500-2900 mangan
Dealer tsumo        1500-all 2900-all mangan
```

#### Lesson 13: 100 Fu

Teach the non-dealer one-han tsumo exception carefully: it is 800-1600, not a
simple continuation of the 90-fu row.

```text
Han                 1        2        3+
Non-dealer ron      3200     6400     mangan
Dealer ron          4800     9600     mangan
Non-dealer tsumo    800-1600 1600-3200 mangan
Dealer tsumo        1600-all 3200-all mangan
```

#### Lesson 14: 110 Fu

Teach only legal score cells. In particular, a 110-fu one-han tsumo does not
occur as a standard legal hand configuration. The lesson must not present a
button for an impossible cell.

```text
Han                 1       2        3+
Non-dealer ron      3600    7100     mangan
Dealer ron          5300    10600    mangan
Non-dealer tsumo    --      1800-3600 mangan
Dealer tsumo        --      3600-all mangan
```

### Lesson 15: Exact Fu

Teach fu sources incrementally:

- Base 20 fu.
- Closed ron: +10 fu.
- Tsumo: +2 fu, except pinfu tsumo.
- Set and kan values by open/closed and simple/terminal-or-honor status.
- Value-tile pairs.
- Closed, edge, and single waits.
- Rounding up to the next ten.

Then teach hands whose score changes with the exact winning tile, wait
interpretation, or whether a set is concealed. Connect each calculated total to
the already learned score-table row, including the higher-fu rows through 110.

### Lesson 16: Toitoi Fu

Teach toitoi after exact fu calculation, not as a memorized exception. The
lesson answers why 40 fu is common while making clear that it is not guaranteed.

Start from the invariant:

```text
Toitoi always has four triplets and one pair.
```

Then have the learner assemble the fu from the usual ingredients:

- Base 20 fu.
- Each open simple triplet: +2 fu.
- Each concealed simple triplet: +4 fu.
- Each open terminal/honor triplet: +4 fu.
- Each concealed terminal/honor triplet: +8 fu.
- A value-tile pair: +2 fu for each applicable value.
- A tanki wait: +2 fu.
- Tsumo: +2 fu.
- Round the total up to the next ten.

Explain that a standard all-simple open toitoi hand with a shanpon wait starts
at only 28 fu before rounding:

```text
20 base + (4 x 2 for open simple triplets) = 28
Rounded = 30 fu
```

This makes 30-fu toitoi understandable rather than surprising. A tanki wait,
value pair, or tsumo can also move a raw 28-fu hand to 30, which still rounds
to 30 fu.

Then show why 40 fu is common: terminal/honor triplets, concealed triplets,
value pairs, and tanki waits accumulate enough extra fu to reach a raw total
from 31 through 40, which rounds to 40. Do not teach "toitoi equals 40 fu" as
a rule; teach it as the most frequent destination after the hand's components
are inspected.

Exercises should deliberately include:

- Open all-simple toitoi at 30 fu.
- Open toitoi that reaches 40 from terminal/honor triplets.
- Toitoi that reaches 40 from a value pair or tanki wait.
- Toitoi with concealed triplets, including the ron distinction that the
  triplet completed by the winning discard is open.
- Obscure 50-fu toitoi hands with several concealed terminal/honor triplets.
- Near-miss hands where the learner must identify whether the winning tile
  completes a triplet or the pair.

The exam asks for the fu total before asking for the payment. Feedback expands
into the full contribution list so a learner can see exactly which components
made a seemingly ordinary toitoi hand 30, 40, or 50 fu.

### Lesson 17: Fu Shortcut Recognition

Teach learners to classify common hands before calculating every component:

1. Chiitoitsu: always 25 fu.
2. Any kan: calculate exact fu.
3. Toitoi: inspect its components using the toitoi-fu method.
4. Pinfu ron: always 30 fu.
5. Pinfu tsumo: always 20 fu.
6. Closed non-pinfu: usually 40 fu ron or 30 fu tsumo.
7. Open hand: usually 30 fu.

The exercise asks which rule applies, including an explicit "calculate exact
fu" answer. Teach that "usually" has exceptions; it is not a license to guess.

### Lesson 18: Integrated Scoring

Combine all skills progressively:

1. Han and fu supplied; choose payment.
2. Han supplied; identify fu family and payment.
3. Yaku supplied; count han, identify fu, and choose payment.
4. Full hand and table state; no supplied breakdown.
5. Mixed exam with no chart or hints.

The integrated exam should favor common scoring categories: 30 fu, 40 fu,
20-fu pinfu tsumo, 25-fu chiitoitsu, limit hands, and representative exact-fu
cases. It should not add rare cases merely for variety.

## Practice And Exam Contract

### Practice

- Unlimited generated exercises.
- Immediate feedback.
- Relevant chart, explanation, or hint may be visible.
- Repeatable without consequence.
- Learner can inspect the full scoring breakdown immediately.

### Exam

- Fixed number of generated exercises.
- Timer visible.
- No hints and no immediate correctness feedback.
- Each answer advances promptly to the next question.
- The exercise set is balanced by a lesson-specific blueprint, not merely
  random.
- Results appear after the final question.

## Shared Exam Results

All exams end at one shared results experience. The compact list must let a
learner scan performance while preserving enough state to recognize each hand.

```text
#  Hand / result                  Your answer     Result     Time
1  [tiles] E1 / South / ron       1x Yakuman      Correct    4.2s
2  [tiles] S3 / East / tsumo      Not Yakuman     Wrong      7.8s
3  [tiles] E4 / North / ron       2x Yakuman      Correct    5.1s
```

Each compact row includes:

- A small, non-wrapping tile rail, with a separated winning tile where needed.
- A concise state line: round, learner seat, winning method, and live-wall
  tiles remaining.
- A compact dora count or indicator thumbnail when relevant.
- Learner answer, result, and response time.

Tapping a row opens an expanded review, drawer, or dedicated detail screen.
The expanded view contains:

- Full hand, melds, and winning-tile presentation.
- Round, seat, honba, riichi-stick count, and live-wall count.
- Ron source or tsumo/rinshan/chankan context as applicable.
- Dora, kan-dora, and ura-dora indicators.
- Learner answer and correct answer.

For ordinary scoring questions, it additionally contains:

- Yaku and han breakdown.
- Fu total and fu breakdown.
- The score formula.
- A relevant small score chart with the correct cell highlighted.

For yakuman classification questions, the expanded review normally shows only
the correct multiplier and yakuman name. Counted-yakuman reviews also show the
han breakdown and the selected ruleset's counted-yakuman rule.

## Grades And Stars

Accuracy and speed are intentionally separate. A fast answer with an error is
not superior to a slower correct answer in a setting where one scoring error
matters.

Suggested non-perfect accuracy bands:

```text
E   0-49%
D   50-64%
C   65-79%
B   80-89%
A   90-99%
```

The bands stop at 99% on purpose. **100% is not a lettered grade — it is perfect
accuracy**, and the ratings above it are stars, earned by speed.

Stars are the only ratings above ordinary grades, and every star requires perfect accuracy.

```text
Star     100% accuracy plus the first exam-specific speed threshold
2 Stars  100% accuracy plus the experienced-player speed threshold
3 Stars  100% accuracy plus the serious-competitive-player threshold
```

The intended meaning is:

```text
Star     Confident for a first tournament or a welcoming live parlor
2 Stars  Comfortable, experienced live-play scorer
3 Stars  Fast, reliable scorer for serious competitive play
```

Thresholds are deliberately not fixed in this document. They must be tuned per
exam as the coach is built and evaluated. A yakuman recognition exam and a
full fu-and-payment exam cannot use the same timing target.

A learner who earns 100% but misses the first speed threshold should receive
a positive result such as "Perfect accuracy. Practice speed for a star." Any
incorrect answer prevents stars for that attempt, regardless of speed.

## Certification Path

Stars are in-app achievements, not official tournament certification. Their
purpose is to give learners a meaningful, trustworthy readiness target.

Possible milestones:

- Yaku recognition star.
- Yakuman recognition star.
- Common scoring star.
- Fu calculation star.
- Integrated scoring star.
- Final tournament-scoring readiness exam.

The final exam should use a controlled mix of yaku counting, dora and ura,
dealer/non-dealer, ron/tsumo, common fu families, exact-fu cases, limit hands,
and yakuman recognition. It must demonstrate coverage, not reward a lucky set
of easy generated questions.
