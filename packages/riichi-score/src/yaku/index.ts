import { HandInterpretation } from "../models/hand-interpretation.js";
import { detectIipeiko } from "./iipeiko.js";
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
    // Chiitoitsu is not a standard shape but still qualifies for the
    // shape-agnostic yaku — a chiitoi of all simples is also tanyao. Kokushi
    // is deliberately excluded: it is a yakuman and does not stack with
    // ordinary yaku. Honitsu/chinitsu belong here too once implemented.
    if (handInterpretation.yaku.some((y) => y.name === "chiitoitsu")) {
      detectMenzenTsumo(handInterpretation);
      detectTanyao(handInterpretation);
    }
    return handInterpretation;
  }

  detectYakuhai(handInterpretation);
  detectMenzenTsumo(handInterpretation);
  detectPinfu(handInterpretation);
  detectTanyao(handInterpretation);
  detectIipeiko(handInterpretation);

  return handInterpretation;
}
