import { MahjongTile } from "../models/mahjong-tile.js";
import { Direction } from "../models/direction.js";

/**
 * Given a wind Direction, return the corresponding MahjongTile.
 * Useful for determining yakuhai triplets and value pairs
 */
export function translateWindToTile(wind: Direction): MahjongTile {
  const windMap = {
    east: "1z",
    south: "2z",
    west: "3z",
    north: "4z",
  };
  return windMap[wind] as MahjongTile;
}
