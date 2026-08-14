export { calculate } from "./calculate.js";
export { createGameState } from "./models/game-state.js";
export { createRuleset, TENHOU_RULESET } from "./models/ruleset.js";
export { formatTiles, parseTiles, sortTiles } from "./utils/tile-notation.js";

// Consumers build HandInput values and read HandAnalysis back, so the types are
// part of the public contract, not internals.
export type { GameState, GameStateOptions } from "./models/game-state.js";
export type { Ruleset, RulesetOptions } from "./models/ruleset.js";
export type { HandInput, Meld } from "./models/hand-input.js";
export type { HandAnalysis } from "./models/hand-analysis.js";
export type {
  HandInterpretation,
  StandardHandInterpretation,
  NonStandardHandInterpretation,
} from "./models/hand-interpretation.js";
export type {
  MahjongTile,
  SuitTile,
  HonorTile,
  Suit,
  SuitRank,
  HonorRank,
} from "./models/mahjong-tile.js";
export type { Direction } from "./models/direction.js";
export type { GroupType } from "./models/group-type.js";
export type { WaitType, KokushiWaitType } from "./models/wait-type.js";
export type { WinningTile } from "./models/winning-tile.js";
export type { StandardGroup } from "./models/standard-group.js";
export type { StandardPair } from "./models/standard-pair.js";
export type { YakuName, YakuhaiName, YakuListing, Limit } from "./models/yaku.js";
export type { FuReason, FuListing, TotalFuValue } from "./parsing/parse-fu.js";
export type { SeatPayment } from "./utils/calculate-seat-payments.js";
