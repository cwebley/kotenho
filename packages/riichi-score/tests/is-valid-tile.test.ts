import { isValidTile } from "../src/utils/is-valid-tile";
import { MahjongTile } from "../src/models/mahjong-tile";
import { describe, it, expect } from "vitest";

describe("isValidTile", () => {
  it("returns true for valid tiles", () => {
    expect(isValidTile("3m")).toBe(true);
    expect(isValidTile("8s")).toBe(true);
    expect(isValidTile("5p")).toBe(true);
    expect(isValidTile("2z")).toBe(true);
  });
  it("handles red fives", () => {
    expect(isValidTile("0m")).toBe(true);
    expect(isValidTile("0s")).toBe(true);
    expect(isValidTile("0p")).toBe(true);
  });
  it("returns false for invalid suits", () => {
    expect(isValidTile("1g" as MahjongTile)).toBe(false);
  });
  it("returns false for invalid ranks", () => {
    expect(isValidTile("-1m" as MahjongTile)).toBe(false);
    expect(isValidTile("10m" as MahjongTile)).toBe(false);
    expect(isValidTile("8z" as MahjongTile)).toBe(false);
  });
});
