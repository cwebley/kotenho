# AI Coach v3 — Architecture

This document supersedes `AI-COACH-BRAINSTORM.md` (the original
"deterministic engine + Socratic coach" framing) and `AI-COACH-V2.md` (the
feature list). It captures a redesigned coach architecture that treats the
deterministic sub-task engine as the primary teaching surface, the agent as
a thin orchestration layer on top, and UI manipulation tools as the
vocabulary that lets the agent actually teach.

The redesign was driven by four findings from a design review:

1. The DuoLingo lesson model transfers to Kotenho in narrow ways — adaptive
   question selection, multiple question types per skill, placement tests —
   but most of the rest (hearts, streaks-as-primary, tree-unlock, roleplay,
   narrative) does not.
2. The original "Socratic coach" framing accidentally gave the agent work
   that is actually deterministic. A learner who picks the wrong payment
   because they miscounted fu does not need a hint — they need to walk
   through the fu calculation. That walk-through is a state machine, not a
   creative act.
3. UI tools (highlight, swap, flip-open) change what an agent *is*. With
   only text output, an agent is a paraphraser, and paraphrasing is
   templatable. With visual tools, an agent becomes a guide that can point
   at the relevant tiles while explaining a rule. That earns the agent its
   keep in a way pure text cannot.
4. UI tools are dual-purpose: they serve the learner (clickable explain
   view) and the agent (vocabulary for Q&A). Same primitive, two clients.
   The richer the UI, the narrower the agent. Most learning is
   learner-driven; the agent is an accelerator, not the primary teacher.

## Product Principle (Reaffirmed)

Kotenho should not use an agent for tasks that are already deterministic.
The original principle is correct; the v1 implementation of it was too
generous. The agent should orchestrate deterministic tools and frame their
results. It should not author hands, invent scores, or generate prose
where a template suffices.

## What Translates From DuoLingo

| Idea | Translates? | Notes |
|---|---|---|
| Adaptive question selection per learner | yes | Mistake codes are the signal. |
| Multiple question types per skill | yes | Each lesson probes one skill through several interaction types. |
| Placement test to seed mastery | yes | Pure questions, no explanation. |
| Crown levels / per-skill tiers | partial | Could unlock harder variants after passing the easy one. |
| Spaced repetition | partial | Useful for retention between sittings, not for in-session coaching. |
| Skill tree | no | Linear skill ordering is right for scoring. |
| Streaks as primary retention loop | no | Tournament preppers want readiness, not streaks. |
| Hearts / lives | no | Scoring is a precision skill, not a casual game. |
| Streaks + XP | yes (light) | Daily-practice gamification only. |
| Leagues + leaderboards | no (defer) | Out of scope until real backend. |
| AI character roleplay | no | Distraction cost > learning value. |
| Narrative stories | no | Worked examples belong inline in lessons. |
| "Explain My Answer" (post-answer AI) | yes | Becomes the decomposition coach. |

The big transferable idea is that a "lesson" is a *question cloud* with
minimum scaffolding, not a chapter. Content shrinks; practice grows;
mastery is tracked per knowledge atom; the loop is doing the math.

## Core Loop Decision

Two loops were considered:

- **Loop 1 — Read content, then practice, then exam.** Lesson prose
  explains the rule, deterministic practice generates exercises, exam
  measures recall. Closer to a textbook.
- **Loop 2 — Tip + adaptive practice swarm.** Compress lesson content to
  a single tip card (roughly 80 words). Practice is the loop. The next
  question is selected by mistake-code history. Short checkpoint quiz per
  lesson. One final integrated exam. Closer to DuoLingo.

Both loops share the same hybrid exam structure (short checkpoint quiz
per lesson, one final integrated exam), the same per-lesson mastery
tracking, and the same deterministic grader. They differ on whether the
lesson content page is a chapter or a tip.

**Working direction: Loop 2.** The reasoning:

- The target learner is a tournament scorer. The skill to build is
  production under speed pressure. Loop 2 trains that skill directly.
- Loop 1's "why it matters at a table" prose rewards reading
  comprehension, not scoring speed. The exam format (timed, no feedback)
  is already Loop 2's voice; the content is lagging.
- Loop 2 is cheaper to build per lesson once the question bank and
  selector exist, and it scales to additional lessons without rewriting
  prose.

Loop 1 is acceptable as a fallback if Loop 2's question-bank authoring
turns out to be infeasible. Decide after v1 ships with Loop 2 for one
representative lesson.

