import type { MahjongTile } from "../models/mahjong-tile.js";
import { tileCompare } from "./tile-compare.js";

const SUITS = ["m", "p", "s", "z"] as const;

/** Return a sorted copy in display order: manzu, pinzu, souzu, honors. */
export function sortTiles(tiles: readonly MahjongTile[]): MahjongTile[] {
  return [...tiles].sort(tileCompare) as MahjongTile[];
}

/** Convert tiles to compact Tenhou-style notation, such as `4056p123z`. */
export function formatTiles(tiles: readonly MahjongTile[]): string {
  const sorted = sortTiles(tiles);
  return SUITS.map((suit) => {
    const ranks = sorted
      .filter((tile) => tile[1] === suit)
      .map((tile) => tile[0])
      .join("");
    return ranks ? `${ranks}${suit}` : "";
  }).join("");
}

/** Parse compact Tenhou-style notation into individual tile strings. */
export function parseTiles(notation: string): MahjongTile[] {
  const tiles: MahjongTile[] = [];
  let ranks = "";

  for (const character of notation) {
    if (character >= "0" && character <= "9") {
      ranks += character;
      continue;
    }
    if (!SUITS.includes(character as (typeof SUITS)[number]) || !ranks) {
      throw new Error(`Invalid tile notation: ${notation}`);
    }
    for (const rank of ranks) {
      const valid =
        character === "z"
          ? rank >= "1" && rank <= "7"
          : rank === "0" || (rank >= "1" && rank <= "9");
      if (!valid) throw new Error(`Invalid tile notation: ${notation}`);
      tiles.push(`${rank}${character}` as MahjongTile);
    }
    ranks = "";
  }

  if (ranks) throw new Error(`Invalid tile notation: ${notation}`);
  return tiles;
}
