import { Suit } from "../models/mahjong-tile.js";

/**
 * Compare function to sort tiles in ascending order by suit & rank.
 * E.g.: 1m < 2m < ... < 9m < 1p < 2p ... < 9p < 1s ... < 9s < 1z ... < 7z
 */
export function tileCompare(a: string, b: string): number {
  // suits might be m, p, s, z
  // ranks: 1-9 for suits, 1-7 for honors (z)
  // We can map them to numeric order for sorting
  const suitOrder = { m: 0, p: 1, s: 2, z: 3 };
  const rankA = parseInt(a);
  const rankB = parseInt(b);

  const suitA = a[a.length - 1] as Suit;
  const suitB = b[b.length - 1] as Suit;

  // Compare suits
  if (suitOrder[suitA] !== suitOrder[suitB]) {
    return suitOrder[suitA] - suitOrder[suitB];
  }

  // If same suit, compare rank
  return rankA - rankB;
}
