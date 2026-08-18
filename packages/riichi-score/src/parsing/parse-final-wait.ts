import { Meld } from "../models/hand-input.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { Ruleset } from "../models/ruleset.js";
import { detectChiitoi } from "../yaku/chiitoi.js";
import { detectKokushiWait } from "../yaku/kokushi.js";
import { parseStandardHandCombinations } from "./standard-hand-combinations.js";
import { replaceAkadora } from "../utils/replace-akadora.js";
import { tileCompare } from "../utils/tile-compare.js";

const FINAL_WAIT_CANDIDATES: MahjongTile[] = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "1p",
  "2p",
  "3p",
  "4p",
  "5p",
  "6p",
  "7p",
  "8p",
  "9p",
  "1s",
  "2s",
  "3s",
  "4s",
  "5s",
  "6s",
  "7s",
  "8s",
  "9s",
  "1z",
  "2z",
  "3z",
  "4z",
  "5z",
  "6z",
  "7z",
];

function hasFourCopies(
  tileCounts: Map<MahjongTile, number>,
  tile: MahjongTile,
): boolean {
  return (tileCounts.get(tile) ?? 0) >= 4;
}

function completesHand(
  closedTiles: MahjongTile[],
  openMelds: Meld[],
  candidate: MahjongTile,
  ruleset: Ruleset,
): boolean {
  const completedClosedTiles = [...closedTiles, candidate].sort(tileCompare);

  if (parseStandardHandCombinations(completedClosedTiles).length > 0) {
    return true;
  }

  if (openMelds.length > 0) {
    return false;
  }

  if (detectChiitoi(completedClosedTiles, ruleset.kansaiChiitoitsu)) {
    return true;
  }

  return Boolean(
    detectKokushiWait(completedClosedTiles, {
      tile: candidate,
      isTsumo: true,
    }),
  );
}

/**
 * Finds the distinct tile types that complete the pre-win hand. This is a
 * structural check and intentionally does not require the completion to have
 * a yaku.
 */
export function parseFinalWait(
  closedTiles: MahjongTile[],
  openMelds: Meld[],
  ruleset: Ruleset,
): MahjongTile[] {
  const normalizedClosedTiles = replaceAkadora(closedTiles);
  const normalizedMeldTiles = replaceAkadora(
    openMelds.flatMap((meld) => meld.tiles),
  );
  const tileCounts = new Map<MahjongTile, number>();

  for (const tile of [...normalizedClosedTiles, ...normalizedMeldTiles]) {
    tileCounts.set(tile, (tileCounts.get(tile) ?? 0) + 1);
  }

  return FINAL_WAIT_CANDIDATES.filter(
    (candidate) =>
      !hasFourCopies(tileCounts, candidate) &&
      completesHand(normalizedClosedTiles, openMelds, candidate, ruleset),
  );
}
