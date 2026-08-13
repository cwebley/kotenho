import { HandInterpretation } from "../models/hand-interpretation.js";
import { YakuListing } from "../models/yaku.js";
import { isDragonTile } from "../utils/is-dragon-tile.js";

export function createShousangenListing(): YakuListing {
  return { name: "shousangen", han: 2 };
}

export function createDaisangenListing(): YakuListing {
  return { name: "daisangen", han: 0, limit: "yakuman" };
}

/**
 * Three dragon triplets is daisangen; two plus a dragon pair is shousangen.
 *
 * Shousangen is only 2 han on its own, but it always arrives with the two
 * yakuhai from those dragon triplets, so it is effectively 4.
 */
export function detectDragons(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }

  const dragonTriplets = handInterpretation.groups.filter(
    (group) => group.type !== "run" && isDragonTile(group.tiles[0]),
  ).length;

  if (dragonTriplets >= 3) {
    handInterpretation.yaku.push(createDaisangenListing());
  } else if (
    dragonTriplets === 2 &&
    isDragonTile(handInterpretation.pair.tiles[0])
  ) {
    handInterpretation.yaku.push(createShousangenListing());
  }

  return handInterpretation;
}
