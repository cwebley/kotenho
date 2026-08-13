import { HandInterpretation } from "../models/hand-interpretation.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { YakuListing } from "../models/yaku.js";
import { runStart } from "../utils/run-start.js";

const SUITS = ["m", "p", "s"] as const;

export function createIttsuuListing(closed: boolean): YakuListing {
  return { name: "ittsuu", han: closed ? 2 : 1 };
}

/**
 * Runs at 1, 4 and 7 within a single suit — the full 1-9 straight.
 *
 * Detected per interpretation, which matters: 1-9 of one suit can also be read
 * as 234/567/89x and similar, so whether a hand "has" ittsuu depends on the
 * grouping. Kotenho then picks whichever reading scores highest.
 */
export function detectIttsuu(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }

  const starts = new Set(
    handInterpretation.groups
      .filter((group) => group.type === "run")
      .map(runStart),
  );
  const closed = handInterpretation.groups.every((group) => !group.open);

  for (const suit of SUITS) {
    const straight = [1, 4, 7].every((rank) =>
      starts.has(`${rank}${suit}` as MahjongTile),
    );
    if (straight) {
      handInterpretation.yaku.push(createIttsuuListing(closed));
      return handInterpretation;
    }
  }

  return handInterpretation;
}
