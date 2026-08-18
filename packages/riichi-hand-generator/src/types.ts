import type {
  Direction,
  GroupType,
  HandAnalysis,
  HandInput,
  HandInterpretation,
  Limit,
  RulesetOptions,
  WaitType,
  YakuName,
} from "riichi-score";
import type {
  OpenHandBaseYakuCategory,
  StructuralSamplingConfigOverrides,
} from "./sampling-config.js";

export type WinMethod = "ron" | "tsumo";
export type WindConstraint = Direction | readonly Direction[];

/**
 * `"exact"` — the hand has these yaku and no others. This is the default
 * because it is what a drill needs: a learner practising tanyao should not keep
 * tripping over sanshoku. It is also the cheaper mode, since a pinned yaku set
 * makes han an equation rather than a search.
 *
 * `"atLeast"` — these yaku plus whatever else turns up.
 */
export type YakuPolicy = "exact" | "atLeast";

/** One group the hand must contain, written as `"234p"` or `"2p3p4p"`. */
export interface RequiredGroupOptions {
  tiles: string;
  /** Called from another player: chi, pon, daiminkan. Defaults to false. */
  called?: boolean;
  /**
   * Pins the meld type. Only kans are ambiguous — ankan, daiminkan and
   * shouminkan share a shape but not a story, and shouminkan is the one that
   * lets another player rob it. Implies `called`, so the two cannot disagree.
   */
  meldType?: GroupType;
}

export type RequiredGroupSpec = string | RequiredGroupOptions;

/** A lesson description. Every field is optional; omitted means "generator's choice". */
export interface GenerateSpec {
  /** Ruleset overrides carried into each generated hand's game state. */
  ruleset?: RulesetOptions;
  /** The yaku the hand must have. */
  yaku?: YakuName[];
  /** Defaults to `"exact"`. */
  yakuPolicy?: YakuPolicy;
  /** Total han, including dora. Needs dora to be reachable — see `dora`. */
  han?: number;
  /** Omote dora carried by the hand. */
  dora?: number;
  /**
   * Indicators face up. A property of the TABLE, not the hand — any player's
   * kan flips one, so a kan-free hand can still face several. Includes the
   * initial indicator; valid values are 1 through 5. Defaults to 1.
   */
  doraIndicatorCount?: number;
  /** Ura dora. Requires riichi, which is what reveals the ura indicators. */
  uraDora?: number;
  /** Red dora carried by physical red fives in the hand. */
  akaDora?: number;
  /** Constrain the winning shape. */
  handShape?: "standard" | "chiitoitsu" | "kokushi";
  /** Rounded fu, exactly. */
  fu?: number;
  /**
   * The yakuman multiplier, exactly. The only way to select between a yakuman's
   * single and doubled forms: junsei chuuren and plain chuuren are the same
   * yaku name at different limits, so `yaku` cannot tell them apart. Requires a
   * ruleset that enables the corresponding `doubleYakuman` flag.
   */
  limit?: Limit;
  waitType?: WaitType;
  winMethod?: WinMethod;
  /** True forces a concealed hand. A concealed kan still counts as closed. */
  closed?: boolean;
  /** Number of melds called from other players. Ankan does not count. */
  openMeldCount?: number;
  /** Total kans of any type. */
  kanCount?: number;
  /** A fixed wind or seeded-random selection from allowed winds. */
  roundWind?: WindConstraint;
  /** A fixed wind or seeded-random selection from allowed winds. */
  seatWind?: WindConstraint;
  /**
   * Groups the hand must contain, as concrete tiles. Everything the spec does
   * not pin is still sampled, so `["234p", "567p"]` fixes six tiles and leaves
   * the rest of the hand free.
   *
   * This is the only way to describe a wait *shape*: riichi-score reports the
   * wait of the group the winning tile completed, so a sanmenchan and a plain
   * ryanmen are both `"ryanmen"` to `waitType`. Pinning `["234p", "567p"]` with
   * `requiredWinningTile: "7p"` puts 23456p in the hand and the 1p/4p/7p wait
   * with it.
   */
  requiredGroups?: RequiredGroupSpec[];
  /** The pair, as concrete tiles: `"77p"`. */
  requiredPair?: string;
  /**
   * The winning tile. Must complete one of the concealed `requiredGroups` or
   * the `requiredPair` — pinning it anywhere else would leave the wait to be
   * searched for rather than looked up.
   */
  requiredWinningTile?: string;
}

export interface GenerateOptions {
  seed?: number;
  /** Proposal distribution overrides; omitted values use DEFAULT_SAMPLING_CONFIG. */
  sampling?: StructuralSamplingConfigOverrides;
  /** Maximum verifier calls before giving up. */
  budget?: number;
  /**
   * Observer for every candidate. Must not touch generator state — it never
   * consumes the RNG, so attaching a sink cannot change the output for a seed.
   */
  onAttempt?: (record: AttemptRecord) => void;
  /**
   * Reject hands whose wait is not uniquely determined. Kotenho only settles
   * the score, so score-tied readings with different waits are all correct —
   * which makes such a hand unusable for a "name the wait" exercise.
   */
  requireUnambiguousWait?: boolean;
  /**
   * TEST ONLY. Skips every *inferred* static claim — yaku incompatibility,
   * shape exclusion, dora reachability — leaving the definitional skeleton
   * filters in place. Exists so the soundness fuzz can challenge an
   * "unsatisfiable" verdict: claim it is impossible, then be given 50,000
   * attempts to prove otherwise. Never use it in production; the static engine
   * is what makes impossibility a proof rather than a timeout.
   */
  __unsafeSkipInferredChecks?: boolean;
}

