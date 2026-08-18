import type {
  Direction,
  HandAnalysis,
  HandInput,
  HandInterpretation,
  RulesetOptions,
  WaitType,
  YakuName,
} from "riichi-score";
import type { StructuralSamplingConfigOverrides } from "./sampling-config.js";

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
  | "wait-mismatch"
  | "ambiguous-wait"
  | "assignment-failed"
  | "duplicate-in-batch";

/**
 * Why the reading the planner built is not the one that scored. Only
 * planner-defect is a regression in this package — the other three are
 * expected, and conflating them would make the tripwire useless exactly when
 * scorer coverage is thinnest.
 */
export type IntendedReadingDiagnosis =
  /** Intended reading present and on target; a peer simply outscored it. */
  | "drift"
  /** Intended reading present but missed its own target: bad fu table or template. */
  | "planner-defect"
  /** Intended reading filtered out for carrying no yaku the scorer can detect. */
  | "coverage-shadow"
  /** Intended reading was the canonical one. */
  | "matched";

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
