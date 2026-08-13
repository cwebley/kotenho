import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Helper: remove a specific tiles (e.g. '3m','4m','5m') once from the array, if all are present.
 * Returns a new array of MahjongTiles
 */
export function removeTiles(
  parentArray: MahjongTile[],
  tilesToRemove: MahjongTile[],
): MahjongTile[] | null {
  const result = [...parentArray];

  // For each tile in tilesToRemove, remove its first occurrence from result
  for (const tile of tilesToRemove) {
    const index = result.indexOf(tile);
    if (index !== -1) {
      result.splice(index, 1);
    }
  }

  // only return the result array if we've removed all the tilesToRemove
  if (result.length === parentArray.length - tilesToRemove.length) {
    return result;
  }
  // return null if we were unsuccessful
  return null;
}
