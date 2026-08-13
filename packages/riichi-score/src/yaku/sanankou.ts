import { HandInterpretation } from "../models/hand-interpretation.js";
import { YakuListing } from "../models/yaku.js";

export function createSanankouListing(): YakuListing {
  return {
    name: "sanankou",
    han: 2,
  };
}

export function createSuuankouListing(): YakuListing {
  return {
    name: "suuankou",
    han: 0,
    limit: "yakuman",
  };
}

/**
 * Sanankou is three concealed triplets; four is suuankou, which replaces it.
 *
 * Two subtleties decide the count:
 *  - a concealed kan counts as a concealed triplet;
 *  - a triplet completed by ron does NOT. The winning tile came from another
 *    player, so it is a minko — the same rule that gives it open-triplet fu.
 *    A hand that looks like three concealed triplets scores only two when the
 *    last one was claimed off a discard.
 */
export function detectSanankou(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }

  const concealed = handInterpretation.groups.filter((group) => {
    if (group.type === "run") return false;
    if (group.open) return false;
    if (!handInterpretation.winningTile.isTsumo && group.isFinalWait) {
      return false;
    }
    return true;
  }).length;

  if (concealed >= 4) {
    handInterpretation.yaku.push(createSuuankouListing());
  } else if (concealed === 3) {
    handInterpretation.yaku.push(createSanankouListing());
  }

  return handInterpretation;
}
