import { MahjongTile } from "../models/mahjong-tile.js";
import { WinningTile } from "../models/winning-tile.js";
import { KokushiWaitType } from "../models/wait-type.js";
import { YakuListing } from "../models/yaku.js";

export function createKokushiListing(): YakuListing {
  return {
    name: "kokushi-musou",
    han: 13,
  };
}

/**
 * Takes an array of sorted MahjongTiles and returns a KokushiWaitType or false
 */
export function detectKokushiWait(
  closedTiles: MahjongTile[],
  winningTile: WinningTile,
): KokushiWaitType | false {
  if (closedTiles.length !== 14) {
    return false;
  }

  const kokushiTiles: MahjongTile[] = [
    "1m",
    "9m",
    "1p",
    "9p",
    "1s",
    "9s",
    "1z",
    "2z",
    "3z",
    "4z",
    "5z",
    "6z",
    "7z",
  ];

  const hasAllOrphans = kokushiTiles.every((kokushiTile) => {
    return closedTiles.indexOf(kokushiTile) !== -1;
  });
  if (!hasAllOrphans) {
    return false;
  }

  let kokushiPairTile: MahjongTile | undefined;

  for (let i = 0; i < closedTiles.length - 1; i++) {
    if (closedTiles[i] === closedTiles[i + 1]) {
      kokushiPairTile = closedTiles[i];
      break;
    }
  }
  if (!kokushiPairTile) {
    return false;
  }
  return kokushiPairTile === winningTile.tile
    ? "kokushi-wide"
    : "kokushi-single";
}
