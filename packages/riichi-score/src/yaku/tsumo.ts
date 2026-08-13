import { HandInterpretation } from "../models/hand-interpretation.js";
import { YakuListing } from "../models/yaku.js";

export function createTsumoListing(): YakuListing {
  return {
    name: "menzen-tsumo",
    han: 1,
  };
}

/**
 * Takes a HandInterpretation and updates the yakuList with menzen-tsumo if it finds tanyao is valid
 */
export function detectMenzenTsumo(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (!handInterpretation.winningTile.isTsumo) {
    return handInterpretation;
  }
  if (
    handInterpretation.isStandardHand &&
    handInterpretation.groups.some((group) => group.open)
  ) {
    return handInterpretation;
  }

  handInterpretation.yaku.push(createTsumoListing());
  return handInterpretation;
}
