import type {
  Direction,
  HandAnalysis,
  HandInput,
  HandInterpretation,
} from "riichi-score";
import { assignTiles } from "./assign.js";
import { placeAka } from "./aka.js";
import { placeDora } from "./dora.js";
import { planTiles } from "./plan.js";
import { createRng, type Rng } from "./rng.js";
import type { Skeleton } from "./skeleton.js";
import { declaredGameState, hasRiichi, requiredDora } from "./yaku/static.js";
import type {
  AmbiguityFlags,
  AttemptRecord,
  GenerateSpec,
  IntendedReadingDiagnosis,
  NearMiss,
  RejectionCause,
  WindConstraint,
} from "./types.js";
import { verify } from "./verify.js";

const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];
const DEFAULT_ROUND_WINDS: Direction[] = ["east", "south"];
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
function allowedWinds(
  constraint: WindConstraint | undefined,
  fallback: readonly Direction[],
): Direction[] {
  if (constraint === undefined) return [...fallback];
  return [...new Set(Array.isArray(constraint) ? constraint : [constraint])];
}

function resolveWinds(
  skeleton: Skeleton,
  spec: GenerateSpec,
  pick: <T>(items: readonly T[]) => T,
): { roundWind: Direction; seatWind: Direction } | null {
  const roundChoices = allowedWinds(spec.roundWind, DEFAULT_ROUND_WINDS);
  let seatChoices = allowedWinds(spec.seatWind, DIRECTIONS);
  const requested = new Set(spec.yaku ?? []);
  if (requested.has("tenhou")) seatChoices = seatChoices.filter((seat) => seat === "east");
  if (requested.has("chiihou")) seatChoices = seatChoices.filter((seat) => seat !== "east");
  if (!seatChoices.length) return null;
  if (skeleton.pair === "doubleWind") {
    const shared = roundChoices.filter((wind) => seatChoices.includes(wind));
    if (!shared.length) return null;
    const wind = pick(shared);
    return { roundWind: wind, seatWind: wind };
  }
  return { roundWind: pick(roundChoices), seatWind: pick(seatChoices) };
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
        const need =
          requiredDora(spec, !skeleton.menzen) ?? {
            dora: 0,
            ura: 0,
            aka: 0,
            flexibleBonus: 0,
          };
        const declared = declaredGameState(spec);
        const slots = spec.doraIndicatorCount ?? 1;
        const input = assignment.handInput;
        input.gameState = { ...input.gameState!, ...declared };
        const bonusSplits: { dora: number; ura: number; aka: number }[] = [];
        if (need.flexibleBonus === 0) {
          bonusSplits.push(need);
        } else {
          const maxAka = Math.min(
            need.flexibleBonus,
            Object.values(declared.ruleset.akaDora).reduce((sum, n) => sum + n, 0),
          );
          for (let aka = 0; aka <= maxAka; aka++) {
            const maxUra = hasRiichi(declared) ? need.flexibleBonus - aka : 0;
            for (let ura = 0; ura <= maxUra; ura++) {
              bonusSplits.push({
                dora: need.flexibleBonus - aka - ura,
                ura,
                aka,
              });
            }
          }
        }
        const bonus =
          need.flexibleBonus > 0 ? rng.pick(bonusSplits) : bonusSplits[0];
        if (!placeAka(input, bonus.aka, declared.ruleset, rng)) {
          record({
            attempt: attempts,
            stage: "assignment",
            outcome: "rejected",
            causes: ["aka-unplaceable"],
            primaryCause: "aka-unplaceable",
            skeletonId: id,
          });
          continue;
        }
        const placement = placeDora(
          [
            ...input.closedTiles,
            input.winningTile.tile,
            ...(input.openMelds ?? []).flatMap((meld) => meld.tiles),
          ],
          slots,
          bonus.dora,
          hasRiichi(declared) ? slots : 0,
          bonus.ura,
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
