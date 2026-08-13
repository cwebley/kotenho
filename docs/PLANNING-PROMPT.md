# Task: Design an implementation plan for `riichi-hand-generator`

## What this is

We are building a TypeScript library that generates randomized, valid, completed
Riichi Mahjong winning hands satisfying caller-supplied scoring constraints — for
example *"a closed hand worth exactly 3 han and 30 fu, whose only yaku are tanyao
and pinfu, won on a ryanmen wait."*

It powers a scoring-coach app: each lesson is a constraint set, and the generator
supplies unlimited fresh practice hands for it.

## What we want from you

**A design and implementation plan. Not the library.**

Do not write the implementation. Type signatures and short pseudocode fragments
are welcome where they clarify an idea, but we are explicitly not asking for
working code, and a plan that arrives as mostly-code will be less useful than one
that arrives as mostly-reasoning.

We want to understand and pressure-test the approach *before* committing to it.
An earlier attempt at this library failed, so we are deliberately spending time
on design.

## Required reading

**`SPEC.md`** (attached) is the problem specification. It defines the API
contract, validity requirements, edge cases, and all the mahjong domain knowledge
needed — hand structure, the full fu table, the yaku table with open/closed han
values, dora mechanics, and the kōtenhō rule.

It is deliberately **solution-free**: it says what the library must do and never
how. Read it fully before planning. Sections §3, §4.10, §7.1 and §7.2 describe
the difficulties we consider central.

## Existing code you will integrate with

**`riichi-score`** — our own scoring library (`../riichi-score`, also at
`github.com/cwebley/riichi-score`). It is the single source of truth for what a
hand is worth; the generator must not re-implement scoring.

Its entry point is:

```ts
calculate(handInput: HandInput): HandAnalysis
```

`HandAnalysis.handInterpretations[]` contains **every** valid reading of the hand
— each with its own grouping, wait type, yaku list, itemised fu, han, and points
— filtered to those with a yaku and **sorted by basic points descending**. That
ordering is kōtenhō (SPEC §4.10) implemented directly, so
`handInterpretations[0]` is the canonical score.

Note the dependency in SPEC §8.4: the scorer currently implements a subset of the
standard yaku, and extending it is a prerequisite for the exclusive-yaku policy.
Your plan should account for that, including how the two codebases should be
sequenced.

**`../riichi-hand-generator`** is last year's abandoned attempt. Feel free to
look, but it never worked; treat it as a record of a dead end rather than a
starting point.

## What the plan must cover

1. **Architecture.** How the problem decomposes, and what each piece owns.

2. **How each class of constraint is satisfied.** Structural constraints (fu,
   wait type, open melds, kans, win method) behave very differently from content
   constraints (yaku, han, dora). Say how each is handled and why.

3. **Exclusivity.** Under `yakuPolicy: "exact"` the hand must contain the
   requested yaku *and no others*. Accidental yaku are common — see SPEC §3.3.
   How is this enforced, and what is the guarantee actually worth?

4. **Interpretation ambiguity.** Per kōtenhō, the reading that governs is the
   highest-scoring one, which is not necessarily the reading the generator had in
   mind. And when two readings tie on score, both are correct even if their wait
   types differ (SPEC §7.1). How does the design handle both cases?

5. **Impossible specs.** Many constraint combinations are contradictory
   (SPEC §7.2, §7.3). How are these detected, how fast, and how does the library
   distinguish *"provably impossible"* from *"searched and gave up"*?

6. **Failure and backtracking.** When a candidate is rejected, what happens? What
   stops the search from thrashing?

7. **Variety.** Repeated calls must produce materially different hands, and
   over-constrained specs must not silently return the same hand forever
   (SPEC §5.2, §7.6).

8. **Build order.** Concrete milestones. For each: what it delivers, what risk it
   retires, and how we would know it works. We would rather build the riskiest
   thing first than the easiest.

9. **Testing and correctness strategy.** This is a teaching tool — a hand with a
   wrong answer key is worse than no hand at all. How do we establish that
   generated hands are correctly scored, given the scorer is itself under
   development?

10. **The riskiest part of your plan,** stated plainly, and what you would do
    early to find out whether it holds.

## Constraints

- TypeScript, published as a library.
- `riichi-score` is the only scoring authority. The generator never reports a
  score it computed itself.
- Deterministic given a seed.
- Correctness strictly over performance. A slow correct hand beats a fast wrong
  one. That said, note anywhere your approach looks likely to be pathologically
  slow.
- Do not hardcode hand templates per lesson. Hands must be generated.

## What a good plan looks like

Reasoning, not a task list. For each significant decision, we want the
alternatives you considered and why you rejected them. Where you are uncertain,
say so and say what evidence would settle it — that is more useful to us than
false confidence.

Rough numbers are welcome. If part of your approach depends on a search
converging or a rejection rate being tolerable, estimate it and show the
arithmetic.

## Push back

If anything in `SPEC.md` is wrong, contradictory, or under-specified, say so.
If the API contract in §5 makes the problem harder than it needs to be, propose a
change. SPEC §10 lists decisions we know are still open; opinions on those are
welcome. We would rather find problems in the spec now than in the code later.
