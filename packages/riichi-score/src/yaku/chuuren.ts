import { HandInterpretation } from "../models/hand-interpretation.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";
import { isHonorTile } from "../utils/is-honor-tile.js";

/** The pure shape: 1112345678999, before the fourteenth tile is added. */
const BASE = [3, 1, 1, 1, 1, 1, 1, 1, 3];

export function createChuurenListing(doubleYakuman = false): YakuListing {
  return { name: "chuuren-poutou", han: 0, limit: doubleYakuman ? "double-yakuman" : "yakuman" };
}

function isJunseiChuuren(tiles: MahjongTile[], winningTile: MahjongTile): boolean {
  const ranks = tiles.map((tile) => (tile[0] === "0" ? 5 : Number(tile[0])));
  const winningRank = winningTile[0] === "0" ? 5 : Number(winningTile[0]);
  const winningIndex = ranks.indexOf(winningRank);
  if (winningIndex === -1) return false;
  ranks.splice(winningIndex, 1);
  const counts = new Array(9).fill(0);
  for (const rank of ranks) counts[rank - 1] += 1;
  return counts.every((count, rank) => count === BASE[rank]);
}

/**
 * Nine gates: 1112345678999 in a single suit plus any one duplicate of that
 * suit, fully concealed.
 *
 * Detected from the tile multiset rather than the grouping, because the same
 * fourteen tiles admit many groupings and the yaku belongs to all of them.
 * A kan makes fifteen tiles, so kan hands fall out on the length check.
 */
export function detectChuuren(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }
  if (handInterpretation.groups.some((group) => group.open)) {
    return handInterpretation;
  }

  const tiles = [
    ...handInterpretation.pair.tiles,
    ...handInterpretation.groups.flatMap((group) => group.tiles),
  ];
  if (tiles.length !== 14 || tiles.some((tile) => isHonorTile(tile))) {
    return handInterpretation;
  }
  if (new Set(tiles.map((tile) => tile[1])).size !== 1) {
    return handInterpretation;
  }

  const counts = new Array(9).fill(0);
  for (const tile of tiles) counts[(tile[0] === "0" ? 5 : Number(tile[0])) - 1] += 1;

  let surplus = 0;
  for (let rank = 0; rank < 9; rank++) {
    const extra = counts[rank] - BASE[rank];
    if (extra < 0) return handInterpretation;
    surplus += extra;
  }
  if (surplus !== 1) return handInterpretation;

  handInterpretation.yaku.push(
    createChuurenListing(
      isJunseiChuuren(tiles, handInterpretation.winningTile.tile) &&
        handInterpretation.gameState.ruleset?.doubleYakuman.junseiChuuren,
    ),
  );
  return handInterpretation;
}
