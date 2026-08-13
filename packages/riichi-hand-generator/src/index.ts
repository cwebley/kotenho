export { generate } from "./generate.js";
export { allSkeletons, selectSkeletons, computeFu } from "./skeleton.js";
export { createRng } from "./rng.js";

export { assignTiles, readingSignature } from "./assign.js";
export { verify } from "./verify.js";

export type {
  GenerateSpec,
  GenerateOptions,
  GenerateResult,
  GeneratedHand,
  AmbiguityFlags,
  WinMethod,
  AttemptRecord,
  NearMiss,
  RejectionCause,
  IntendedReadingDiagnosis,
} from "./types.js";
export type { Assignment, IntendedReading } from "./assign.js";
export type {
  Block,
  BlockKind,
  EdgeClass,
  PairClass,
  Skeleton,
  SkeletonQuery,
} from "./skeleton.js";
export type { VerifyResult } from "./verify.js";
export type { Rng } from "./rng.js";
