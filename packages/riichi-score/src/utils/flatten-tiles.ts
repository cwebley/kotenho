import { HandInterpretation } from "../models/hand-interpretation.js";
import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Takes in a HandInterpretation and returns a flattened list of all the tiles
 */
export function flattenTiles(
  handInterpretation: HandInterpretation,
): MahjongTile[] {
  if (!handInterpretation.isStandardHand) {
    return handInterpretation.tiles;
  }
  const pairTiles = handInterpretation.pair.tiles;
  const groupTiles = handInterpretation.groups.reduce(
    (acc: MahjongTile[], group) => {
      acc.push(...group.tiles);
      return acc;
    },
    [],
  );
  return [...pairTiles, ...groupTiles];
}
