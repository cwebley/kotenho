import { MahjongTile } from "../src/models/mahjong-tile";
import { removeTiles } from "../src/utils/remove-tiles";
import { describe, it, expect } from "vitest";

describe("removeTiles", () => {
  it("removes a set from a hand", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "2m",
      "3m",
      "6p",
      "6p",
      "6p",
      "7z",
      "7z",
    ];
    const tilesToRemove: MahjongTile[] = ["6p", "6p", "6p"];
    const updatedHand = removeTiles(parentHand, tilesToRemove);
    const expectedHand: MahjongTile[] = ["1m", "2m", "3m", "7z", "7z"];
    expect(updatedHand).toBeTruthy();
    if (updatedHand) {
      updatedHand.forEach((t, i) => {
        expect(t).toBe(expectedHand[i]);
      });
    }
  });
  it("removes a sequence from a hand", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "2m",
      "3m",
      "6p",
      "6p",
      "6p",
      "7z",
      "7z",
    ];
    const tilesToRemove: MahjongTile[] = ["1m", "2m", "3m"];
    const updatedHand = removeTiles(parentHand, tilesToRemove);
    const expectedHand: MahjongTile[] = ["6p", "6p", "6p", "7z", "7z"];
    expect(updatedHand).toBeTruthy();
    if (updatedHand) {
      updatedHand.forEach((t, i) => {
        expect(t).toBe(expectedHand[i]);
      });
    }
  });
  it("returns null when it can't remove all the specified tiles", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "2m",
      "3m",
      "6p",
      "6p",
      "6p",
      "7z",
      "7z",
    ];
    const tilesToRemove: MahjongTile[] = ["1m", "2m", "1z"];
    const updatedHand = removeTiles(parentHand, tilesToRemove);
    expect(updatedHand).toBeNull();
  });
});
