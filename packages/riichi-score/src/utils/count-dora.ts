import { MahjongTile } from "../models/mahjong-tile.js";
import { determineDoraTile } from "./determine-dora-tile.js";

/**
 * Takes a dora indicator and a flatted list of tiles and returns a count of dora tile matches
 */
export function countDora(
  doraIndicator: MahjongTile,
  tiles: MahjongTile[],
): number {
  const doraTile = determineDoraTile(doraIndicator);
  const doraMatches = tiles.filter((t) => t === doraTile);
  return doraMatches.length;
}
