import { HandInterpretation } from "../models/hand-interpretation.js";
import { YakuListing } from "../models/yaku.js";

export function createToitoiListing(): YakuListing {
  return {
    name: "toitoi",
    han: 2,
  };
}

/**
 * All four groups are triplets or kans — no runs. Open or closed, and it stacks
 * freely with sanankou, which counts how many of those triplets are concealed.
 */
export function detectToitoi(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }
  if (handInterpretation.groups.some((group) => group.type === "run")) {
    return handInterpretation;
  }

  handInterpretation.yaku.push(createToitoiListing());
  return handInterpretation;
}
