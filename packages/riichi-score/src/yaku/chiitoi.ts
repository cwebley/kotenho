import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";

export function createChiitoiListing(): YakuListing {
  return {
    name: "chiitoitsu",
    han: 2,
  };
}

/**
 * Kansai rules may count four identical concealed tiles as two pairs.
 */
export function detectChiitoi(
  closedTiles: MahjongTile[],
  kansaiChiitoitsu = false,
): boolean {
  if (closedTiles.length !== 14) {
    return false;
  }

  // count the frequency of each tile
  const freqMap = new Map<MahjongTile, number>();
  for (const tile of closedTiles) {
    freqMap.set(tile, (freqMap.get(tile) || 0) + 1);
  }

  if (!kansaiChiitoitsu && freqMap.size !== 7) return false;
  return [...freqMap.values()].every(
    (count) => count === 2 || (kansaiChiitoitsu && count === 4),
  );
}
