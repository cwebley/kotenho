import { HandInterpretation } from "./hand-interpretation.js";

export interface HandAnalysis {
  valid: boolean;
  errors: string[];
  handInterpretations: HandInterpretation[];
}

export function createHandAnalysis(): HandAnalysis {
  return {
    valid: true,
    errors: [],
    handInterpretations: [],
  };
}