## The Decomposition Coach

The single most important reframing in this design: **the coach is not a
hint-giver. It is a decomposition coach.**

When a learner submits a wrong answer:

1. The deterministic grader identifies the mistake code (for example,
   `wrong_fu_count`, `wrong_han_count`, `wrong_payment_for_correct_han_fu`,
   `missed_tsumo_fu`, `wrong_payment_announcement`).
2. A rule lookup maps the mistake code to a sub-task (for example,
   *count the fu together*, *count the han together*, *show the chart
   cell*, *rehearse the tsumo announcement*).
3. The sub-task is implemented as a tool call into the deterministic
   engine (`replayFuBreakdown`, `replayHanBreakdown`, `presentChart`,
   `tsumoMath`).
4. A templated prompt walks the learner through the tool's structured
   output.
5. After the walk-through, the learner re-attempts.
6. If two same-code failures happen in a session, the system escalates
   from a hint to a full step-by-step walk-through.

Example, learner picks 2000 when the answer is 3900 on a 30-fu / 2-han
non-dealer ron:

> The chart says 3900 — that's the 30-fu / 2-han cell. 2000 is the 30-fu
> / 1-han cell. So your fu was right; your han was off by one. Let's
> count the han again: [tool call replayHanBreakdown returns the yaku
> list]. Which yaku did you miss?

The agent never invents the answer. It sequences the same deterministic
tools the learner is supposed to learn.

This is a state machine, not an agent. It is fully deterministic. It
works offline. It has no LLM cost. It is the entire coach experience for
v1.

## Why An Agent Is Not Needed For The Decomposition Flow

The decomposition coach is a pure function of (hand, learner answer,
mistake code, prior failures on this code). Every step is a rule lookup,
a tool call, and a templated prompt. There is no generation, no
hallucination surface, no creative act.

Concretely:

- Mistake code → sub-task is a lookup table.
- Sub-task → tool call is a typed binding.
- Tool result → prompt is a template.
- Escalation trigger (two same-code failures) is a counter.
- Failure → re-attempt or advance is a branch.

The original brainstorm doc allocated an "agent" to this work. That
allocation was wrong. The agent was over-scoped to the deterministic
core. Moving it out of the core lets v1 ship without any AI dependency
at all, which strengthens the offline-first promise and removes a large
evals surface.

## The Four Squishy Seams

The agent earns its keep in exactly four seams. These are the only places
where the deterministic core has gaps that templates and rules can't fill.

**1. Open-ended learner questions.**
*"Why is this tanyao and not pinfu?"* / *"What if this were open?"* / *"Why
does tenhou score as yakuman?"*

The tool calls are deterministic (`explainWhyThisYakuNotThatYaku`,
`recalculateOpen`, `rulesLookup`). The framing is not — *"Because pinfu
needs a ryanmen wait, and yours is a kanchan — that's why the fu jumped."*
A template covers 80%; an LLM covers the last 20% for clarity and
adaptation to the learner's history.

**2. Free-form reasoning parsing.**
The learner types *"I think it's tanyao + pinfu + 2 dora"* and submits.
The grader can verify the numbers but cannot evaluate the reasoning. An
LLM can parse the explanation, identify which sub-task the learner is
implicitly failing at, and route to the right tool.

This is the only case where the agent becomes hard to avoid. It is
relevant only if the app accepts free-form answers, which the current
content plan does not. Defer to v2 unless free-form answers ship in v1.

**3. Counterfactual exploration.**
*"What changes if this were kan instead of pon?"* — the recalculation is
a deterministic tool. The narrative explanation is not. *"The triplet
becomes a closed kan: +8 fu instead of +4. That moves you from 30 fu to
40 fu, mangan cap moves your payment from 3900 to 7700."* A template
fills 90%; the LLM fills the residual.

**4. Motivation and meta-coaching.**
*"You've missed the menzen-ron bonus five times this week. Want a focused
drill on closed ron?"* The aggregation is deterministic (mistake history
is structured). The phrasing is LLM-flavoured. A good template is fine;
an LLM is nicer.

The agent is a *concierge* around the sub-task engine, not a replacement
for it.

## UI Tool Surface

The agent's expressive power comes from UI tools, not text. Without UI
tools, the agent is a paraphraser and paraphrasing is templatable. With
UI tools, the agent becomes a guide.

