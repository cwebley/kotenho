import { HandInterpretation } from "../models/hand-interpretation.js";
import { YakuListing } from "../models/yaku.js";
import { isSimpleTile } from "../utils/is-simple-tile.js";

export function createTanyaoListing(): YakuListing {
  return {
    name: "tanyao",
    han: 1,
  };
}

/**
 * Takes a HandInterpretation and updates the yakuList with tanyao if it finds tanyao is valid
 */
export function detectTanyao(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }
  const allTiles = [
    ...handInterpretation.pair.tiles,
    ...handInterpretation.groups.flatMap((g) => g.tiles),
  ];

  if (!allTiles.every((t) => isSimpleTile(t))) {
    return handInterpretation;
  }

  handInterpretation.yaku.push(createTanyaoListing());
  return handInterpretation;
}
