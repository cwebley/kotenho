import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Determine the dora tile given a doraIndicator.
 * Given a suit tile like '3m', returns the next rank tile (e.g. '4m'),
 * '9m' returns '1m'.
 * Since the correct response to '4m' could be '5m' or '0m',
 * This function does not consider red 5s and expects those are substituted beforehand.
 */
export function determineDoraTile(tile: MahjongTile): MahjongTile {
  const rank = parseInt(tile);
  const suit = tile[tile.length - 1];

  let nextRank = rank + 1;
  if (nextRank > 9) {
    nextRank = 1;
  }
  if (suit === "z" && nextRank === 5) {
    nextRank = 1;
  }
  if (suit === "z" && nextRank > 7) {
    nextRank = 5;
  }

  return `${nextRank}${suit}` as MahjongTile;
}
