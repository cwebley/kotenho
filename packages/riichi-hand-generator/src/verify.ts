import { calculate } from "riichi-score";
import type { HandAnalysis, HandInput, HandInterpretation } from "riichi-score";
import type { AmbiguityFlags, GenerateSpec } from "./types.js";

export type RejectionCause =
  | "invalid-hand"
  | "no-yaku"
  | "fu-mismatch"
  | "wait-mismatch"
  | "ambiguous-wait"
  | "assignment-failed";

export type VerifyResult =
  | { ok: false; cause: RejectionCause }
  | {
      ok: true;
      analysis: HandAnalysis;
      canonical: HandInterpretation;
      ambiguity: AmbiguityFlags;
    };

const distinct = <T>(values: T[]): number => new Set(values).size;

/**
 * The comparator. This is the only place correctness is decided, and it decides
 * it by asking riichi-score — never by trusting what the planner intended.
 *
 * Kotenho selects the highest-scoring reading, but when readings tie on score
 * it is silent, and every tied reading is equally correct. So the unit of truth
 * is the tied-top SET: a graded constraint holds only if *every* member of it
 * holds. A hand whose tied readings disagree on fu cannot honestly be used for
 * an exact-fu exercise, no matter which one lands at index 0.
 */
export function verify(
  handInput: HandInput,
  spec: GenerateSpec,
  requireUnambiguousWait: boolean,
): VerifyResult {
  const analysis = calculate(handInput);
  if (!analysis.valid || !analysis.handInterpretations.length) {
    const noYaku = analysis.errors.some((error) => error.includes("no yaku"));
    return { ok: false, cause: noYaku ? "no-yaku" : "invalid-hand" };
  }

  const best = analysis.handInterpretations[0].basicPoints;
  const tied = analysis.handInterpretations.filter(
    (interpretation) => interpretation.basicPoints === best,
  );

  if (spec.fu !== undefined && tied.some((hi) => hi.fu !== spec.fu)) {
    return { ok: false, cause: "fu-mismatch" };
  }
  if (
    spec.waitType !== undefined &&
    tied.some((hi) => hi.waitType !== spec.waitType)
  ) {
    return { ok: false, cause: "wait-mismatch" };
  }

  const ambiguity: AmbiguityFlags = {
    wait: distinct(tied.map((hi) => hi.waitType)) > 1,
    fu: distinct(tied.map((hi) => hi.fu)) > 1,
    han: distinct(tied.map((hi) => hi.han)) > 1,
    yaku: distinct(
      tied.map((hi) =>
        hi.yaku
          .map((yaku) => yaku.name)
          .sort()
          .join("+"),
      ),
    ) > 1,
  };

  if (requireUnambiguousWait && ambiguity.wait) {
    return { ok: false, cause: "ambiguous-wait" };
  }

  return {
    ok: true,
    analysis,
    canonical: analysis.handInterpretations[0],
    ambiguity,
  };
}
