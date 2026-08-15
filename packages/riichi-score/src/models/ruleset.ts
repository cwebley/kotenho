/** Scoring choices that vary between otherwise standard riichi rulesets. */
export interface Ruleset {
  /** Whether an open all-simples hand receives tanyao. */
  openTanyao: boolean;
  /** Fu awarded to a pair matching both round and seat wind. */
  doubleWindPairFu: 2 | 4;
  /** Fu floor for an open all-run hand with no other fu. */
  openPinfuMinimumFu: 20 | 30;
  /** Promote 4 han 30 fu and 3 han 60 fu to mangan. */
  kiriageMangan: boolean;
  /** Treat 13+ naturally accumulated han as yakuman rather than sanbaiman. */
  kazoeYakuman: boolean;
  /** Permit four matching concealed tiles to count as two chiitoitsu pairs. */
  kansaiChiitoitsu: boolean;
  /** Local single-hand double-yakuman variants. */
  doubleYakuman: {
    daisuushii: boolean;
    kokushi13Wait: boolean;
    suuankouTanki: boolean;
    junseiChuuren: boolean;
  };
  /** Physical red-five availability by suit. */
  akaDora: { manzu: number; pinzu: number; souzu: number };
}

export type RulesetOptions = Omit<Partial<Ruleset>, "akaDora" | "doubleYakuman"> & {
  akaDora?: Partial<Ruleset["akaDora"]>;
  doubleYakuman?: Partial<Ruleset["doubleYakuman"]>;
};

/** The established current behavior, named so callers can select it explicitly. */
export const TENHOU_RULESET: Readonly<Ruleset> = Object.freeze({
  openTanyao: true,
  doubleWindPairFu: 4,
  openPinfuMinimumFu: 30,
  kiriageMangan: false,
  kazoeYakuman: true,
  kansaiChiitoitsu: false,
  doubleYakuman: Object.freeze({
    daisuushii: false,
    kokushi13Wait: false,
    suuankouTanki: false,
    junseiChuuren: false,
  }),
  akaDora: Object.freeze({ manzu: 1, pinzu: 1, souzu: 1 }),
});

/** Resolve caller overrides without allowing shared default state to be mutated. */
export function createRuleset(options: RulesetOptions = {}): Ruleset {
  return {
    ...TENHOU_RULESET,
    ...options,
    doubleYakuman: { ...TENHOU_RULESET.doubleYakuman, ...options.doubleYakuman },
    akaDora: { ...TENHOU_RULESET.akaDora, ...options.akaDora },
  };
}
