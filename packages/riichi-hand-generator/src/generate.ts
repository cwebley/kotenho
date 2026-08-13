import type { Direction } from "riichi-score";
import { assignTiles } from "./assign.js";
import { createRng } from "./rng.js";
import { selectSkeletons, type Skeleton } from "./skeleton.js";
import type { GenerateOptions, GenerateResult, GenerateSpec } from "./types.js";
import { verify, type RejectionCause } from "./verify.js";

const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];
const DEFAULT_BUDGET = 1000;
const ATTEMPTS_PER_SKELETON = 20;

let seedCounter = 0;
const freshSeed = (): number =>
  (Date.now() ^ Math.imul(seedCounter++, 0x9e3779b9)) >>> 0;

/**
 * Resolve winds for one attempt. A double-wind pair only exists when the round
 * and seat winds coincide, so an unpinned seat wind is forced to match rather
 * than left to chance — otherwise those skeletons could never be filled.
 */
function resolveWinds(
  skeleton: Skeleton,
  spec: GenerateSpec,
  pick: <T>(items: readonly T[]) => T,
): { roundWind: Direction; seatWind: Direction } | null {
  const roundWind = spec.roundWind ?? pick(DIRECTIONS);
  if (skeleton.pair === "doubleWind") {
    if (spec.seatWind !== undefined && spec.seatWind !== roundWind) return null;
    return { roundWind, seatWind: roundWind };
  }
  return { roundWind, seatWind: spec.seatWind ?? pick(DIRECTIONS) };
}

/**
 * Structural constraints are resolved by lookup; tile identities by randomised
 * fill and rejection. The planner only aims — riichi-score decides, so a bug in
 * the aiming costs throughput, never a wrong answer key.
 */
export function generate(
  spec: GenerateSpec = {},
  options: GenerateOptions = {},
): GenerateResult {
  const { candidates, reason } = selectSkeletons(spec);
  if (!candidates.length) {
    return {
      status: "unsatisfiable",
      reason: reason ?? "no hand shape satisfies these constraints",
    };
  }

  const seed = options.seed ?? freshSeed();
  const budget = options.budget ?? DEFAULT_BUDGET;
  const requireUnambiguousWait = options.requireUnambiguousWait ?? false;
  const rng = createRng(seed);

  const rejections: Record<string, number> = {};
  const note = (cause: RejectionCause): void => {
    rejections[cause] = (rejections[cause] ?? 0) + 1;
  };

  // Shuffle rather than iterate in table order: skeleton choice is the largest
  // source of variety between calls, and first-fit would make every hand for a
  // given spec structurally identical.
  const order = rng.shuffled(candidates);
  let attempts = 0;
  let cursor = 0;

  while (attempts < budget) {
    const skeleton = order[cursor % order.length];
    cursor++;

    for (let i = 0; i < ATTEMPTS_PER_SKELETON && attempts < budget; i++) {
      const winds = resolveWinds(skeleton, spec, rng.pick);
      if (!winds) break;

      attempts++;
      const handInput = assignTiles(
        skeleton,
        winds.roundWind,
        winds.seatWind,
        rng,
      );
      if (!handInput) {
        note("assignment-failed");
        continue;
      }

      const result = verify(handInput, spec, requireUnambiguousWait);
      if (!result.ok) {
        note(result.cause);
        continue;
      }

      return {
        status: "ok",
        hand: {
          handInput,
          analysis: result.analysis,
          canonical: result.canonical,
          ambiguity: result.ambiguity,
          seed,
          stats: { attempts, rejections },
        },
      };
    }
  }

  return { status: "exhausted", attempts, rejections };
}
