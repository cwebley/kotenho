import { describe, expect, it } from "vitest";
import { countRedFives } from "../src/utils/count-red-fives";
import { MahjongTile } from "../src/models/mahjong-tile";

describe("countRedFives", () => {
  it("returns 1 when it finds a single red five", () => {
    const tiles = [
      "1m",
      "2m",
      "3m",
      "0m",
      "6m",
      "7m",
      "1z",
      "1z",
      "1z",
      "2z",
      "2z",
      "7z",
      "7z",
      "7z",
    ] as MahjongTile[];
    const doraCount = countRedFives(tiles);
    expect(doraCount).toBe(1);
  });

  it("returns 0 when there aren't any red fives", () => {
    const tiles = [
      "1m",
      "2m",
      "3m",
      "5m",
      "6m",
      "7m",
      "1z",
      "1z",
      "1z",
      "2z",
      "2z",
      "7z",
      "7z",
      "7z",
    ] as MahjongTile[];
    const doraCount = countRedFives(tiles);
    expect(doraCount).toBe(0);
  });

  it("returns 3 when it finds 3 red fives", () => {
    const tiles = [
      "1m",
      "2m",
      "3m",
      "0m",
      "6m",
      "7m",
      "4p",
      "0p",
      "5p",
      "3s",
      "4s",
      "0s",
      "7z",
      "7z",
    ] as MahjongTile[];
    const doraCount = countRedFives(tiles);
    expect(doraCount).toBe(3);
  });
});
