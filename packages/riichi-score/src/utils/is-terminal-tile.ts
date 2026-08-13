import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Returns true if a tile is a terminal
 */
export function isTerminalTile(tile: MahjongTile): boolean {
  const rank = parseInt(tile);
  const suit = tile[tile.length - 1];
  if (suit === "z") {
    return false;
  }
  return rank === 1 || rank === 9;
}
