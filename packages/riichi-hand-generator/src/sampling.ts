import type { Direction } from "riichi-score";
import type { Rng } from "./rng.js";
import {
  DEFAULT_SAMPLING_CONFIG,
  type StructuralSamplingConfig,
} from "./sampling-config.js";
import type { Block, Skeleton } from "./skeleton.js";
import type { GenerateSpec, WindConstraint } from "./types.js";

const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];
const DEFAULT_ROUND_WINDS: Direction[] = ["east", "south"];

const factorial = (value: number): number => {
  let result = 1;
  for (let factor = 2; factor <= value; factor++) result *= factor;
  return result;
};

const allowedWinds = (
  constraint: WindConstraint | undefined,
  fallback: readonly Direction[],
): Direction[] =>
  constraint === undefined
    ? [...fallback]
    : [...new Set(Array.isArray(constraint) ? constraint : [constraint])];

const blockKey = (block: Block): string =>
  `${block.kind}:${block.called ? "open" : "closed"}:${block.edge}`;

const compositionKey = (skeleton: Skeleton): string =>
  skeleton.blocks.map(blockKey).sort().join("|");

const stratumKey = (skeleton: Skeleton): string =>
  [
    skeleton.shape,
    skeleton.tsumo ? "tsumo" : "ron",
    skeleton.calledMelds,
    skeleton.kanCount,
  ].join(":");

/**
 * Structural prior for one independently chosen group. Runs are four times as
 * likely as triplets; concrete tile support divides each family into disjoint
 * simple/interior and terminal/honor classes.
 */
function blockProbability(
  block: Block,
  config: StructuralSamplingConfig,
): number {
  const groupTotal = config.groupWeights.run + config.groupWeights.triplet;
  if (block.kind === "run") {
    const runTotal = config.runWeights.interior + config.runWeights.terminal;
    return (
      (config.groupWeights.run / groupTotal) *
      (block.edge === "terminalRun"
        ? config.runWeights.terminal / runTotal
        : config.runWeights.interior / runTotal)
    );
  }
  const tripletTotal =
    config.tripletWeights.simple + config.tripletWeights.terminalOrHonor;
  return (
    (config.groupWeights.triplet / groupTotal) *
    (block.edge === "simple"
      ? config.tripletWeights.simple / tripletTotal
      : config.tripletWeights.terminalOrHonor / tripletTotal)
  );
}

