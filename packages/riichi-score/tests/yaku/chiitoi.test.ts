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
  it("accepts Kansai pair partitions only when enabled", () => {
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
    expect(detectChiitoi(testHand)).toBe(false);
    expect(detectChiitoi(testHand, true)).toBe(true);
  });

  it("accepts every legal multi-quad Kansai partition", () => {
    const partitions: MahjongTile[][] = [
      ["1m", "1m", "1m", "1m", "2p", "2p", "2p", "2p", "3s", "3s", "4z", "4z", "5z", "5z"],
      ["1m", "1m", "1m", "1m", "2p", "2p", "2p", "2p", "3s", "3s", "3s", "3s", "4z", "4z"],
    ];
    for (const hand of partitions) {
      expect(detectChiitoi(hand)).toBe(false);
      expect(detectChiitoi(hand, true)).toBe(true);
    }
  });
});
