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
  /** Physical red-five availability by suit. */
  akaDora: { manzu: number; pinzu: number; souzu: number };
}

export type RulesetOptions = Partial<Ruleset>;

/** The established current behavior, named so callers can select it explicitly. */
export const TENHOU_RULESET: Readonly<Ruleset> = Object.freeze({
  openTanyao: true,
  doubleWindPairFu: 4,
  openPinfuMinimumFu: 30,
  kiriageMangan: false,
  kazoeYakuman: true,
  akaDora: Object.freeze({ manzu: 1, pinzu: 1, souzu: 1 }),
});

/** Resolve caller overrides without allowing shared default state to be mutated. */
export function createRuleset(options: RulesetOptions = {}): Ruleset {
  return {
    ...TENHOU_RULESET,
    ...options,
    akaDora: { ...TENHOU_RULESET.akaDora, ...options.akaDora },
  };
}
