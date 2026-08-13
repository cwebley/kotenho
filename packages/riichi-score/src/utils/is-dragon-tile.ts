import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Returns true if a tile is a dragon tile.
 */
export function isDragonTile(tile: MahjongTile): boolean {
  const suit = tile[tile.length - 1];
  if (suit !== "z") {
    return false;
  }
  const rank = parseInt(tile);
  return rank >= 5;
}
