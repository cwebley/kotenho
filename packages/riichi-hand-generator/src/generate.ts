import { freshSeed } from "./rng.js";
import { selectSkeletons } from "./skeleton.js";
import { checkYakuFeasibility } from "./yaku/static.js";
import { runSearch } from "./search.js";
import type {
  GenerateOptions,
  GenerateResult,
  GenerateSpec,
} from "./types.js";

const DEFAULT_BUDGET = 1000;

/**
 * Structural constraints are resolved by lookup; tile identities by randomised
 * fill and rejection. The planner only aims — riichi-score decides — so a bug
 * in the aiming costs throughput, never a wrong answer key.
 */
export function generate(
  spec: GenerateSpec = {},
  options: GenerateOptions = {},
): GenerateResult {
  // Yaku contradictions are decided from the templates alone, before any shape
  // is considered — they produce the most actionable reasons.
  const skipInferred = options.__unsafeSkipInferredChecks ?? false;
  if (!skipInferred) {
    const yakuCheck = checkYakuFeasibility(spec);
    if (!yakuCheck.ok) {
      return { status: "unsatisfiable", reason: yakuCheck.reason! };
    }
  }

  const { candidates, reason } = selectSkeletons(spec, skipInferred);
  if (!candidates.length) {
    return {
      status: "unsatisfiable",
      reason: reason ?? "no hand shape satisfies these constraints",
    };
  }

  const seed = options.seed ?? freshSeed();
  const run = runSearch(spec, candidates, {
    seed,
    budget: options.budget ?? DEFAULT_BUDGET,
    requireUnambiguousWait: options.requireUnambiguousWait ?? false,
    stopOnFirstSuccess: true,
    onAttempt: options.onAttempt,
  });
  const candidate = run.accepted[0];

  if (candidate) {
    return {
      status: "ok",
      hand: {
        handInput: candidate.handInput,
        analysis: candidate.analysis,
        canonical: candidate.canonical,
        ambiguity: candidate.ambiguity,
        seed,
        stats: {
          attempts: run.attempts,
          rejections: run.rejections,
          diagnoses: run.diagnoses,
        },
      },
    };
  }

  return {
    status: "exhausted",
    attempts: run.attempts,
    rejections: run.rejections,
    diagnoses: run.diagnoses,
    nearMisses: run.nearMisses,
  };
}
