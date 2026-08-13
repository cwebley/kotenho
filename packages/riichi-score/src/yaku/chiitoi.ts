import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";

export function createChiitoiListing(): YakuListing {
  return {
    name: "chiitoitsu",
    han: 2,
  };
}

/**
 * Takes an array of sorted MahjongTiles and returns true if chiitoitsu is detected
 * TODO: next update, handle kansai chiitoi through options potentially
 */
export function detectChiitoi(closedTiles: MahjongTile[]): boolean {
  if (closedTiles.length !== 14) {
    return false;
  }

  // count the frequency of each tile
  const freqMap = new Map<MahjongTile, number>();
  for (const tile of closedTiles) {
    freqMap.set(tile, (freqMap.get(tile) || 0) + 1);
  }

  // check that we have exactly 7 distinct tiles
  if (freqMap.size !== 7) {
    return false;
  }

  // each distinct tile must appear exactly twice
  for (const [_, count] of freqMap) {
    if (count !== 2) {
      return false;
    }
  }
  return true;
}
