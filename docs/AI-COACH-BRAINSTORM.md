# AI Coach Brainstorm

Ideas for bringing an AI learning coach into the future
`riichi-scoring-coach` application without weakening the deterministic
correctness guarantees of `riichi-score` and `riichi-hand-generator`.

## Product Principle

Kotenho should not use an agent for tasks that are already deterministic:

- Generate valid hands.
- Calculate fu, han, yaku, and payments.
- Grade learner answers.
- Verify that a hand satisfies lesson constraints.
- Run timers, tournaments, leaderboards, and spaced-repetition schedules.

The agent should coach the learner around verified results. It should explain,
question, personalize, and suggest. It should not become a second scoring
authority.

## Strongest First Feature: Socratic Coach

The first AI feature should be post-answer coaching.

1. Generate an exercise deterministically, for example a closed 30-fu ron hand.
2. Let the learner submit a structured fu breakdown.
3. Grade the answer with deterministic Kotenho logic.
4. Convert the result into structured mistake codes.
5. Give the agent the exercise, learner answer, grading result, and learning goal.
6. Have the agent give a targeted hint instead of immediately revealing the answer.
7. After another attempt, explain the rule and choose a focused follow-up exercise.

Example hint:

> You identified the base 20 fu, but this was a closed hand won by ron. What
> additional bonus applies in that situation?

The agent can conduct the dialogue, but the deterministic grader decides
whether the learner is correct.

## Other Agent-Worthy Features

### Natural-Language Explanations

Explain a verified score in terms appropriate to the learner's level:

- Why a wait added or did not add fu.
- Why a triplet was treated as open or closed.
- Why a closed ron receives a bonus.
- Why a hand rounded up to its final fu value.
- Why a yaku was present, absent, or subsumed.
- Why two interpretations produce different results.

### Personalized Mnemonics

Generate memorable explanations or mnemonics based on the learner's actual
mistake history. These should be suggestions, not canonical rules.

### Adaptive Lesson Planning

Translate a learner request such as "I keep missing 70-fu hands" into a bounded
sequence of lesson constraints. Every proposed constraint must be checked with
`analyze()` and every exercise must be produced by `generate()`.

The agent may propose the curriculum; the generator validates feasibility.

### Counterfactual Practice

After a scored exercise, let the learner ask:

- What changes if this is tsumo instead of ron?
- What changes if the hand is open?
- What if this triplet were a kan?
- What payment does a dealer receive instead?

The agent should call deterministic comparison tools and explain their results.

### Session Debriefs

Summarize a practice session in natural language:

- Concepts the learner handled reliably.
- Mistake patterns.
- Examples worth reviewing.
- A recommended next lesson.

The underlying statistics and mastery state should remain deterministic.

### Ruleset-Grounded Questions

Later, the coach can answer rules questions using a selected ruleset and a
curated rules corpus. The ruleset must always be explicit because fu and payment
details can vary by ruleset.

## Mistake Taxonomy

Define structured error codes before adding the agent. These give the coach
useful, reliable context:

- `missed_base_fu`
- `missed_menzen_ron`
- `missed_tsumo_fu`
- `wrong_triplet_fu`
- `wrong_kan_fu`
- `wrong_pair_fu`
- `wrong_wait_fu`
- `forgot_rounding`
- `wrong_yaku`
- `wrong_payment`

The taxonomy should be generated from the deterministic comparison between the
learner's answer and the canonical answer, not inferred by the LLM.

## Candidate Agent Tools

The coach could call tools with narrow, deterministic responsibilities:

- `scoreLearnerAnswer`
- `explainFuItem`
- `compareWinningMethod`
- `generateExercise`
- `analyzeLessonSpec`
- `getLearnerMistakes`
- `recordCoachingOutcome`

Tool outputs should be structured and validated. The agent should not be given a
general-purpose tool that lets it invent scores or mutate mastery directly.

## Architecture

Keep the core packages pure and usable offline:

```text
riichi-score
riichi-hand-generator
        |
        v
riichi-scoring-coach PWA
        |
        +-- deterministic local learning loop
        |
        +-- optional online AI coach
```

The PWA should work without the AI service. Offline users should still be able
to generate hands, submit answers, receive deterministic corrections, and use a
library of prewritten hints.

The online agent should receive a compact `CoachContext` containing:

- Current lesson objective.
- Current exercise and ruleset.
- Learner's submitted answer.
- Deterministic grading result.
- Mistake codes.
- Relevant prior mistake history.
- Allowed coaching mode, such as hint or explanation.

Do not send the entire learner database or unrestricted answer history. Do not
expose the answer key before the learner commits an answer.

## Applying The AI Engineering Course

### Context Engineering

Design a compact coaching context rather than dumping raw hand data, all prior
attempts, and every possible rule into the prompt. Include the verified facts
needed for the current coaching decision.

The answer key should be available to the grading tool and post-submit
explanation flow, but not to a pre-submit hint flow.

### Tool Design

Make the scoring engine, generator, answer grader, and progress store tools.
Keep each tool narrow, typed, and independently testable.

### Evals

Use Braintrust or a similar platform for the probabilistic coaching layer, not
as the authority for scoring correctness.

Useful eval cases include:

- A learner who forgot the menzen-ron bonus.
- A learner who treated a closed terminal triplet as open.
- A learner who forgot fu rounding.
- A learner who asks about an ambiguous interpretation.
- A learner who asks for the answer before submitting.
- A learner who requests an impossible lesson constraint.

Code-based scorers should verify that the response contains no incorrect fu or
payment claims and that the proposed exercise spec is feasible. An LLM judge can
score clarity, encouragement, and whether the hint is appropriately indirect.

### Improvement Loop

Run a baseline, inspect failures, change one prompt or coaching policy, and run
the same eval set again. Track directional improvement rather than trusting one
run's absolute score.

### RAG

Add rules retrieval only when the supported rulesets and source corpus are
defined. Retrieved rules should be scoped to the active ruleset and cited in
the explanation context.

### Data Flywheel

With appropriate privacy controls, aggregate mistake codes and learner feedback
to discover:

- Which fu concepts cause the most failures.
- Which exercises are too easy or too ambiguous.
- Which explanations lead to successful retries.
- Which generated lessons have poor variety or feasibility.

## What Should Not Be Agentic

The following should remain application logic:

- The score answer key.
- The canonical Kotenho interpretation.
- Validity and constraint verification.
- Timer start and stop behavior.
- Tournament eligibility and leaderboard ranking.
- Mastery calculations and spaced-repetition intervals.
- Ruleset selection and versioning.

An agent can describe these outputs, but it must not override them.

## Suggested Build Order

1. Build the deterministic learning loop without AI: lesson, exercise, answer,
   grading, mistake codes, and next exercise.
2. Add a static hint library keyed by mistake code.
3. Add an online post-answer Socratic coach using the structured grading result.
4. Add counterfactual explanations backed by deterministic recalculation.
5. Add adaptive lesson planning constrained by `analyze()` and `generate()`.
6. Add ruleset-grounded retrieval and session debriefs.
7. Add tournament mode and leaderboard features independently from the agent.

## Product Decisions

Decide these before implementation:

- Should answers be structured fu components, free-form text, or both?
- Is the AI coach online-only with deterministic offline fallback?
- Which riichi ruleset is authoritative for the first release?
- Should the coach primarily give hints, explain answers, or design curricula?
- Should generated lesson plans require learner approval before becoming active?

Recommended defaults: structured answers first, an offline experience always,
one explicit ruleset, Socratic hints as the first AI feature, and learner approval
for generated curricula.
