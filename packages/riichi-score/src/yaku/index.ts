import { HandInterpretation } from "../models/hand-interpretation.js";
import { detectPinfu } from "./pinfu.js";
import { detectTanyao } from "./tanyao.js";
import { detectMenzenTsumo } from "./tsumo.js";
import { detectYakuhai } from "./yakuhai.js";

/**
 * Takes a HandInterpretation and returns the HandInterpretation with all the standard hand yaku it finds
 */
export function detectStandardYaku(
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (handInterpretation.isStandardHand !== true) {
    return handInterpretation;
  }

  detectYakuhai(handInterpretation);
  detectMenzenTsumo(handInterpretation);
  detectPinfu(handInterpretation);
  detectTanyao(handInterpretation);

  return handInterpretation;
}
