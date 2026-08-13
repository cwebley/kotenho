import { TotalFuValue } from "../parsing/parse-fu.js";

/**
 * Takes a han count and a fu count and returns the basic points used in scoring payments
 */
export function calculateBasicPoints(han: number, fu: TotalFuValue): number {
  if (han >= 13) {
    // yakuman
    return 8000;
  }
  if (han >= 11) {
    // sanbaiman
    return 6000;
  }
  if (han >= 8) {
    // baiman
    return 4000;
  }
  if (han >= 6) {
    // haneman
    return 3000;
  }
  if (han >= 5) {
    // mangan
    return 2000;
  }

  // https://en.wikipedia.org/wiki/Japanese_mahjong_scoring_rules
  const calculatedBasicPoints = fu * 2 ** (2 + han);

  // for things like 3han 70fu, 4han 40fu, etc--they exceed the Mangan limit and just need to return 2000
  return Math.min(calculatedBasicPoints, 2000);
}
