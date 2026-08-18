import { normalizedHandSignature } from "./identity.js";
import { prepareSearchVariants } from "./open-base-yaku.js";
import { deriveSeed, freshSeed } from "./rng.js";
import { resolveSamplingConfig } from "./sampling-config.js";
import { runSearch } from "./search.js";
import type {
  BatchGenerateOptions,
  GenerateBatchResult,
  GeneratedHand,
  GenerateOptions,
  GenerateResult,
  GenerateSpec,
  NearMiss,
} from "./types.js";

const DEFAULT_BUDGET = 1000;
const NEAR_MISS_LIMIT = 5;

const mergeCounts = (
  target: Record<string, number>,
  source: Record<string, number>,
): void => {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
};

/** Generate one hand after static feasibility checks. */
function generateOne(
  spec: GenerateSpec,
  options: GenerateOptions,
): GenerateResult {
  const sampling = resolveSamplingConfig(options.sampling);
  const skipInferred = options.__unsafeSkipInferredChecks ?? false;
  const prepared = prepareSearchVariants(spec, sampling, skipInferred);
  if (!prepared.ok) {
    return { status: "unsatisfiable", reason: prepared.reason };
  }

  const seed = options.seed ?? freshSeed();
  const run = runSearch(prepared.variants, {
    seed,
    budget: options.budget ?? DEFAULT_BUDGET,
    requireUnambiguousWait: options.requireUnambiguousWait ?? false,
    stopOnFirstSuccess: true,
    sampling,
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
        baseYakuCategory: candidate.baseYakuCategory,
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

function generateBatch(
  spec: GenerateSpec,
  options: BatchGenerateOptions,
): GenerateBatchResult {
  if (!Number.isInteger(options.count) || options.count < 1) {
    throw new RangeError("count must be a positive integer");
  }

  const rootSeed = options.seed ?? freshSeed();
  const budget = options.budget ?? DEFAULT_BUDGET;
  const hands: GeneratedHand[] = [];
  const identities = new Set<string>();
  const rejections: Record<string, number> = {};
  const diagnoses: Record<string, number> = {};
  const nearMisses: NearMiss[] = [];
  let attempts = 0;
  let index = 0;

  while (hands.length < options.count && attempts < budget) {
    const result = generateOne(spec, {
      seed: deriveSeed(rootSeed, index++),
      budget: budget - attempts,
      onAttempt: options.onAttempt,
      requireUnambiguousWait: options.requireUnambiguousWait,
      sampling: options.sampling,
      __unsafeSkipInferredChecks: options.__unsafeSkipInferredChecks,
    });

    if (result.status === "unsatisfiable") {
      return {
        status: "unsatisfiable",
        requested: options.count,
        reason: result.reason,
      };
    }
    if (result.status === "exhausted") {
      attempts += result.attempts;
      mergeCounts(rejections, result.rejections);
      mergeCounts(diagnoses, result.diagnoses);
      nearMisses.push(
        ...result.nearMisses.slice(0, NEAR_MISS_LIMIT - nearMisses.length),
      );
      break;
    }

    attempts += result.hand.stats.attempts;
    mergeCounts(rejections, result.hand.stats.rejections);
    mergeCounts(diagnoses, result.hand.stats.diagnoses);
    const identity = normalizedHandSignature(result.hand.handInput);
    if (identities.has(identity)) {
      rejections["duplicate-in-batch"] =
        (rejections["duplicate-in-batch"] ?? 0) + 1;
      continue;
    }
    identities.add(identity);
    hands.push(result.hand);
  }

  if (hands.length === options.count) {
    return {
      status: "ok",
      requested: options.count,
      hands,
      attempts,
      rejections,
      diagnoses,
    };
  }
  if (!hands.length) {
    return {
      status: "exhausted",
      requested: options.count,
      attempts,
      rejections,
      diagnoses,
      nearMisses,
    };
  }
  return {
    status: "shortfall",
    requested: options.count,
    hands,
    attempts,
    rejections,
    diagnoses,
    reason: `batch budget exhausted after finding ${hands.length} distinct hand(s)`,
  };
}

/**
 * Structural constraints are resolved by lookup; tile identities by randomised
 * fill and rejection. The planner only aims — riichi-score decides — so a bug
 * in the aiming costs throughput, never a wrong answer key.
 */
export function generate(
  spec: GenerateSpec | undefined,
  options: BatchGenerateOptions,
): GenerateBatchResult;
export function generate(
  spec?: GenerateSpec,
  options?: GenerateOptions,
): GenerateResult;
export function generate(
  spec: GenerateSpec = {},
  options: GenerateOptions | BatchGenerateOptions = {},
): GenerateResult | GenerateBatchResult {
  return "count" in options
    ? generateBatch(spec, options)
    : generateOne(spec, options);
}
