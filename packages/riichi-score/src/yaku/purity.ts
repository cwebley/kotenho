import { HandInterpretation } from "../models/hand-interpretation.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";
import { isHonorTile } from "../utils/is-honor-tile.js";
import { isTerminalTile } from "../utils/is-terminal-tile.js";

/** 2s 3s 4s 6s 8s and hatsu — the tiles printed entirely in green. */
const GREEN: MahjongTile[] = ["2s", "3s", "4s", "6s", "8s", "6z"];

export function createTsuuiisouListing(): YakuListing {
  return { name: "tsuuiisou", han: 0, limit: "yakuman" };
}

export function createChinroutouListing(): YakuListing {
  return { name: "chinroutou", han: 0, limit: "yakuman" };
}

export function createRyuuiisouListing(): YakuListing {
  return { name: "ryuuiisou", han: 0, limit: "yakuman" };
}

function allTiles(handInterpretation: HandInterpretation): MahjongTile[] {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation.tiles;
  }
  return [
    ...handInterpretation.pair.tiles,
    ...handInterpretation.groups.flatMap((group) => group.tiles),
  ];
}

/**
 * The three "made of one kind of tile" yakuman.
 *
 * Only tsuuiisou is reachable as chiitoitsu — there are seven honors but just
 * six terminals and six green tiles, so neither of the others can supply seven
 * distinct pairs.
 */
export function detectPurity(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  const tiles = allTiles(handInterpretation);

  if (tiles.every((tile) => isHonorTile(tile))) {
    handInterpretation.yaku.push(createTsuuiisouListing());
    return handInterpretation;
  }
  if (tiles.every((tile) => isTerminalTile(tile))) {
    handInterpretation.yaku.push(createChinroutouListing());
    return handInterpretation;
  }
  if (tiles.every((tile) => GREEN.includes(tile))) {
    handInterpretation.yaku.push(createRyuuiisouListing());
  }

  return handInterpretation;
}
