import { normalizedHandSignature } from "./identity.js";
import { prepareSearchVariants } from "./open-base-yaku.js";
import { freshSeed } from "./rng.js";
import { resolveSamplingConfig } from "./sampling-config.js";
import { runSearch } from "./search.js";
import type { AnalyzeOptions, AnalyzeResult, GenerateSpec } from "./types.js";

const DEFAULT_SAMPLE_SIZE = 100;

/**
 * Check a spec statically, then measure the real planner/verifier pipeline over
 * a fixed seeded sample. A zero-yield probe is empirical, not a proof.
 */
export function analyze(
  spec: GenerateSpec = {},
  options: AnalyzeOptions = {},
): AnalyzeResult {
  const sampling = resolveSamplingConfig(options.sampling);
  const prepared = prepareSearchVariants(spec, sampling);
  if (!prepared.ok) {
    return {
      feasible: false,
      reason: prepared.reason,
      estimatedYield: 0,
      distinctRatio: 0,
      sampleSize: 0,
      rejections: {},
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
      rejections: {},
    };
  }
  const run = runSearch(prepared.variants, {
    seed: options.seed ?? freshSeed(),
    budget: requestedSampleSize,
    requireUnambiguousWait: options.requireUnambiguousWait ?? false,
    stopOnFirstSuccess: false,
    sampling,
  });
  const identities = new Set(
    run.accepted.map((candidate) =>
      normalizedHandSignature(candidate.handInput),
    ),
  );
  const baseYakuCounts = Object.fromEntries(
    prepared.variants
      .filter((variant) => variant.baseYakuCategory)
      .map((variant) => [
        variant.baseYakuCategory!,
        run.accepted.filter(
          (candidate) =>
            candidate.baseYakuCategory === variant.baseYakuCategory,
        ).length,
      ]),
  );

  return {
    feasible: true,
    estimatedYield: run.attempts === 0 ? 0 : run.accepted.length / run.attempts,
    distinctRatio:
      run.accepted.length === 0 ? 0 : identities.size / run.accepted.length,
    sampleSize: run.attempts,
    rejections: run.rejections,
    ...(prepared.variants.some((variant) => variant.baseYakuCategory)
      ? { baseYakuCounts }
      : {}),
  };
}
