import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Returns true if a tile is a valid MahjongTile. 0-9m, 0-9p, 0-9s, 1-7z
 */
export function isValidTile(tile: MahjongTile): boolean {
  const rank = parseInt(tile);
  const suit = tile[tile.length - 1];
  const validSuits = ["m", "p", "s", "z"];
  if (validSuits.indexOf(suit) === -1) {
    return false;
  }
  if (suit === "z") {
    if (rank > 7 || rank < 0) {
      return false;
    }
  }
  if (rank > 9 || rank < 0) {
    return false;
  }
  return true;
}
