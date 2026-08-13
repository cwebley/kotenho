import { MahjongTile } from "../models/mahjong-tile.js";
import { StandardGroup } from "../models/standard-group.js";

/**
 * The lowest tile of a run.
 *
 * Not simply `tiles[0]`: a called meld arrives in whatever order the caller
 * supplied, and `isValidMeld` sorts only a copy while validating. Any yaku that
 * matches on run position must derive the start rather than assume it.
 */
export function runStart(group: StandardGroup): MahjongTile {
  const ranks = group.tiles.map((tile) => Number(tile[0]));
  return `${Math.min(...ranks)}${group.tiles[0][1]}` as MahjongTile;
}
