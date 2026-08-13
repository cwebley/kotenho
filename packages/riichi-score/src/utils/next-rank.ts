import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Given a suit tile like '3m', returns the next rank tile (e.g. '4m'),
 * '9m' returns '10m'.
 * Since the correct response to '4m' could be '5m' or '0m',
 * This function does not consider red 5s and expects those are substituted beforehand.
 */
export function nextRank(tile: MahjongTile): MahjongTile {
  const rank = parseInt(tile);
  const suit = tile[tile.length - 1];

  return `${rank + 1}${suit}` as MahjongTile;
}
