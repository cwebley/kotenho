import { HandInterpretation } from "../models/hand-interpretation.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";
import { isHonorTile } from "../utils/is-honor-tile.js";

const isWindTile = (tile: MahjongTile): boolean =>
  isHonorTile(tile) && Number(tile[0]) <= 4;

export function createShousuushiiListing(): YakuListing {
  return { name: "shousuushii", han: 0, limit: "yakuman" };
}

export function createDaisuushiiListing(doubleYakuman = false): YakuListing {
  return { name: "daisuushii", han: 0, limit: doubleYakuman ? "double-yakuman" : "yakuman" };
}

/** Four wind triplets is daisuushii; three plus a wind pair is shousuushii. */
export function detectWinds(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }

  const windTriplets = handInterpretation.groups.filter(
    (group) => group.type !== "run" && isWindTile(group.tiles[0]),
  ).length;

  if (windTriplets >= 4) {
    handInterpretation.yaku.push(
      createDaisuushiiListing(handInterpretation.gameState.ruleset?.doubleYakuman.daisuushii),
    );
  } else if (
    windTriplets === 3 &&
    isWindTile(handInterpretation.pair.tiles[0])
  ) {
    handInterpretation.yaku.push(createShousuushiiListing());
  }

  return handInterpretation;
}
