import { MahjongTile } from "./mahjong-tile.js";

/**
 * Input options for creating a StandardPair.
 * 'tiles' is required, 'isFinalWait' is optional.
 */
export interface StandardPairOptions {
  tiles: MahjongTile[];
  isFinalWait?: boolean;
}

/**
 * The final shape after applying defaults.
 */
export interface StandardPair {
  tiles: MahjongTile[];
  isFinalWait: boolean;
}

/**
 * Factory function that merges defaults and returns a fully-initialized StandardPair.
 */
export function createStandardPair({
  tiles,
  isFinalWait = false,
}: StandardPairOptions): StandardPair {
  return {
    tiles,
    isFinalWait,
  };
}
