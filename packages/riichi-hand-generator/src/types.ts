import type {
  Direction,
  HandAnalysis,
  HandInput,
  HandInterpretation,
  WaitType,
} from "riichi-score";

export type WinMethod = "ron" | "tsumo";

/** A lesson description. Every field is optional; omitted means "generator's choice". */
export interface GenerateSpec {
  /** Constrain the winning shape. Kokushi is not modelled yet. */
  handShape?: "standard" | "chiitoitsu";
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
  roundWind?: Direction;
  seatWind?: Direction;
}

export interface GenerateOptions {
  seed?: number;
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
  | "fu-mismatch"
  | "wait-mismatch"
  | "ambiguous-wait"
  | "assignment-failed";

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
