import { TotalFuValue } from "../parsing/parse-fu.js";

/**
 * Takes in an exact mini point amount and returns the rounded value used for score calculation
 */
export function roundFu(miniPoints: number): TotalFuValue {
  return (Math.ceil(miniPoints / 10) * 10) as TotalFuValue;
}
