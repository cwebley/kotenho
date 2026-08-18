import { HandInterpretation } from "./hand-interpretation.js";
import { MahjongTile } from "./mahjong-tile.js";

export interface FinalWait {
  /** Distinct normalized tile types that complete the pre-win hand. */
  tiles: MahjongTile[];
  /** Number of distinct winning tile types. */
  sideCount: number;
}

export interface HandAnalysis {
  valid: boolean;
  errors: string[];
  handInterpretations: HandInterpretation[];
  finalWait: FinalWait;
}

export function createHandAnalysis(): HandAnalysis {
  return {
    valid: true,
    errors: [],
    handInterpretations: [],
    finalWait: {
      tiles: [],
      sideCount: 0,
    },
  };
}
