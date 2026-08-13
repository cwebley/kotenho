import { MahjongTile } from "../../src/models/mahjong-tile.ts";
import { detectChiitoi } from "../../src/yaku/chiitoi.ts";
import { describe, it, expect } from "vitest";

describe("detectChiitoi", () => {
  it("returns true when the hand can be interpretted as chiitoitsu", () => {
    const testHand: MahjongTile[] = [
      "1m",
      "1m",
      "2m",
      "2m",
      "2p",
      "2p",
      "5p",
      "5p",
      "9s",
      "9s",
      "1z",
      "1z",
      "3z",
      "3z",
    ];
    const isChiitoi = detectChiitoi(testHand);
    expect(isChiitoi).toBe(true);
  });
  it("returns false when there aren't 14 tiles", () => {
    const testHand: MahjongTile[] = [
      "1m",
      "1m",
      "2m",
      "2m",
      "2p",
      "2p",
      "5p",
      "5p",
      "9s",
      "9s",
      "1z",
    ];
    const isChiitoi = detectChiitoi(testHand);
    expect(isChiitoi).toBe(false);
  });
  it("returns false when there aren't 7 pairs", () => {
    const testHand: MahjongTile[] = [
      "1m",
      "1m",
      "2m",
      "2m",
      "2p",
      "3p",
      "5p",
      "5p",
      "9s",
      "9s",
      "1z",
      "1z",
      "3z",
      "3z",
    ];
    const isChiitoi = detectChiitoi(testHand);
    expect(isChiitoi).toBe(false);
  });
  it("returns false for a kansai chiitoi hand that we're not yet handling", () => {
    const testHand: MahjongTile[] = [
      "1m",
      "1m",
      "2m",
      "2m",
      "2m",
      "2m",
      "5p",
      "5p",
      "9s",
      "9s",
      "1z",
      "1z",
      "3z",
      "3z",
    ];
    const isChiitoi = detectChiitoi(testHand);
    expect(isChiitoi).toBe(false);
  });
});
