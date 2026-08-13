import { HandInterpretation } from "../models/hand-interpretation.js";
import { translateWindToTile } from "../utils/translate-wind-to-tile.js";
import { YakuhaiName, YakuListing } from "../models/yaku.js";
import { StandardGroup } from "../models/standard-group.js";

export function createYakuhaiListing(name: YakuhaiName): YakuListing {
  return {
    name,
    han: 1,
  };
}

/**
 * Takes a HandInterpretation and updates the yakuList if it finds a yakuhai triplet
 */
export function detectYakuhai(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (!handInterpretation.isStandardHand) {
    return handInterpretation;
  }
  const groups = handInterpretation.groups || [];
  const roundWindTile = translateWindToTile(
    handInterpretation.gameState.roundWind,
  );
  const seatWindTile = translateWindToTile(
    handInterpretation.gameState.seatWind,
  );
  groups.forEach((group: StandardGroup) => {
    if (group.type === "run") {
      return;
    }
    if (group.tiles[0] === roundWindTile) {
      handInterpretation.yaku.push(createYakuhaiListing("round-wind"));
    }
    if (group.tiles[0] === seatWindTile) {
      handInterpretation.yaku.push(createYakuhaiListing("seat-wind"));
    }
    if (group.tiles[0] === "5z") {
      handInterpretation.yaku.push(createYakuhaiListing("haku"));
    }
    if (group.tiles[0] === "6z") {
      handInterpretation.yaku.push(createYakuhaiListing("hatsu"));
    }
    if (group.tiles[0] === "7z") {
      handInterpretation.yaku.push(createYakuhaiListing("chun"));
    }
  });

  return handInterpretation;
}
