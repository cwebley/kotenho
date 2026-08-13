import { MahjongTile } from "../models/mahjong-tile.js";

/**
 * Red 5s are typically notated with the rank of 0.
 * But for lots of our validation logic, we need to consider it as a normal 5.
 * This normalize function takes in a hand with red 5s and returns a hand with
 * the red 5s replaced by normal 5s.
 */
export function replaceAkadora(tiles: MahjongTile[]): MahjongTile[] {
  return tiles.map((t) => {
    let rank = parseInt(t);
    const suit = t[t.length - 1];
    if (rank === 0) {
      rank = 5;
    }
    return `${rank}${suit}` as MahjongTile;
  });
}
