import { HandInterpretation } from "../models/hand-interpretation.js";
import { YakuListing } from "../models/yaku.js";

export function createIipeikoListing(): YakuListing {
  return {
    name: "iipeiko",
    han: 1,
  };
}

export function createRyanpeikouListing(): YakuListing {
  return {
    name: "ryanpeikou",
    han: 3,
  };
}

/**
 * Iipeiko is two identical runs. Ryanpeikou is two such pairs, and it replaces
 * iipeiko rather than stacking with it. Both are closed-only — calling any tile
 * destroys them, though a concealed kan does not.
 */
export function detectIipeiko(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }
  if (handInterpretation.groups.some((group) => group.open)) {
    return handInterpretation;
  }

  const runCounts = new Map<string, number>();
  handInterpretation.groups.forEach((group) => {
    if (group.type !== "run") {
      return;
    }
    const key = group.tiles.join("");
    runCounts.set(key, (runCounts.get(key) ?? 0) + 1);
  });

  let duplicatedPairs = 0;
  runCounts.forEach((count) => {
    duplicatedPairs += Math.floor(count / 2);
  });

  if (duplicatedPairs >= 2) {
    handInterpretation.yaku.push(createRyanpeikouListing());
  } else if (duplicatedPairs === 1) {
    handInterpretation.yaku.push(createIipeikoListing());
  }

  return handInterpretation;
}
