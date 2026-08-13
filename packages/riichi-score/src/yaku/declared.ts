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

  // Winning on the very first draw: tenhou for the dealer, chiihou for anyone
  // else. Both are yakuman and both require a concealed self-draw.
  if (menzen && winningTile.isTsumo) {
    const dealer = gameState.seatWind === "east";
    if (dealer && gameState.isTenhou) {
      handInterpretation.yaku.push({
        name: "tenhou",
        han: 0,
        limit: "yakuman",
      });
    } else if (!dealer && gameState.isChiihou) {
      handInterpretation.yaku.push({
        name: "chiihou",
        han: 0,
        limit: "yakuman",
      });
    }
  }

  return handInterpretation;
}
