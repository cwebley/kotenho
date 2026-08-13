import { HandInterpretation } from "../models/hand-interpretation.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";
import { isHonorTile } from "../utils/is-honor-tile.js";
import { isTerminalTile } from "../utils/is-terminal-tile.js";

const isYaochu = (tile: MahjongTile): boolean =>
  isHonorTile(tile) || isTerminalTile(tile);

export function createChantaListing(closed: boolean): YakuListing {
  return { name: "chanta", han: closed ? 2 : 1 };
}

export function createJunchanListing(closed: boolean): YakuListing {
  return { name: "junchan", han: closed ? 3 : 2 };
}

export function createHonroutouListing(): YakuListing {
  return { name: "honroutou", han: 2 };
}

function isMenzen(handInterpretation: HandInterpretation): boolean {
  return (
    handInterpretation.isStandardHand !== true ||
    handInterpretation.groups.every((group) => !group.open)
  );
}

/**
 * A three-way split over the same condition — every set contains a terminal or
 * honor — resolved by what the hand contains overall:
 *
 *   all tiles terminal/honor  -> honroutou   (no runs are possible)
 *   no honors at all          -> junchan
 *   otherwise                 -> chanta
 *
 * They are alternatives, not a stack: a hand of nothing but terminals and
 * honors scores honroutou rather than chanta.
 *
 * Chiitoitsu can only ever reach honroutou. Each of its "sets" is a pair, so a
 * set containing a terminal or honor means the tile *is* one — and if that
 * holds for all seven pairs, every tile is a yaochu.
 */
export function detectChanta(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    if (handInterpretation.tiles.every(isYaochu)) {
      handInterpretation.yaku.push(createHonroutouListing());
    }
    return handInterpretation;
  }

  const sets = [
    handInterpretation.pair.tiles,
    ...handInterpretation.groups.map((group) => group.tiles),
  ];
  if (!sets.every((tiles) => tiles.some(isYaochu))) {
    return handInterpretation;
  }

  const allTiles = sets.flat();
  if (allTiles.every(isYaochu)) {
    handInterpretation.yaku.push(createHonroutouListing());
    return handInterpretation;
  }

  const closed = isMenzen(handInterpretation);
  handInterpretation.yaku.push(
    allTiles.some(isHonorTile)
      ? createChantaListing(closed)
      : createJunchanListing(closed),
  );

  return handInterpretation;
}
