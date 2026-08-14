import { calculate } from "riichi-score";
import type { HandAnalysis, HandInput, HandInterpretation } from "riichi-score";
import {
  groupSignature,
  readingSignature,
  type IntendedReading,
} from "./assign.js";
import type {
  AmbiguityFlags,
  GenerateSpec,
  IntendedReadingDiagnosis,
  RejectionCause,
} from "./types.js";

export type VerifyResult =
  | {
      ok: false;
      causes: RejectionCause[];
      primaryCause: RejectionCause;
      diagnosis: IntendedReadingDiagnosis;
    }
  | {
      ok: true;
      analysis: HandAnalysis;
      canonical: HandInterpretation;
      ambiguity: AmbiguityFlags;
      diagnosis: IntendedReadingDiagnosis;
    };

/**
 * How far the search must backtrack to fix each cause, deepest first. Recording
 * every violated constraint but routing on one keeps the histogram honest while
 * still giving the controller a single deterministic decision.
 */
const CAUSE_PRIORITY: RejectionCause[] = [
  "yaku-mismatch",
  "fu-mismatch",
  "wait-mismatch",
  "ambiguous-wait",
  "no-yaku",
  "invalid-hand",
  "assignment-failed",
];

const distinct = <T>(values: T[]): number => new Set(values).size;

function interpretationSignature(hi: HandInterpretation): string {
  if (!hi.isStandardHand) {
    return hi.yaku.some((yaku) => yaku.name === "chiitoitsu")
      ? "chiitoitsu"
      : "kokushi";
  }
  const groups = hi.groups.map((group) => groupSignature(group.tiles)).sort();
  return `${groups.join("|")}/${hi.pair.tiles[0]}/${hi.waitType}`;
}

/**
 * The comparator. The only place correctness is decided, and it decides by
 * asking riichi-score — never by trusting what the planner intended.
 *
 * Kotenho selects the highest-scoring reading, but is silent when readings tie
 * on score, and every tied reading is then equally correct. So the unit of
 * truth is the tied-top SET: a graded constraint holds only if *every* member
 * satisfies it. A hand whose tied readings disagree on fu cannot honestly serve
 * an exact-fu exercise regardless of which one lands at index 0.
 */
export function verify(
  handInput: HandInput,
  intended: IntendedReading,
  spec: GenerateSpec,
  requireUnambiguousWait: boolean,
): VerifyResult {
  const analysis = calculate(handInput);

  if (!analysis.valid || !analysis.handInterpretations.length) {
    const noYaku = analysis.errors.some((error) => error.includes("no yaku"));
    const cause: RejectionCause = noYaku ? "no-yaku" : "invalid-hand";
    return {
      ok: false,
      causes: [cause],
      primaryCause: cause,
      // The reading exists; the scorer just cannot see a yaku in it yet.
      diagnosis: "coverage-shadow",
    };
  }

  const best = analysis.handInterpretations[0].basicPoints;
  const tied = analysis.handInterpretations.filter(
    (interpretation) => interpretation.basicPoints === best,
  );

  const holds = (hi: HandInterpretation): boolean =>
    (spec.fu === undefined || hi.fu === spec.fu) &&
    (spec.waitType === undefined || hi.waitType === spec.waitType);

  const wanted = readingSignature(intended);
  const match = analysis.handInterpretations.find(
    (hi) => interpretationSignature(hi) === wanted,
  );

  let diagnosis: IntendedReadingDiagnosis;
  if (!match) {
    diagnosis = "coverage-shadow";
  } else if (!holds(match)) {
    // We built a reading that misses its own target: the fu table or a
    // template is wrong. Still only a rejection, but it is OUR bug.
    diagnosis = "planner-defect";
  } else {
    diagnosis = match.basicPoints === best ? "matched" : "drift";
  }

  const causes: RejectionCause[] = [];

  // Exclusivity. Compared across the whole tied-top set, not just index 0 —
  // when readings tie on score they are all equally correct, so a stray yaku in
  // any of them is a stray yaku in the answer key.
  if (spec.yaku?.length) {
    const policy = spec.yakuPolicy ?? "exact";
    const names = (hi: HandInterpretation): string[] =>
      hi.yaku.map((yaku) => yaku.name).sort();
    const want = [...spec.yaku].sort();
    const satisfied =
      policy === "exact"
        ? (hi: HandInterpretation) => names(hi).join("+") === want.join("+")
        : (hi: HandInterpretation) =>
            want.every((name) => names(hi).includes(name));
    if (tied.some((hi) => !satisfied(hi))) causes.push("yaku-mismatch");
  }

  if (spec.fu !== undefined && tied.some((hi) => hi.fu !== spec.fu)) {
    causes.push("fu-mismatch");
  }
  if (
    spec.waitType !== undefined &&
    tied.some((hi) => hi.waitType !== spec.waitType)
  ) {
    causes.push("wait-mismatch");
  }

  const ambiguity: AmbiguityFlags = {
    wait: distinct(tied.map((hi) => hi.waitType)) > 1,
    fu: distinct(tied.map((hi) => hi.fu)) > 1,
    han: distinct(tied.map((hi) => hi.han)) > 1,
    yaku:
      distinct(
        tied.map((hi) =>
          hi.yaku
            .map((yaku) => yaku.name)
            .sort()
            .join("+"),
        ),
      ) > 1,
  };

  if (requireUnambiguousWait && ambiguity.wait) {
    causes.push("ambiguous-wait");
  }

  if (causes.length) {
    const primaryCause =
      CAUSE_PRIORITY.find((cause) => causes.includes(cause)) ?? causes[0];
    return { ok: false, causes, primaryCause, diagnosis };
  }

  return {
    ok: true,
    analysis,
    canonical: analysis.handInterpretations[0],
    ambiguity,
    diagnosis,
  };
}
