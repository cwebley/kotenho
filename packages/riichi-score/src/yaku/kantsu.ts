import { HandInterpretation } from "../models/hand-interpretation.js";
import { YakuListing } from "../models/yaku.js";

const KAN_TYPES = ["ankan", "daiminkan", "shouminkan"];

export function createSankantsuListing(): YakuListing {
  return { name: "sankantsu", han: 2 };
}

export function createSuukantsuListing(): YakuListing {
  return { name: "suukantsu", han: 0, limit: "yakuman" };
}

/** Three kans of any type is sankantsu; four is suukantsu. */
export function detectKantsu(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }

  const kans = handInterpretation.groups.filter((group) =>
    KAN_TYPES.includes(group.type),
  ).length;

  if (kans >= 4) {
    handInterpretation.yaku.push(createSuukantsuListing());
  } else if (kans === 3) {
    handInterpretation.yaku.push(createSankantsuListing());
  }

  return handInterpretation;
}
