import type { Direction, YakuName } from "riichi-score";
import type {
  OpenHandBaseYakuCategory,
  StructuralSamplingConfig,
} from "./sampling-config.js";
import { selectSkeletons, type Skeleton } from "./skeleton.js";
import type { GenerateSpec, WindConstraint } from "./types.js";
import { checkYakuFeasibility } from "./yaku/static.js";

const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];
const DEFAULT_ROUND_WINDS: Direction[] = ["east", "south"];

const BASE_CATEGORIES: OpenHandBaseYakuCategory[] = [
  "tanyao",
  "honitsu",
  "chinitsu",
  "chanta",
  "junchan",
  "sanankou",
  "toitoi",
  "haku",
  "hatsu",
  "chun",
  "round-wind",
  "seat-wind",
  "double-wind",
  "ittsuu",
  "sanshoku",
];

const OPEN_HAN: Record<OpenHandBaseYakuCategory, number> = {
  tanyao: 1,
  honitsu: 2,
  chinitsu: 5,
  chanta: 1,
  junchan: 2,
  sanankou: 2,
  toitoi: 2,
  haku: 1,
  hatsu: 1,
  chun: 1,
  "round-wind": 1,
  "seat-wind": 1,
  "double-wind": 2,
  ittsuu: 1,
  sanshoku: 1,
};

const yakuFor = (category: OpenHandBaseYakuCategory): YakuName[] =>
  category === "double-wind"
    ? ["round-wind", "seat-wind"]
    : [category];

const allowedWinds = (
  constraint: WindConstraint | undefined,
  fallback: Direction[],
): Direction[] =>
  constraint === undefined
    ? [...fallback]
    : [...new Set(Array.isArray(constraint) ? constraint : [constraint])];

function supportsDoubleWind(spec: GenerateSpec): boolean {
  const rounds = allowedWinds(spec.roundWind, DEFAULT_ROUND_WINDS);
  const seats = allowedWinds(spec.seatWind, DIRECTIONS);
  return rounds.some((wind) => seats.includes(wind));
}

export interface SearchVariant {
  spec: GenerateSpec;
  candidates: Skeleton[];
  weight: number;
  baseYakuCategory?: OpenHandBaseYakuCategory;
  forceSameWind: boolean;
}

export type PrepareSearchVariantsResult =
  | { ok: true; variants: SearchVariant[] }
  | { ok: false; reason: string };

export function prepareSearchVariants(
  spec: GenerateSpec,
  sampling: StructuralSamplingConfig,
  skipInferred = false,
): PrepareSearchVariantsResult {
  if (!skipInferred) {
    const check = checkYakuFeasibility(spec);
    if (!check.ok) return { ok: false, reason: check.reason! };
  }

  const explicitlyOpen =
    spec.closed === false ||
    (spec.openMeldCount !== undefined && spec.openMeldCount > 0);
  const chooseBase = explicitlyOpen && (spec.yaku?.length ?? 0) === 0;
  if (!chooseBase) {
    const { candidates, reason } = selectSkeletons(spec, skipInferred);
    return candidates.length
      ? {
          ok: true,
          variants: [
            {
              spec,
              candidates,
              weight: 1,
              forceSameWind: false,
            },
          ],
        }
      : {
          ok: false,
          reason: reason ?? "no hand shape satisfies these constraints",
        };
  }

  const fixedBonus =
    (spec.dora ?? 0) + (spec.uraDora ?? 0) + (spec.akaDora ?? 0);
  const variants: SearchVariant[] = [];
  for (const category of BASE_CATEGORIES) {
    const weight = sampling.openHandBaseYakuWeights[category];
    if (weight <= 0) continue;
    if (category === "double-wind" && !supportsDoubleWind(spec)) continue;
    if (
      spec.han !== undefined &&
      spec.han < OPEN_HAN[category] + fixedBonus
    ) {
      continue;
    }

    const effectiveSpec: GenerateSpec = {
      ...spec,
      yaku: yakuFor(category),
      yakuPolicy: "atLeast",
    };
    if (!skipInferred) {
      const check = checkYakuFeasibility(effectiveSpec);
      if (!check.ok) continue;
    }
    let candidates = selectSkeletons(effectiveSpec, skipInferred).candidates;
    if (category === "double-wind") {
      candidates = candidates.filter(
        (candidate) => candidate.pair !== "doubleWind",
      );
    }
    if (!candidates.length) continue;
    variants.push({
      spec: effectiveSpec,
      candidates,
      weight,
      baseYakuCategory: category,
      forceSameWind: category === "double-wind",
    });
  }

  return variants.length
    ? { ok: true, variants }
    : {
        ok: false,
        reason:
          "no configured open-hand base yaku is feasible under these constraints",
      };
}
