import { HandInterpretation } from "../models/hand-interpretation.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";
import { runStart } from "../utils/run-start.js";

const SUITS = ["m", "p", "s"] as const;

export function createSanshokuListing(closed: boolean): YakuListing {
  return { name: "sanshoku", han: closed ? 2 : 1 };
}

export function createSanshokuDoukouListing(): YakuListing {
  return { name: "sanshoku-doukou", han: 2 };
}

function isMenzen(handInterpretation: HandInterpretation): boolean {
  return (
    handInterpretation.isStandardHand !== true ||
    handInterpretation.groups.every((group) => !group.open)
  );
}

/**
 * Sanshoku doujun is the same run in all three suits; sanshoku doukou is the
 * same triplet in all three suits. They are independent yaku rather than
 * variants of each other, and cannot co-occur — three runs plus three triplets
 * needs six groups and a hand has four.
 */
export function detectSanshoku(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }

  const runs = handInterpretation.groups.filter(
    (group) => group.type === "run",
  );
  // A kan of the same rank counts toward sanshoku doukou.
  const triplets = handInterpretation.groups.filter(
    (group) => group.type !== "run",
  );
  const closed = isMenzen(handInterpretation);

  const runStarts = new Set(runs.map(runStart));
  for (let rank = 1; rank <= 7; rank++) {
    if (SUITS.every((suit) => runStarts.has(`${rank}${suit}` as MahjongTile))) {
      handInterpretation.yaku.push(createSanshokuListing(closed));
      return handInterpretation;
    }
  }

  const tripletTiles = new Set(triplets.map((group) => group.tiles[0]));
  for (let rank = 1; rank <= 9; rank++) {
    if (
      SUITS.every((suit) => tripletTiles.has(`${rank}${suit}` as MahjongTile))
    ) {
      handInterpretation.yaku.push(createSanshokuDoukouListing());
      return handInterpretation;
    }
  }

  return handInterpretation;
}