These tools are **dual-purpose**. They are the learner-facing explain
view (clickable buttons and toggles in the results screen) *and* the
agent's vocabulary when it needs to illustrate something. Same primitive,
two clients.

### Annotation System

The tile rail supports multiple stacked annotation layers. Each layer
holds:

- A set of tile IDs.
- A label (e.g., `"Ittsu"`, `"Iipeikou"`, `"Tanki wait"`).
- A position: `above` or `below` the rail.

Layers render independently and coexist. The same hand can display
`"Ittsu"` as a bottom line spanning 1-9p and `"Iipeikou"` as a top line
spanning the two 2-3-4 sequences, without conflict. The learner can also
click a layer to focus on it; the agent can use the same primitive. Both
the explain view and the agent manipulate the same underlying store.

### Pointer Tools

All pointer tools accept optional `label` and `position` arguments so the
agent and the learner can build the same layered annotations.

- `highlightTiles(tileIds, label?, position?)` — one tile or a set.
- `highlightConsecutiveTiles(tileIds, label?, position?)` — semantically
  a run; the underlying UI can stack multiple runs on the same rail.
  Used for runs, ittsu, iipeikou, and any other consecutive-tile yaku.
- `highlightGroup(interpretationIndex, groupIndex, label?, position?)` —
  a single triplet/run/pair within a chosen reading.
- `highlightYaku(interpretationIndex, yakuIndex, label?, position?)` —
  every tile contributing to a yaku.
- `highlightWait(interpretationIndex, label?, position?)` — the wait
  tiles.
- `clearHighlights()` — reset.

### Table-State Highlights

Used to surface the table state alongside hand highlights. Often paired
with `highlightConsecutiveTiles` or `highlightGroup` to explain concepts
like double-wind pairs, yakuhai triplets, and winning-method differences.

- `highlightRoundWind()` — the round wind indicator.
- `highlightSeatWind()` — the seat wind indicator.
- `highlightTsumo()` — winning-method indicator.
- `highlightRon()` — winning-method indicator.
- `highlightDora(indicatorIndex)` — a dora indicator.
- `highlightUraDora(indicatorIndex)` — an ura-dora indicator.
- `clearTableHighlights()` — reset.

### Reading Tools (Constrained To The Canonical Hand)

- `renderInterpretation(index)` — switch the displayed reading to a
  specific index from the canonical interpretation list. The learner can
  flip through interpretations manually (a "compare readings" toggle);
  the agent can call this to surface a non-default reading.
- `compareInterpretations(a, b)` — show both readings side by side with
  the relevant components highlighted in each.

### Scoring Tools

- `showScoringTable(fu, han)` — open the chart for a specific fu/han
  combination. Used to anchor the learner on the relevant row of the
  scoring table.
- `highlightTableScore(fu, han, winMethod, seat)` — highlight the
  correct cell in an open chart. Used by the explain view and the agent
  to point at the answer within chart context.

### Counterfactual Tools (Illustrate, Don't Mutate)

- `flipOpen(groupIndex)` — show "what if this triplet were called open."
  Updates fu and han, highlights the difference.
- `changeWinningTile(tileId)` — for demonstration of tsumo vs ron on a
  specific winning tile; updates fu, never persists.
- `toggleTsumoRon` — for the same hand, switch the winning method and
  recompute.

### What To Skip

- `swapTile` and `reorderTiles` — too easy to misuse, low educational
  value. The agent can already point at the tile. Free-form swap invites
  hallucination (where would the agent swap *to*?).
- `addAnnotation` / `drawArrow` — the layered annotation system covers
  these use cases with structured data and label text.
- Anything that constructs a new hand. The generator owns generation;
  the agent only illustrates.

The principle: **the agent never authors the hand, only reframes it.**
This is the same constraint as the existing one-source-of-truth rule,
applied to UI tools.

### Learner-Driven vs Agent-Driven Usage

The same tools serve two masters:

- **Learner-driven.** The explain view in the results screen exposes
  every tool as a button, toggle, or layered annotation. The learner
  explores on their own, with no LLM in the loop.
- **Agent-driven.** When the learner asks a question or the engine
  escalates, the agent sequences tools to illustrate the answer.

Most learning happens learner-driven. The agent is an accelerator, not
the primary teacher. The richer the UI, the narrower the agent's role.

## Why The Agent Narrows Further

The richer the explain view, the less the agent has to do. With the tools
above exposed as learner-facing controls, the agent's job is reduced to:

