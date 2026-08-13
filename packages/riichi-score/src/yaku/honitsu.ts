import { HandInterpretation } from "../models/hand-interpretation.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";
import { isHonorTile } from "../utils/is-honor-tile.js";

export function createHonitsuListing(closed: boolean): YakuListing {
  return {
    name: "honitsu",
    han: closed ? 3 : 2,
  };
}

export function createChinitsuListing(closed: boolean): YakuListing {
  return {
    name: "chinitsu",
    han: closed ? 6 : 5,
  };
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

function isMenzen(handInterpretation: HandInterpretation): boolean {
  return (
    handInterpretation.isStandardHand !== true ||
    handInterpretation.groups.every((group) => !group.open)
  );
}

/**
 * Honitsu is one numbered suit plus honors; chinitsu is one numbered suit and
 * nothing else. Chinitsu replaces honitsu rather than stacking with it. Both
 * apply to chiitoitsu as well as standard shapes.
 */
export function detectHonitsu(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  const tiles = allTiles(handInterpretation);
  const suits = new Set(
    tiles.filter((tile) => !isHonorTile(tile)).map((tile) => tile[1]),
  );

  // No numbered tiles at all is tsuuiisou, a yakuman, not honitsu. We do not
  // detect tsuuiisou yet, so such a hand is left under-scored rather than given
  // a plausible-but-wrong yaku.
  if (suits.size !== 1) {
    return handInterpretation;
  }

  const closed = isMenzen(handInterpretation);
  const hasHonors = tiles.some((tile) => isHonorTile(tile));
  handInterpretation.yaku.push(
    hasHonors ? createHonitsuListing(closed) : createChinitsuListing(closed),
  );

  return handInterpretation;
}
