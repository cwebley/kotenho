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
  stats: { attempts: number; rejections: Record<string, number> };
}

export type GenerateResult =
  /** Proven impossible before any search, with a reason a lesson author can act on. */
  | { status: "unsatisfiable"; reason: string }
  /** Not proven impossible; the budget ran out. Different fact, different fix. */
  | { status: "exhausted"; attempts: number; rejections: Record<string, number> }
  | { status: "ok"; hand: GeneratedHand };
