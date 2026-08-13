import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Count the number of red 5s given a flattened list of tiles;
 */
export function countRedFives(tiles: MahjongTile[]): number {
  return tiles.filter((t) => t === "0m" || t === "0p" || t === "0s").length;
}
