import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Returns true if a tile is an honor tile
 */
export function isHonorTile(tile: MahjongTile): boolean {
  const suit = tile[tile.length - 1];
  return suit === "z";
}
