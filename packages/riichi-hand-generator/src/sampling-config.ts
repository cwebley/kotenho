export type SamplingProfile = "structural" | "uniform";

export interface GroupWeights {
  readonly run: number;
  readonly triplet: number;
}

export interface RunWeights {
  readonly interior: number;
  readonly terminal: number;
}

export interface TripletWeights {
  readonly simple: number;
  readonly terminalOrHonor: number;
}

export interface PairClassWeights {
  readonly plain: number;
  readonly yakuhai: number;
  readonly doubleWind: number;
}

export interface PairWeights {
  readonly differentWinds: PairClassWeights;
  readonly sameWind: PairClassWeights;
}

export interface RunWaitWeights {
  readonly ryanmen: number;
  readonly kanchan: number;
  readonly penchan: number;
}

export interface WaitWeights {
  readonly tanki: number;
  readonly shanpon: number;
  readonly interiorRun: RunWaitWeights;
  readonly terminalRun: RunWaitWeights;
}

export interface StructuralSamplingConfig {
  readonly profile: SamplingProfile;
  readonly atLeastRiichiChance: number;
  readonly groupWeights: GroupWeights;
  readonly runWeights: RunWeights;
  readonly tripletWeights: TripletWeights;
  readonly pairWeights: PairWeights;
  readonly waitWeights: WaitWeights;
}

export interface StructuralSamplingConfigOverrides {
  profile?: SamplingProfile;
  atLeastRiichiChance?: number;
  groupWeights?: Partial<GroupWeights>;
  runWeights?: Partial<RunWeights>;
  tripletWeights?: Partial<TripletWeights>;
  pairWeights?: {
    differentWinds?: Partial<PairClassWeights>;
    sameWind?: Partial<PairClassWeights>;
  };
  waitWeights?: {
    tanki?: number;
    shanpon?: number;
    interiorRun?: Partial<RunWaitWeights>;
    terminalRun?: Partial<RunWaitWeights>;
  };
}

/** The complete default proposal policy. Raw weights are normalized in use. */
export const DEFAULT_SAMPLING_CONFIG: StructuralSamplingConfig = Object.freeze({
  profile: "structural",
  atLeastRiichiChance: 0.7,
  groupWeights: Object.freeze({
    run: 4,
    triplet: 1,
  }),
  runWeights: Object.freeze({
    interior: 5,
    terminal: 2,
  }),
  tripletWeights: Object.freeze({
    simple: 21,
    terminalOrHonor: 13,
  }),
  pairWeights: Object.freeze({
    differentWinds: Object.freeze({
      plain: 29,
      yakuhai: 5,
      doubleWind: 0,
    }),
    sameWind: Object.freeze({
      plain: 30,
      yakuhai: 3,
      doubleWind: 1,
    }),
  }),
  waitWeights: Object.freeze({
    tanki: 1,
    shanpon: 1,
    interiorRun: Object.freeze({
      ryanmen: 10,
      kanchan: 5,
      penchan: 0,
    }),
    terminalRun: Object.freeze({
      ryanmen: 2,
      kanchan: 2,
      penchan: 2,
    }),
  }),
});

function validateWeights(name: string, weights: object): void {
  const values = Object.values(weights) as number[];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError(`${name} must contain finite, non-negative weights`);
  }
  if (values.every((value) => value === 0)) {
    throw new RangeError(`${name} must contain at least one positive weight`);
  }
}

export function resolveSamplingConfig(
  overrides: StructuralSamplingConfigOverrides = {},
): StructuralSamplingConfig {
  const config: StructuralSamplingConfig = {
    profile: overrides.profile ?? DEFAULT_SAMPLING_CONFIG.profile,
    atLeastRiichiChance:
      overrides.atLeastRiichiChance ??
      DEFAULT_SAMPLING_CONFIG.atLeastRiichiChance,
    groupWeights: {
      ...DEFAULT_SAMPLING_CONFIG.groupWeights,
      ...overrides.groupWeights,
    },
    runWeights: {
      ...DEFAULT_SAMPLING_CONFIG.runWeights,
      ...overrides.runWeights,
    },
    tripletWeights: {
      ...DEFAULT_SAMPLING_CONFIG.tripletWeights,
      ...overrides.tripletWeights,
    },
    pairWeights: {
      differentWinds: {
        ...DEFAULT_SAMPLING_CONFIG.pairWeights.differentWinds,
        ...overrides.pairWeights?.differentWinds,
      },
      sameWind: {
        ...DEFAULT_SAMPLING_CONFIG.pairWeights.sameWind,
        ...overrides.pairWeights?.sameWind,
      },
    },
    waitWeights: {
      tanki:
        overrides.waitWeights?.tanki ??
        DEFAULT_SAMPLING_CONFIG.waitWeights.tanki,
      shanpon:
        overrides.waitWeights?.shanpon ??
        DEFAULT_SAMPLING_CONFIG.waitWeights.shanpon,
      interiorRun: {
        ...DEFAULT_SAMPLING_CONFIG.waitWeights.interiorRun,
        ...overrides.waitWeights?.interiorRun,
      },
      terminalRun: {
        ...DEFAULT_SAMPLING_CONFIG.waitWeights.terminalRun,
        ...overrides.waitWeights?.terminalRun,
      },
    },
  };

  if (config.profile !== "structural" && config.profile !== "uniform") {
    throw new RangeError("sampling.profile must be structural or uniform");
  }
  if (
    !Number.isFinite(config.atLeastRiichiChance) ||
    config.atLeastRiichiChance < 0 ||
    config.atLeastRiichiChance > 1
  ) {
    throw new RangeError(
      "sampling.atLeastRiichiChance must be between 0 and 1",
    );
  }
  validateWeights("sampling.groupWeights", config.groupWeights);
  validateWeights("sampling.runWeights", config.runWeights);
  validateWeights("sampling.tripletWeights", config.tripletWeights);
  validateWeights(
    "sampling.pairWeights.differentWinds",
    config.pairWeights.differentWinds,
  );
  validateWeights("sampling.pairWeights.sameWind", config.pairWeights.sameWind);
  validateWeights("sampling.waitWeights", {
    tanki: config.waitWeights.tanki,
    shanpon: config.waitWeights.shanpon,
  });
  validateWeights(
    "sampling.waitWeights.interiorRun",
    config.waitWeights.interiorRun,
  );
  validateWeights(
    "sampling.waitWeights.terminalRun",
    config.waitWeights.terminalRun,
  );

  return config;
}