- **Sequencing** when the learner asks for a guided walk-through. *"Walk
  me through this hand"* triggers a sequence of `highlightYaku`,
  `highlightGroup`, `presentChart` calls; the UI surfaces do the work.
- **Counterfactual exploration** when the UI does not have a manual
  affordance for the requested change. The counterfactual tools exist for
  both clients, so this is mostly redundant; the agent's value is
  composing multiple counterfactuals in one turn.
- **Free-form Q&A.** *"Why?"*, *"What if?"*, *"I keep missing X"* —
  framing deterministic results in natural language.
- **Meta-coaching and motivation.** Aggregating deterministic mistake
  history and phrasing it as encouragement or focus recommendations.
- **Refusing out-of-scope questions** and routing to Reference or the
  Ruleset Q&A feature.

Everything else — the clickable UI, the templated prompts, the
deterministic grader, the explain view itself — works without the agent.

## Three Flows That Justify The UI Tool Surface

These three flows are what the UI tools exist to enable. Each one is
learner-driven by default; the agent can also orchestrate them when
asked.

**1. Yaku walk-through.**
*"What's iipeikou here?"* → `highlightYaku("iipeiko")` highlights both
runs side by side. *"See how the two 2-3-4s are identical? That's two
identical sequences — iipeiko."* Text alone cannot show that.

In the explain view: a "Show iipeikou" button highlights the relevant
runs. The learner explores this directly. The agent uses the same tool
when answering *"what's the iipeikou here?"* in free-form Q&A.

**2. Counterfactual illustration.**
*"What if I called this triplet?"* → `flipOpen(2)` → the triplet border
changes to open, fu recomputes from 30 to 40, payment goes from 3900 to
7700. The visual *and* the number move together. The learner sees the
rule applied.

In the explain view: a "What if open?" toggle exposes the counterfactual
as a button. The agent uses the same tool when asked in free-form Q&A.

**3. Kōtenhō disambiguation.**
*"Why isn't this pinfu?"* → `renderInterpretation(0)` highlights the
highest reading; `renderInterpretation(1)` highlights the pinfu reading;
`compareInterpretations(0, 1)` shows the fu difference inline. *"Same
hand, two readings. The 40-fu reading beats the 30-fu pinfu reading
under kōtenhō — that's why."*

In the explain view: a "Compare readings" toggle lets the learner flip
between interpretations and see the side-by-side. The agent uses the
same tools when asked.

None of these need the agent to invent anything. They need sequenced
tool calls — which the explain view can also do directly.

## Free-Form Input

A single post-answer text box, scoped narrowly:

```text
[ Submit your answer ]

[ Type to ask the coach anything about this hand... ]
```

The decomposition coach still handles structured failure paths
deterministically. The text box is the *escalation*: when the learner
wants to ask something the structured flow cannot anticipate.

Three rules:

- Text only. No voice, no image, no attachment.
- Scoped to the current hand. *"Why is this tanyao?"* not *"How does
  tanyao work in general?"* (the latter routes to Reference or the
  Ruleset Q&A feature, not the coach.)
- The agent is given the hand, the answer, the mistake code, and the
  full tool surface (scoring + UI). Its job is to orchestrate tools and
  frame the results.

## Three-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│ Sub-task Engine (deterministic, offline-first)  │
│                                                 │
│   wrong answer → mistake code → rule lookup     │
│          ↓                                      │
│   select sub-task → tool call → templated prompt│
│          ↓                                      │
│   track failure count → escalate or advance     │
└─────────────────────────────────────────────────┘
                       │
                       │ (only when learner asks or engine escalates)
                       ▼
┌─────────────────────────────────────────────────┐
│ Coaching Layer (optional, online)               │
│                                                 │
│   · frame deterministic results in natural lang │
│   · answer "why" / counterfactual questions      │
│   · parse free-form reasoning if accepted       │
│   · motivation, meta-coaching, debriefs         │
└─────────────────────────────────────────────────┘
                       │
                       │ (only when learner initiates open-ended session)
                       ▼
