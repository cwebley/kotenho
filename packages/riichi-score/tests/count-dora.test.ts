import { describe, expect, it } from "vitest";
import { countDora } from "../src/utils/count-dora";
import { MahjongTile } from "../src/models/mahjong-tile";

describe("countDora", () => {
  it("returns 1 when it finds a single dora", () => {
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
    const doraIndicator = "4m" as MahjongTile;
    const doraCount = countDora(doraIndicator, tiles);
    expect(doraCount).toBe(1);
  });

  it("returns 0 when it doesn't find a dora", () => {
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
    const doraIndicator = "3m" as MahjongTile;
    const doraCount = countDora(doraIndicator, tiles);
    expect(doraCount).toBe(0);
  });

  it("returns 3 when it finds 3 chun dora", () => {
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
    const doraIndicator = "6z" as MahjongTile;
    const doraCount = countDora(doraIndicator, tiles);
    expect(doraCount).toBe(3);
  });
});
