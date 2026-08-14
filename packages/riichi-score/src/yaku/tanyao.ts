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
  const allTiles = handInterpretation.isStandardHand
    ? [
        ...handInterpretation.pair.tiles,
        ...handInterpretation.groups.flatMap((group) => group.tiles),
      ]
    : handInterpretation.tiles;

  if (!allTiles.every((t) => isSimpleTile(t))) {
    return handInterpretation;
  }
  if (
    handInterpretation.isStandardHand &&
    handInterpretation.groups.some((group) => group.open) &&
    handInterpretation.gameState.ruleset?.openTanyao === false
  ) {
    return handInterpretation;
  }

  handInterpretation.yaku.push(createTanyaoListing());
  return handInterpretation;
}