┌─────────────────────────────────────────────────┐
│ Open-Ended Coach (v3+, online)                  │
│                                                 │
│   · counterfactual exploration across hands     │
│   · ruleset-grounded Q&A (with RAG)             │
│   · personalized mnemonics from mistake history │
│   · session debriefs                            │
└─────────────────────────────────────────────────┘
```

The sub-task engine is the *teaching*. The coaching layer is the
*concierge*. The open-ended coach is the *study hall*.

## Constraints

Two safety properties that must be in every UI tool contract:

- **All UI tools are scoped to the current hand.** The agent cannot use
  `highlightTiles` or `flipOpen` to invent a new hand; the displayed hand
  is always a `riichi-hand-generator` output scored by `riichi-score`.
  Counterfactuals are *derived* and re-scored, not constructed.
- **Counterfactual tools are ephemeral.** `flipOpen` and
  `changeWinningTile` operate on a derived view that re-scores through
  `riichi-score` and never mutates the source hand. When the learner
  leaves the exercise, the view is gone.

These two rules keep the same one-source-of-truth principle that
protects the rest of Kotenho. The agent gets expressiveness without
getting authorship.

## Build Order

The build order commits to Loop 2 and the three-tier architecture.
Iterate on one lesson end to end before scaling.

**Tier 1 — Sub-task engine (v1, ships without any LLM):**

1. Define the mistake-code → sub-task mapping for the scoring-relevant
   codes (han, fu, payment, announcement).
2. Implement the deterministic tools (`replayHanBreakdown`,
   `replayFuBreakdown`, `presentChart`, `tsumoMath`).
3. Build the templated prompt library, one template per sub-task.
4. Wire the state machine: wrong answer → code → sub-task → tool → prompt
   → re-attempt, with escalation after two same-code failures.
5. Author the question bank for one representative lesson (suggested:
   Lesson 4 — 30 Fu) using multiple interaction types per skill.
7. Validate that the deterministic flow alone delivers enough learning
   value to justify shipping without an agent.

If Tier 1 lands and feels complete, ship v1 without Tier 2. The agent
becomes a v2 enhancement rather than a load-bearing component.

**Tier 2 — Coaching layer (v2, online-only, optional):**

1. Implement the UI tool surface (pointer, reading, counterfactual).
2. Wire the post-answer free-form input box, scoped to the current hand.
3. Define the agent's prompt scaffolding: hand + answer + mistake code +
   tool catalog + refusal rules.
4. Evals for each tool on each common mistake code.
5. Refusal behaviors for out-of-scope questions (general tanyao rules
   questions, off-topic, etc.).
6. Ship behind a feature flag so the offline experience is unaffected.

**Tier 3 — Open-ended coach (v3+, gated behind Tier 2):**

1. Counterfactual exploration across hands (not just the current one).
2. Ruleset-grounded Q&A with RAG over a curated rules corpus.
3. Personalized mnemonics derived from mistake history.
4. Session debriefs aggregating deterministic stats with optional
   LLM-flavoured summary.

## Open Questions

These are decisions the design review surfaced but did not resolve.

1. **Question-type per skill.** For each lesson, what is the minimum set
   of interaction types that probes the skill adequately? Need design
   work before the question bank can be authored at scale.
2. **Crown levels or single pass?** A lesson could unlock a harder
   variant (no chart, faster targets, multi-step questions) after passing
   the easier one. Whether this is worth the authoring cost is
   undecided.
3. **Placement test scope.** At first launch, what proportion of yaku,
   yakuman, fu, and payment content should the placement test probe?
   Too few questions seed too little; too many questions feels like an
   exam before the learner has context.
4. **Spaced repetition between sessions.** The sub-task engine handles
   in-session recurrence. Whether Kotenho also schedules reviews across
   sessions (SM-2 or similar) is undecided. Tournament preppers may
   prefer intensive practice over retention-spreading.
5. **Tournament mode.** Deferred per the IA doc. Whether tournament mode
   is a coaching surface (agent observes and gives post-round
   debriefs) or a competition surface (timed round-robin) is undecided.
6. **Reference integration.** When the learner asks a general rules
   question that is out of scope for the coach, where do they land? The
   Reference surface (currently static prose) or a separate
   ruleset-grounded Q&A surface? Probably the former, but the
   implications for Reference content authoring need to be worked
   through.

## What Should Still Not Be Agentic

Reaffirming the list from the original brainstorm:

- The score answer key.
- The canonical Kotenho interpretation.
- Validity and constraint verification.
- Timer start and stop behavior.
- Tournament eligibility and leaderboard ranking.
- Mastery calculations and spaced-repetition intervals.
- Ruleset selection and versioning.

An agent can describe these outputs. It must not override them.