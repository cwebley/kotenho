import { Meld } from "../models/hand-input.js";
import { HandInterpretation } from "../models/hand-interpretation.js";
import { createStandardGroup } from "../models/standard-group.js";

/**
 * Helper function for adding openMelds to an otherwise parsed array of groups
 */
export function appendMeldsToGroups(
  melds: Meld[] | undefined,
  handInterpretation: HandInterpretation,
): HandInterpretation {
  if (!melds || !handInterpretation.isStandardHand) {
    return handInterpretation;
  }
  melds.forEach((meld) => {
    if (!handInterpretation.groups) {
      handInterpretation.groups = [];
    }
    handInterpretation.groups.push(
      createStandardGroup(
        // Concealed kans do not break menzen and use concealed-kan fu, and
        // they carry neither a source seat nor a called tile.
        meld.type === "ankan"
          ? { tiles: [...meld.tiles], type: meld.type, open: false }
          : {
              tiles: [...meld.tiles],
              type: meld.type,
              open: true,
              from: meld.from,
              calledIndex: meld.calledIndex,
            },
      ),
    );
  });
  return handInterpretation;
}
