import { nextRank } from "../utils/next-rank.js";
import { removeTiles } from "../utils/remove-tiles.js";
import { StandardGroup, createStandardGroup } from "../models/standard-group.js";
import { MahjongTile } from "../models/mahjong-tile.js";
/**
 * Attempts to parse all possible groups ("set" or "run") from a sorted
 * subset of tiles (already excluding the pair), returning an array of
 * possible interpretations.
 *
 * Example:
 *  parseGroups(['1m','1m','1m','2m','2m','2m','3m','3m','3m'])
 *  could return two interpretations:
 *    1) [ [111m], [222m], [333m] ]
 *    2) [ [123m], [123m], [123m] ]
 * in the format of StandardGroup arrays.
 *
 * @param tiles - The remaining tiles (length multiple of 3).
 * @returns An array of interpretations. Each interpretation is an array of StandardGroup.
 *          If none found, returns an empty array.
 */
export function parseGroups(tiles: MahjongTile[]): StandardGroup[][] {
  // If no tiles left, that means we've successfully grouped everything!
  if (tiles.length === 0) {
    // Return one valid interpretation: the empty grouping
    return [[]];
  }

  // If fewer than 3 tiles remain, we can't form a set or run
  if (tiles.length < 3) {
    return [];
  }

  const firstTile = tiles[0];

  // Attempt to form a "set" (three identical tiles) from the first tile.
  const setCandidate = [firstTile, firstTile, firstTile];
  const remainingAfterSet = removeTiles(tiles, setCandidate);

  // Attempt to form a "run" (three consecutive suited tiles) from the first tile.
  const runCandidate = [
    firstTile,
    nextRank(firstTile),
    nextRank(nextRank(firstTile)),
  ];
  const remainingAfterRun = removeTiles(tiles, runCandidate);

  // We'll accumulate all valid interpretations here
  const results: StandardGroup[][] = [];

  // 1) If we can remove a set, recurse on the remainder
  if (remainingAfterSet) {
    const group = createStandardGroup({
      tiles: setCandidate,
      type: "set",
      open: false,
    });

    // Recursively parse the rest
    const subInterpretations = parseGroups(remainingAfterSet);
    // For each sub-interpretation, prepend our "set"
    for (const sub of subInterpretations) {
      results.push([group, ...sub]);
    }
  }

  // 2) If we can remove a run, recurse on the remainder
  if (remainingAfterRun) {
    const group = createStandardGroup({
      tiles: runCandidate,
      type: "run",
      open: false,
    });

    // Recursively parse the rest
    const subInterpretations = parseGroups(remainingAfterRun);
    // For each sub-interpretation, prepend our "run"
    for (const sub of subInterpretations) {
      results.push([group, ...sub]);
    }
  }
  return results;
}
