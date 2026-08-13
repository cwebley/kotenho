import { HandInterpretation } from "../models/hand-interpretation.js";
import { YakuListing } from "../models/yaku.js";

function isMenzen(handInterpretation: HandInterpretation): boolean {
  return (
    !handInterpretation.isStandardHand ||
    handInterpretation.groups.every((group) => !group.open)
  );
}

function addYaku(
  handInterpretation: HandInterpretation,
  name: YakuListing["name"],
  han: number,
): void {
  handInterpretation.yaku.push({ name, han });
}

/** Adds yaku that are declared by game state rather than hand shape. */
export function detectDeclaredYaku(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  const { gameState, winningTile } = handInterpretation;
  const menzen = isMenzen(handInterpretation);
  const riichi = gameState.isRiichi || gameState.isDoubleRiichi;

  if (menzen && gameState.isDoubleRiichi) {
    addYaku(handInterpretation, "double-riichi", 2);
  } else if (menzen && gameState.isRiichi) {
    addYaku(handInterpretation, "riichi", 1);
  }
  if (menzen && riichi && gameState.isIppatsu) {
    addYaku(handInterpretation, "ippatsu", 1);
  }
  if (winningTile.isTsumo && gameState.isHaitei) {
    addYaku(handInterpretation, "haitei", 1);
  }
  if (!winningTile.isTsumo && gameState.isHoutei) {
    addYaku(handInterpretation, "houtei", 1);
  }
  if (winningTile.isTsumo && gameState.isRinshan) {
    addYaku(handInterpretation, "rinshan-kaihou", 1);
  }
  if (!winningTile.isTsumo && gameState.isChankan) {
    addYaku(handInterpretation, "chankan", 1);
  }

  return handInterpretation;
}
