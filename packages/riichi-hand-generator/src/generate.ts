import type { Direction } from "riichi-score";
import { assignTiles } from "./assign.js";
import { createRng } from "./rng.js";
import { selectSkeletons, type Skeleton } from "./skeleton.js";
import type {
  AttemptRecord,
  GenerateOptions,
  GenerateResult,
  GenerateSpec,
  NearMiss,
  RejectionCause,
} from "./types.js";
import { verify } from "./verify.js";

const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];
const DEFAULT_BUDGET = 1000;
const ATTEMPTS_PER_SKELETON = 20;
const NEAR_MISS_LIMIT = 5;

let seedCounter = 0;
const freshSeed = (): number =>
  (Date.now() ^ Math.imul(seedCounter++, 0x9e3779b9)) >>> 0;

const skeletonId = (skeleton: Skeleton): string =>
  skeleton.shape === "chiitoitsu"
    ? `chiitoi:${skeleton.tsumo ? "tsumo" : "ron"}`
    : [
        skeleton.blocks
          .map((b) => `${b.kind[0]}${b.called ? "o" : "c"}${b.edge[0]}`)
          .join(""),
        skeleton.pair,
        skeleton.wait,
        skeleton.tsumo ? "tsumo" : "ron",
        `${skeleton.fu}fu`,
      ].join(":");

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
 * fill and rejection. The planner only aims — riichi-score decides — so a bug
 * in the aiming costs throughput, never a wrong answer key.
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
  const onAttempt = options.onAttempt;
  const rng = createRng(seed);

  const rejections: Record<string, number> = {};
  const diagnoses: Record<string, number> = {};
  const nearMisses: NearMiss[] = [];

  const record = (entry: AttemptRecord): void => {
    for (const cause of entry.causes) {
      rejections[cause] = (rejections[cause] ?? 0) + 1;
    }
    if (entry.diagnosis) {
      diagnoses[entry.diagnosis] = (diagnoses[entry.diagnosis] ?? 0) + 1;
    }
    if (
      entry.causes.length === 1 &&
      entry.handInput &&
      nearMisses.length < NEAR_MISS_LIMIT
    ) {
      nearMisses.push({
        closedTiles: [...entry.handInput.closedTiles],
        winningTile: entry.handInput.winningTile.tile,
        violated: entry.causes[0],
      });
    }
    onAttempt?.(entry);
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
    const id = skeletonId(skeleton);

    for (let i = 0; i < ATTEMPTS_PER_SKELETON && attempts < budget; i++) {
      const winds = resolveWinds(skeleton, spec, rng.pick);
      if (!winds) break;

      attempts++;
      const assignment = assignTiles(
        skeleton,
        winds.roundWind,
        winds.seatWind,
        rng,
      );
      if (!assignment) {
        const cause: RejectionCause = "assignment-failed";
        record({
          attempt: attempts,
          stage: "assignment",
          outcome: "rejected",
          causes: [cause],
          primaryCause: cause,
          skeletonId: id,
        });
        continue;
      }

      const result = verify(
        assignment.handInput,
        assignment.intended,
        spec,
        requireUnambiguousWait,
      );

      if (!result.ok) {
        record({
          attempt: attempts,
          stage: "verification",
          outcome: "rejected",
          diagnosis: result.diagnosis,
          causes: result.causes,
          primaryCause: result.primaryCause,
          skeletonId: id,
          handInput: assignment.handInput,
        });
        continue;
      }

      record({
        attempt: attempts,
        stage: "verification",
        outcome: "accepted",
        diagnosis: result.diagnosis,
        causes: [],
        skeletonId: id,
        handInput: assignment.handInput,
      });

      return {
        status: "ok",
        hand: {
          handInput: assignment.handInput,
          analysis: result.analysis,
          canonical: result.canonical,
          ambiguity: result.ambiguity,
          seed,
          stats: { attempts, rejections, diagnoses },
        },
      };
    }
  }

  return { status: "exhausted", attempts, rejections, diagnoses, nearMisses };
}
