import { MahjongTile } from "../models/mahjong-tile.js";
import { parseGroups } from "./parse-groups.js";

import { StandardGroup } from "../models/standard-group.js";
import { createStandardPair, StandardPair } from "../models/standard-pair.js";

/**
 * TODO: description
 */
export interface ParsedClosedTiles {
  pair: StandardPair;
  groups: StandardGroup[];
}

export function parseStandardHandCombinations(
  sortedClosedTiles: MahjongTile[],
): ParsedClosedTiles[] {
  const allParsedInterpretations: ParsedClosedTiles[] = [];

  // Handle standard hands of 4 groups and a pair.
  // First look for a pair candidate
  for (let i = 0; i < sortedClosedTiles.length - 1; i++) {
    // Skip duplicates we've already tried as pair
    if (i > 0 && sortedClosedTiles[i] === sortedClosedTiles[i - 1]) {
      continue;
    }

    // If tiles i and i+1 are the same, they MIGHT be our pair
    if (sortedClosedTiles[i] === sortedClosedTiles[i + 1]) {
      // Remove these two tiles from the array
      const remainingTiles = [
        ...sortedClosedTiles.slice(0, i),
        ...sortedClosedTiles.slice(i + 2),
      ];
      const parsedPair = createStandardPair({
        tiles: [sortedClosedTiles[i], sortedClosedTiles[i + 1]],
      });

      const parsedGroupInterpretations = parseGroups(remainingTiles);

      // add the pair each parsedGroupInterpretation to create a waitlessHandInterpretation
      const waitlessHandInterpretations = parsedGroupInterpretations.map(
        (parsedGroupInterpretation) => {
          return {
            pair: parsedPair,
            groups: parsedGroupInterpretation,
          };
        },
      );

      allParsedInterpretations.push(...waitlessHandInterpretations);
    }
  }
  return allParsedInterpretations;
}
