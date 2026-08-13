/**
 * Returns true if tile is in a suit (m/p/s) instead of honors (z).
 */
export function isSuitTile(tile: string): boolean {
  const suit = tile[tile.length - 1];
  return suit === "m" || suit === "p" || suit === "s";
}
