import { Meld } from "../models/hand-input.js";
import { isValidTile } from "./is-valid-tile.js";
import { nextRank } from "./next-rank.js";
import { replaceAkadora } from "./replace-akadora.js";
import { tileCompare } from "./tile-compare.js";

/**
 * Returns true if a meld is a valid.
 * This function will normalize the hand by replacing red 5s during its test cases
 */
export function isValidMeld(meld: Meld): boolean {
  const invalidTiles = meld.tiles.filter((t) => !isValidTile(t));
  if (invalidTiles.length) {
    return false;
  }

  // replace red 5s with normal 5s
  const normalizedTiles = replaceAkadora(meld.tiles);

  if (meld.type === "run") {
    if (meld.tiles.length !== 3) {
      return false;
    }
    const sortedTiles = normalizedTiles.sort(tileCompare);
    if (
      sortedTiles[1] === nextRank(sortedTiles[0]) &&
      sortedTiles[2] === nextRank(sortedTiles[1])
    ) {
      return true;
    }
  }
  if (meld.type === "set") {
    if (normalizedTiles.length !== 3) {
      return false;
    }
    if (
      normalizedTiles[1] === normalizedTiles[0] &&
      normalizedTiles[2] === normalizedTiles[1]
    ) {
      return true;
    }
  }
  if (meld.type === "daiminkan") {
    if (normalizedTiles.length !== 4) {
      return false;
    }
    if (
      normalizedTiles[1] === normalizedTiles[0] &&
      normalizedTiles[2] === normalizedTiles[1] &&
      normalizedTiles[3] === normalizedTiles[2]
    ) {
      return true;
    }
  }
  if (meld.type === "shouminkan") {
    if (normalizedTiles.length !== 4) {
      return false;
    }
    if (
      normalizedTiles[1] === normalizedTiles[0] &&
      normalizedTiles[2] === normalizedTiles[1] &&
      normalizedTiles[3] === normalizedTiles[2]
    ) {
      return true;
    }
  }
  if (meld.type === "ankan") {
    if (normalizedTiles.length !== 4) {
      return false;
    }
    if (
      normalizedTiles[1] === normalizedTiles[0] &&
      normalizedTiles[2] === normalizedTiles[1] &&
      normalizedTiles[3] === normalizedTiles[2]
    ) {
      return true;
    }
  }
  return false;
}
