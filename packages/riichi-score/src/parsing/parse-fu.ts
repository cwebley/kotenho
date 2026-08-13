import { HandInterpretation } from "../models/hand-interpretation.js";
import { translateWindToTile } from "../utils/translate-wind-to-tile.js";
import { isSimpleTile } from "../utils/is-simple-tile.js";
import { isTerminalTile } from "../utils/is-terminal-tile.js";
import { MahjongTile } from "../models/mahjong-tile.js";
import { isDragonTile } from "../utils/is-dragon-tile.js";
import { isHonorTile } from "../utils/is-honor-tile.js";

export type FuReason =
  | "base"
  | "chiitoitsu"
  | "open triplet of simples"
  | "closed triplet of simples"
  | "open triplet of terminals/honors"
  | "closed triplet of terminals/honors"
  | "open kan of simples"
  | "closed kan of simples"
  | "open kan of terminals/honors"
  | "closed kan of terminals/honors"
  | "yakuhai pair"
  | "double wind pair"
  | "kanchan wait"
  | "penchan wait"
  | "tanki wait"
  | "closed ron"
  | "tsumo";

export type TotalFuValue =
  | 0 // 0 is only for when the fu hasn't been calcualted yet
  | 20
  | 30
  | 40
  | 50
  | 60
  | 70
  | 80
  | 90
  | 100
  | 110;

export interface FuListing {
  value: number;
  reason: FuReason;
}

function findKokushiPairTile(tiles: MahjongTile[]) {
  const seen = new Set();
  for (const tile of tiles) {
    if (seen.has(tile)) {
      return tile;
    } else {
      seen.add(tile);
    }
  }
  return null;
}

/**
 * Takes a HandInterpretation and updates with all the fu/minipoints as well as their reasons
 */
export function parseFu(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  const validatedYakuNames = handInterpretation.yaku.map((y) => y.name);
  if (validatedYakuNames.indexOf("chiitoitsu") !== -1) {
    // chiitoi is always 25 fu
    handInterpretation.fuList.push({
      reason: "chiitoitsu",
      value: 25,
    });
    return handInterpretation;
  }

  handInterpretation.fuList.push({
    reason: "base",
    value: 20,
  });

  // handle the pair
  const roundWindTile = translateWindToTile(
    handInterpretation.gameState.roundWind,
  );
  const seatWindTile = translateWindToTile(
    handInterpretation.gameState.seatWind,
  );

  if (!handInterpretation.isStandardHand) {
    if (validatedYakuNames.indexOf("kokushi-musou") !== -1) {
      // handle kokushi pair
      const pairTile = findKokushiPairTile(handInterpretation.tiles);
      if (!pairTile) {
        console.error(
          `invalid kokushi hand found. tiles: ${handInterpretation.tiles}`,
        );
        return handInterpretation;
      }

      if (roundWindTile === seatWindTile && roundWindTile === pairTile) {
        handInterpretation.fuList.push({
          reason: "double wind pair",
          value: 4,
        });
      } else if (
        pairTile === roundWindTile ||
        pairTile === seatWindTile ||
        isDragonTile(pairTile)
      ) {
        handInterpretation.fuList.push({
          reason: "yakuhai pair",
          value: 2,
        });
      }
    }
  } else {
    // handle standard pairs
    if (
      roundWindTile === seatWindTile &&
      roundWindTile === handInterpretation.pair.tiles[0]
    ) {
      handInterpretation.fuList.push({
        reason: "double wind pair",
        value: 4,
      });
    } else if (
      handInterpretation.pair.tiles[0] === roundWindTile ||
      handInterpretation.pair.tiles[0] === seatWindTile ||
      isDragonTile(handInterpretation.pair.tiles[0])
    ) {
      handInterpretation.fuList.push({
        reason: "yakuhai pair",
        value: 2,
      });
    }
  }

  // handle the wait
  if (
    handInterpretation.waitType === "tanki" ||
    handInterpretation.waitType === "kokushi-wide" ||
    handInterpretation.waitType === "kokushi-single"
  ) {
    handInterpretation.fuList.push({ reason: "tanki wait", value: 2 });
  }
  if (handInterpretation.waitType === "kanchan") {
    handInterpretation.fuList.push({ reason: "kanchan wait", value: 2 });
  }
  if (handInterpretation.waitType === "penchan") {
    handInterpretation.fuList.push({ reason: "penchan wait", value: 2 });
  }

  if (handInterpretation.isStandardHand !== true) {
    // nothing else to do for kokushi hands
    return handInterpretation;
  }
  const groups = handInterpretation.groups || [];

  groups.forEach((group) => {
    // we only care about sets and kans
    if (group.type === "run") {
      return;
    }
    // handle sets first. everything else is a kan
    if (group.type === "set") {
      if (isSimpleTile(group.tiles[0])) {
        if (group.open) {
          handInterpretation.fuList.push({
            reason: "open triplet of simples",
            value: 2,
          });
          return;
        }
        handInterpretation.fuList.push({
          reason: "closed triplet of simples",
          value: 4,
        });
      }
      if (isTerminalTile(group.tiles[0]) || isHonorTile(group.tiles[0])) {
        if (group.open) {
          handInterpretation.fuList.push({
            reason: "open triplet of terminals/honors",
            value: 4,
          });
          return;
        }
        handInterpretation.fuList.push({
          reason: "closed triplet of terminals/honors",
          value: 8,
        });
      }
      // this group was a set. move on to the next and skip the kan section
      return;
    }
    // handle kans
    if (isSimpleTile(group.tiles[0])) {
      if (group.open) {
        handInterpretation.fuList.push({
          reason: "open kan of simples",
          value: 8,
        });
        return;
      }
      handInterpretation.fuList.push({
        reason: "closed kan of simples",
        value: 16,
      });
    }
    if (isTerminalTile(group.tiles[0]) || isHonorTile(group.tiles[0])) {
      if (group.open) {
        handInterpretation.fuList.push({
          reason: "open kan of terminals/honors",
          value: 16,
        });
        return;
      }
      handInterpretation.fuList.push({
        reason: "closed kan of terminals/honors",
        value: 32,
      });
    }
  });

  // handle ron
  if (
    !handInterpretation.winningTile.isTsumo &&
    handInterpretation.groups.filter((g) => g.open).length === 0
  ) {
    handInterpretation.fuList.push({ reason: "closed ron", value: 10 });
  }

  // handle tsumo for non-pinfu hands
  if (
    handInterpretation.winningTile.isTsumo &&
    handInterpretation.yaku.map((y) => y.name).indexOf("pinfu") === -1
  ) {
    handInterpretation.fuList.push({ reason: "tsumo", value: 2 });
  }

  return handInterpretation;
}
