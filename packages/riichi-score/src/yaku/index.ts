import { HandInterpretation } from "../models/hand-interpretation.js";
import { detectChanta } from "./chanta.js";
import { detectHonitsu } from "./honitsu.js";
import { detectIipeiko } from "./iipeiko.js";
import { detectPinfu } from "./pinfu.js";
import { detectSanankou } from "./sanankou.js";
import { detectToitoi } from "./toitoi.js";
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
      detectHonitsu(handInterpretation);
      detectChanta(handInterpretation);
    }
    return handInterpretation;
  }

  detectYakuhai(handInterpretation);
  detectMenzenTsumo(handInterpretation);
  detectPinfu(handInterpretation);
  detectTanyao(handInterpretation);
  detectIipeiko(handInterpretation);
  detectSanankou(handInterpretation);
  detectToitoi(handInterpretation);
  detectHonitsu(handInterpretation);
  detectChanta(handInterpretation);

  // A yakuman suppresses ordinary yaku rather than stacking with them.
  if (handInterpretation.yaku.some((yaku) => yaku.limit)) {
    handInterpretation.yaku = handInterpretation.yaku.filter(
      (yaku) => yaku.limit,
    );
  }

  return handInterpretation;
}