export interface BatchGenerateOptions extends GenerateOptions {
  /** Number of materially distinct hands to generate. */
  count: number;
  /** Maximum verifier calls across the entire batch. */
  budget?: number;
}

export interface AnalyzeOptions {
  seed?: number;
  sampling?: StructuralSamplingConfigOverrides;
  /** Number of candidate attempts in the seeded probe. Defaults to 100. */
  sampleSize?: number;
  requireUnambiguousWait?: boolean;
}

export interface AnalyzeResult {
  /** False only when the static engine proves the spec impossible. */
  feasible: boolean;
  reason?: string;
  /** Accepted candidates divided by sampled candidate attempts. */
  estimatedYield: number;
  /** Unique accepted hand identities divided by accepted candidates. */
  distinctRatio: number;
  /** Actual candidate attempts made by the probe. */
  sampleSize: number;
  /** All rejection causes observed during the probe. */
  rejections: Record<string, number>;
  /** Accepted samples by internally selected open-hand lesson target. */
  baseYakuCounts?: Partial<Record<OpenHandBaseYakuCategory, number>>;
}

/** Which dimensions the score-tied top readings disagree on. Diagnostic only. */
export interface AmbiguityFlags {
  wait: boolean;
  fu: boolean;
  han: boolean;
  yaku: boolean;
}

export interface GeneratedHand {
  /** riichi-score's own input shape: feed it back to calculate() to re-derive. */
  handInput: HandInput;
  /** Verbatim calculate() output. This is the answer key. */
  analysis: HandAnalysis;
  /** analysis.handInterpretations[0] — the reading kotenho selects. */
  canonical: HandInterpretation;
  ambiguity: AmbiguityFlags;
  /** Internally selected lesson target for an otherwise unconstrained open hand. */
  baseYakuCategory?: OpenHandBaseYakuCategory;
  seed: number;
  stats: {
    attempts: number;
    rejections: Record<string, number>;
    diagnoses: Record<string, number>;
  };
}

export type RejectionCause =
  | "invalid-hand"
  | "no-yaku"
  | "yaku-mismatch"
  | "dora-unplaceable"
  | "aka-unplaceable"
  | "han-mismatch"
  | "fu-mismatch"
  | "limit-mismatch"
  | "wait-mismatch"
  | "ambiguous-wait"
  | "assignment-failed"
  | "duplicate-in-batch";

/**
 * Why the reading the planner built is not the one that scored. Only
 * planner-defect is a regression in this package — the rest are expected, and
 * conflating them would make the tripwire useless exactly when scorer coverage
 * is thinnest.
 */
export type IntendedReadingDiagnosis =
  /** Intended reading present and on target; a peer simply outscored it. */
  | "drift"
  /** Intended reading present but missed its own target: bad fu table or template. */
  | "planner-defect"
  /** Intended reading filtered out for carrying no yaku the scorer can detect. */
  | "coverage-shadow"
  /** Intended reading was the canonical one. */
  | "matched"
  /**
   * There was no intended reading to compare. Nine gates is assigned as a whole
   * multiset rather than block by block, so the planner never forms a grouping
   * and has nothing to be right or wrong about. Recorded explicitly rather than
   * left blank: a missing diagnosis already means "rejected before the scorer
   * ran", and overloading that would hide both facts.
   */
  | "not-aimed";

export interface AttemptRecord {
  attempt: number;
  stage: "assignment" | "verification";
  outcome: "accepted" | "rejected";
  diagnosis?: IntendedReadingDiagnosis;
  /** Every violated constraint, never just the first — otherwise the histogram
   *  shape is an artefact of check order rather than of the hands. */
  causes: RejectionCause[];
  /** Deterministic pick from `causes`; drives how far the search backtracks. */
  primaryCause?: RejectionCause;
  skeletonId: string;
  baseYakuCategory?: OpenHandBaseYakuCategory;
  /** Present from the verification stage on, for offline analysis. */
  handInput?: HandInput;
}

/** A candidate that failed on exactly one constraint. */
export interface NearMiss {
  closedTiles: string[];
  winningTile: string;
  violated: RejectionCause;
}

export type GenerateResult =
  /** Proven impossible before any search, with a reason a lesson author can act on. */
  | { status: "unsatisfiable"; reason: string }
  /** Not proven impossible; the budget ran out. Different fact, different fix. */
  | {
      status: "exhausted";
      attempts: number;
      rejections: Record<string, number>;
      diagnoses: Record<string, number>;
      /** Failed on exactly one constraint — tells an author what to relax. */
      nearMisses: NearMiss[];
    }
  | { status: "ok"; hand: GeneratedHand };

export type GenerateBatchResult =
  | { status: "unsatisfiable"; requested: number; reason: string }
  | {
      status: "exhausted";
      requested: number;
      attempts: number;
      rejections: Record<string, number>;
      diagnoses: Record<string, number>;
      nearMisses: NearMiss[];
    }
  | {
      status: "shortfall";
      requested: number;
      hands: GeneratedHand[];
      attempts: number;
      rejections: Record<string, number>;
      diagnoses: Record<string, number>;
      reason: string;
    }
  | {
      status: "ok";
      requested: number;
      hands: GeneratedHand[];
      attempts: number;
      rejections: Record<string, number>;
      diagnoses: Record<string, number>;
    };
