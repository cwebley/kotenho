import { MahjongTile } from "../models/mahjong-tile.js";
import { HandInterpretation } from "../models/hand-interpretation.js";

/**
 * Given an array of red fives, this function will replace the first instance
 * of the corresponding regular five with a red five starting from the pair tiles
 * and continuing through the group tiles if needed.
 */
export function rehydrateRedFives(
  redFives: MahjongTile[],
  handInterpretation: HandInterpretation,
): HandInterpretation {
  redFives.forEach((redFiveTile) => {
    const redFiveTileSuit = redFiveTile[redFiveTile.length - 1];
    const regular5ForReplacing = `5${redFiveTileSuit}` as MahjongTile;
    if (handInterpretation.isStandardHand) {
      // try to replace a regular 5 from a pair that's the same suit as the red 5 we're iterating through
      const redFiveTileIndex =
        handInterpretation.pair.tiles.indexOf(regular5ForReplacing);
      if (redFiveTileIndex !== -1) {
        // replace the regular 5 with the red 5
        handInterpretation.pair.tiles[redFiveTileIndex] = redFiveTile;
        return;
      }

      let redFiveRestored = false;
      // if we didn't replace a regular 5 in the pair,
      // replace a regular 5 from a group that's the same suit as the red 5 we're iterating through
      handInterpretation.groups.forEach((parsedGroup) => {
        if (redFiveRestored) {
          return;
        }
        const redFiveTileIndex =
          parsedGroup.tiles.indexOf(regular5ForReplacing);
        if (redFiveTileIndex !== -1) {
          // replace the regular 5 with the red 5
          parsedGroup.tiles[redFiveTileIndex] = redFiveTile;
          redFiveRestored = true;
        }
      });
    } else {
      const redFiveTileIndex =
        handInterpretation.tiles.indexOf(regular5ForReplacing);
      handInterpretation.tiles[redFiveTileIndex] = redFiveTile;
    }
  });
  return handInterpretation;
}
