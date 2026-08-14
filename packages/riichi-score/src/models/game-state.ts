import { Direction } from "./direction.js";
import { MahjongTile } from "./mahjong-tile.js";
import { createRuleset, Ruleset, RulesetOptions } from "./ruleset.js";

export interface GameState {
  roundWind: Direction;
  seatWind: Direction;
  doraIndicators: MahjongTile[];
  uradoraIndicators: MahjongTile[];
  isRiichi: boolean;
  isDoubleRiichi?: boolean;
  isIppatsu?: boolean;
  isHaitei?: boolean;
  isHoutei?: boolean;
  isRinshan?: boolean;
  isChankan?: boolean;
  isTenhou?: boolean;
  isChiihou?: boolean;
  honbaCount: number;
  /** Resolved by createGameState; optional for source compatibility with v1 inputs. */
  ruleset?: Ruleset;
}

/**
 * The options a caller can pass in to create a GameState.
 * All are optional, because we have defaults.
 */
export interface GameStateOptions {
  roundWind?: Direction;
  seatWind?: Direction;
  doraIndicators?: MahjongTile[];
  uradoraIndicators?: MahjongTile[];
  isRiichi?: boolean;
  isDoubleRiichi?: boolean;
  isIppatsu?: boolean;
  isHaitei?: boolean;
  isHoutei?: boolean;
  isRinshan?: boolean;
  isChankan?: boolean;
  isTenhou?: boolean;
  isChiihou?: boolean;
  honbaCount?: number;
  ruleset?: RulesetOptions;
}

/**
 * Factory function: merges defaults and returns a fully-specified GameState.
 */
export function createGameState({
  roundWind = "east",
  seatWind = "south",
  doraIndicators = [],
  uradoraIndicators = [],
  isRiichi = false,
  isDoubleRiichi = false,
  isIppatsu = false,
  isHaitei = false,
  isHoutei = false,
  isRinshan = false,
  isChankan = false,
  isTenhou = false,
  isChiihou = false,
  honbaCount = 0,
  ruleset,
}: GameStateOptions = {}): GameState {
  return {
    roundWind,
    seatWind,
    doraIndicators,
    uradoraIndicators,
    isRiichi,
    isDoubleRiichi,
    isIppatsu,
    isHaitei,
    isHoutei,
    isRinshan,
    isChankan,
    isTenhou,
    isChiihou,
    honbaCount,
    ruleset: createRuleset(ruleset),
  };
}
