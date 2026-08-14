import type {
  Direction,
  HandAnalysis,
  HandInput,
  HandInterpretation,
} from "riichi-score";
import { assignTiles } from "./assign.js";
import { placeDora } from "./dora.js";
import { planTiles } from "./plan.js";
import { createRng, type Rng } from "./rng.js";
import type { Skeleton } from "./skeleton.js";
import { requiredDora } from "./yaku/static.js";
import type {
  AmbiguityFlags,
  AttemptRecord,
  GenerateSpec,
  IntendedReadingDiagnosis,
  NearMiss,
  RejectionCause,
} from "./types.js";
import { verify } from "./verify.js";

const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];
const ATTEMPTS_PER_SKELETON = 20;
const NEAR_MISS_LIMIT = 5;

export interface AcceptedCandidate {
  handInput: HandInput;
  analysis: HandAnalysis;
  canonical: HandInterpretation;
  ambiguity: AmbiguityFlags;
  diagnosis: IntendedReadingDiagnosis;
}

export interface SearchRun {
  attempts: number;
  rejections: Record<string, number>;
  diagnoses: Record<string, number>;
  nearMisses: NearMiss[];
  accepted: AcceptedCandidate[];
}

interface SearchOptions {
  seed: number;
  budget: number;
  requireUnambiguousWait: boolean;
  stopOnFirstSuccess: boolean;
  onAttempt?: (record: AttemptRecord) => void;
}

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

/** Resolve winds for one attempt, forcing a double-wind pair when necessary. */
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

/** Run the shared planner/verifier loop for either generation or analysis. */
export function runSearch(
  spec: GenerateSpec,
  candidates: Skeleton[],
  options: SearchOptions,
): SearchRun {
  const rng: Rng = createRng(options.seed);
  const rejections: Record<string, number> = {};
  const diagnoses: Record<string, number> = {};
  const nearMisses: NearMiss[] = [];
  const accepted: AcceptedCandidate[] = [];

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
    options.onAttempt?.(entry);
  };

  // Shuffle rather than iterate in table order: skeleton choice is the largest
  // source of variety between calls, and first-fit would make every hand for a
  // given spec structurally identical.
  const order = rng.shuffled(candidates);
  let attempts = 0;
  let cursor = 0;

  while (attempts < options.budget) {
    const skeleton = order[cursor % order.length];
    cursor++;
    const id = skeletonId(skeleton);

    for (
      let i = 0;
      i < ATTEMPTS_PER_SKELETON && attempts < options.budget;
      i++
    ) {
      const winds = resolveWinds(skeleton, spec, rng.pick);
      if (!winds) break;

      attempts++;
      const plan = planTiles(
        skeleton,
        spec.yaku ?? [],
        winds.roundWind,
        winds.seatWind,
        rng,
      );
      const assignment = plan
        ? assignTiles(skeleton, plan, winds.roundWind, winds.seatWind, rng)
        : null;
      if (assignment) {
        // Dora runs last: choosing indicators never changes the tiles, so it
        // cannot disturb anything decided above.
        const need = requiredDora(spec) ?? { dora: 0, ura: 0 };
        const riichiDeclared =
          Boolean(spec.riichi) ||
          (spec.yaku ?? []).includes("riichi") ||
          (spec.yaku ?? []).includes("double-riichi");
        const slots = spec.doraIndicatorCount ?? 1;
        const input = assignment.handInput;
        const placement = placeDora(
          [
            ...input.closedTiles,
            input.winningTile.tile,
            ...(input.openMelds ?? []).flatMap((meld) => meld.tiles),
          ],
          slots,
          need.dora,
          riichiDeclared ? slots : 0,
          need.ura,
          rng,
        );
        if (!placement) {
          record({
            attempt: attempts,
            stage: "verification",
            outcome: "rejected",
            causes: ["dora-unplaceable"],
            primaryCause: "dora-unplaceable",
            skeletonId: id,
            handInput: input,
          });
          continue;
        }
        input.gameState = {
          ...input.gameState!,
          isRiichi: riichiDeclared,
          isIppatsu: Boolean(spec.ippatsu),
          doraIndicators: placement.doraIndicators,
          uradoraIndicators: placement.uradoraIndicators,
        };
      }
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
        options.requireUnambiguousWait,
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
      accepted.push({
        handInput: assignment.handInput,
        analysis: result.analysis,
        canonical: result.canonical,
        ambiguity: result.ambiguity,
        diagnosis: result.diagnosis,
      });

      if (options.stopOnFirstSuccess) {
        return { attempts, rejections, diagnoses, nearMisses, accepted };
      }
    }
  }

  return { attempts, rejections, diagnoses, nearMisses, accepted };
}