function compositionProbability(
  skeleton: Skeleton,
  config: StructuralSamplingConfig,
): number {
  const counts = new Map<string, number>();
  for (const block of skeleton.blocks) {
    const key = blockKey(block);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const arrangements =
    factorial(skeleton.blocks.length) /
    [...counts.values()].reduce(
      (product, count) => product * factorial(count),
      1,
    );
  return (
    arrangements *
    skeleton.blocks.reduce(
      (probability, block) => probability * blockProbability(block, config),
      1,
    )
  );
}

/** Average number of concrete pair identities across the permitted winds. */
function pairSupport(
  skeleton: Skeleton,
  spec: GenerateSpec,
  config: StructuralSamplingConfig,
): number {
  let roundWinds = allowedWinds(spec.roundWind, DEFAULT_ROUND_WINDS);
  let seatWinds = allowedWinds(spec.seatWind, DIRECTIONS);
  const requested = new Set(spec.yaku ?? []);
  if (requested.has("tenhou"))
    seatWinds = seatWinds.filter((wind) => wind === "east");
  if (requested.has("chiihou"))
    seatWinds = seatWinds.filter((wind) => wind !== "east");
  if (!roundWinds.length || !seatWinds.length) return 0;

  let support = 0;
  let states = 0;
  for (const round of roundWinds) {
    for (const seat of seatWinds) {
      states++;
      const doubleWind = round === seat;
      const weights = doubleWind
        ? config.pairWeights.sameWind
        : config.pairWeights.differentWinds;
      support += weights[skeleton.pair];
    }
  }
  return support / states;
}

/** Number of local pre-win forms represented by this wait-host record. */
function waitSupport(
  skeleton: Skeleton,
  config: StructuralSamplingConfig,
): number {
  if (skeleton.waitHost === -1) return config.waitWeights.tanki;

  const host = skeleton.blocks[skeleton.waitHost];
  const hostMultiplicity = skeleton.blocks.filter(
    (block) =>
      block.kind === host.kind &&
      block.called === host.called &&
      block.edge === host.edge,
  ).length;

  if (host.kind === "triplet") {
    return hostMultiplicity * config.waitWeights.shanpon;
  }
  if (host.kind !== "run") return 0;

  const localForms =
    host.edge === "terminalRun"
      ? config.waitWeights.terminalRun
      : config.waitWeights.interiorRun;
  if (
    skeleton.wait !== "ryanmen" &&
    skeleton.wait !== "kanchan" &&
    skeleton.wait !== "penchan"
  ) {
    return 0;
  }
  const totalForms = Object.values(localForms).reduce(
    (sum, forms) => sum + forms,
    0,
  );
  return hostMultiplicity * (localForms[skeleton.wait] / totalForms);
}

/**
 * Assign probability mass without allowing internal skeleton representation
 * count to become an accidental sampling policy.
 */
export function structuralWeights(
  candidates: Skeleton[],
  spec: GenerateSpec,
  config: StructuralSamplingConfig = DEFAULT_SAMPLING_CONFIG,
): Map<Skeleton, number> {
  const weights = new Map<Skeleton, number>();
  const strata = new Map<string, Skeleton[]>();
  for (const candidate of candidates) {
    const key = stratumKey(candidate);
    const members = strata.get(key) ?? [];
    members.push(candidate);
    strata.set(key, members);
  }

  for (const members of strata.values()) {
    // Preserve current shape/win/open/kan mass in this first profile. Weighting
    // only replaces record multiplicity inside a comparable structural stratum.
    const stratumMass = members.length / candidates.length;
    if (members[0].shape !== "standard") {
      for (const member of members) {
        weights.set(member, stratumMass / members.length);
      }
      continue;
    }

    const compositions = new Map<string, Skeleton[]>();
    for (const member of members) {
      const key = compositionKey(member);
      const composition = compositions.get(key) ?? [];
      composition.push(member);
      compositions.set(key, composition);
    }
    const compositionTotal = [...compositions.values()].reduce(
      (sum, composition) =>
        sum + compositionProbability(composition[0], config),
      0,
    );

    for (const composition of compositions.values()) {
      const mass =
        stratumMass *
        (compositionProbability(composition[0], config) / compositionTotal);
      const support = composition.map(
        (candidate) =>
          pairSupport(candidate, spec, config) * waitSupport(candidate, config),
      );
      const supportTotal = support.reduce((sum, value) => sum + value, 0);
      composition.forEach((candidate, index) => {
        weights.set(
          candidate,
          supportTotal > 0 ? mass * (support[index] / supportTotal) : 0,
        );
      });
    }
  }

  return weights;
}

/** Seeded weighted random order without replacement. */
export function candidateOrder(
  candidates: Skeleton[],
  spec: GenerateSpec,
  config: StructuralSamplingConfig,
  rng: Rng,
): Skeleton[] {
  if (config.profile === "uniform") return rng.shuffled(candidates);
  const weights = structuralWeights(candidates, spec, config);
  const supported = candidates.filter(
    (candidate) => (weights.get(candidate) ?? 0) > 0,
  );
  const unsupported = candidates.filter(
    (candidate) => (weights.get(candidate) ?? 0) === 0,
  );
  return [
    ...supported
      .map((candidate) => ({
        candidate,
        priority:
          -Math.log(Math.max(rng.next(), Number.MIN_VALUE)) /
          weights.get(candidate)!,
      }))
      .sort((left, right) => left.priority - right.priority)
      .map(({ candidate }) => candidate),
    // Zero support normally means an impossible wind/pair combination. Keep it
    // as fallback so weighting can never weaken exhaustive search semantics.
    ...rng.shuffled(unsupported),
  ];
}
