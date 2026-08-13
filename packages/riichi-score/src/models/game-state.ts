import { Direction } from "./direction.js";
import { MahjongTile } from "./mahjong-tile.js";

export interface GameState {
  roundWind: Direction;
  seatWind: Direction;
  doraIndicators: MahjongTile[];
  uradoraIndicators: MahjongTile[];
  isRiichi: boolean;
  honbaCount: number;
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
  honbaCount?: number;
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
  honbaCount = 0,
}: GameStateOptions = {}): GameState {
  return {
    roundWind,
    seatWind,
    doraIndicators,
    uradoraIndicators,
    isRiichi,
    honbaCount,
  };
}
