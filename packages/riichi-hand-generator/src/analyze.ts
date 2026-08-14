import { normalizedHandSignature } from "./identity.js";
import { freshSeed } from "./rng.js";
import { runSearch } from "./search.js";
import { selectSkeletons } from "./skeleton.js";
import type { AnalyzeOptions, AnalyzeResult, GenerateSpec } from "./types.js";
import { checkYakuFeasibility } from "./yaku/static.js";

const DEFAULT_SAMPLE_SIZE = 100;

/**
 * Check a spec statically, then measure the real planner/verifier pipeline over
 * a fixed seeded sample. A zero-yield probe is empirical, not a proof.
 */
export function analyze(
  spec: GenerateSpec = {},
  options: AnalyzeOptions = {},
): AnalyzeResult {
  const yakuCheck = checkYakuFeasibility(spec);
  if (!yakuCheck.ok) {
    return {
      feasible: false,
      reason: yakuCheck.reason,
      estimatedYield: 0,
      distinctRatio: 0,
      sampleSize: 0,
    };
  }

  const { candidates, reason } = selectSkeletons(spec);
  if (!candidates.length) {
    return {
      feasible: false,
      reason: reason ?? "no hand shape satisfies these constraints",
      estimatedYield: 0,
      distinctRatio: 0,
      sampleSize: 0,
    };
  }

  const requestedSampleSize = options.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  if (!Number.isInteger(requestedSampleSize) || requestedSampleSize < 0) {
    throw new RangeError("sampleSize must be a non-negative integer");
  }
  if (requestedSampleSize === 0) {
    return {
      feasible: true,
      estimatedYield: 0,
      distinctRatio: 0,
      sampleSize: 0,
    };
  }

  const run = runSearch(spec, candidates, {
    seed: options.seed ?? freshSeed(),
    budget: requestedSampleSize,
    requireUnambiguousWait: options.requireUnambiguousWait ?? false,
    stopOnFirstSuccess: false,
  });
  const identities = new Set(
    run.accepted.map((candidate) => normalizedHandSignature(candidate.handInput)),
  );

  return {
    feasible: true,
    estimatedYield:
      run.attempts === 0 ? 0 : run.accepted.length / run.attempts,
    distinctRatio:
      run.accepted.length === 0 ? 0 : identities.size / run.accepted.length,
    sampleSize: run.attempts,
  };
}
