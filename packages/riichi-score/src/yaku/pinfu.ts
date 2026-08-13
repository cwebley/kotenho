import { HandInterpretation } from "../models/hand-interpretation.js";
import { translateWindToTile } from "../utils/translate-wind-to-tile.js";
import { YakuListing } from "../models/yaku.js";

export function createPinfuListing(): YakuListing {
  return {
    name: "pinfu",
    han: 1,
  };
}

/**
 * Takes a HandInterpretation and updates the yakuList with pinfu if it finds pinfu is valid
 */
export function detectPinfu(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }
  if (handInterpretation.waitType !== "ryanmen") {
    return handInterpretation;
  }

  const roundWindTile = translateWindToTile(
    handInterpretation.gameState.roundWind,
  );
  const seatWindTile = translateWindToTile(
    handInterpretation.gameState.seatWind,
  );

  const pinfuGroups = handInterpretation.groups.filter(
    (group) => !group.open && group.type === "run",
  );
  if (pinfuGroups.length !== 4) {
    return handInterpretation;
  }

  if (
    handInterpretation.pair.tiles[0] === seatWindTile ||
    handInterpretation.pair.tiles[0] === roundWindTile
  ) {
    return handInterpretation;
  }

  if (
    handInterpretation.pair.tiles[0] === "5z" ||
    handInterpretation.pair.tiles[0] === "6z" ||
    handInterpretation.pair.tiles[0] === "7z"
  ) {
    return handInterpretation;
  }

  handInterpretation.yaku.push(createPinfuListing());
  return handInterpretation;
}
